// src/hooks/useRealtimeList.ts
import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import { RealtimeChannel } from "@supabase/supabase-js";

interface UseRealtimeListOptions {
  listId: string;
  onItemAdded?: (item: any) => void;
  onItemUpdated?: (item: any) => void;
  onItemDeleted?: (itemId: string) => void;
  onCollaboratorAdded?: (collaborator: any) => void;
  onCollaboratorRemoved?: (userId: string) => void;
  onListUpdated?: (list: any) => void;
}

/**
 * Hook to subscribe to real-time changes for a list
 * Listens to list_items and list_collaborators changes
 */
export function useRealtimeList({
  listId,
  onItemAdded,
  onItemUpdated,
  onItemDeleted,
  onCollaboratorAdded,
  onCollaboratorRemoved,
  onListUpdated,
}: UseRealtimeListOptions) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!listId) return;

    let channel: RealtimeChannel;

    const setupSubscription = async () => {
      // Create a channel for this list
      channel = supabase.channel(`list:${listId}`);

      // Subscribe to list_items changes
      channel
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "list_items",
            filter: `list_id=eq.${listId}`,
          },
          (payload) => {
            console.log("🔵 Item added:", payload.new);
            onItemAdded?.(payload.new);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "list_items",
            filter: `list_id=eq.${listId}`,
          },
          (payload) => {
            console.log("🟡 Item updated:", payload.new);
            onItemUpdated?.(payload.new);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "list_items",
            filter: `list_id=eq.${listId}`,
          },
          (payload) => {
            console.log("🔴 Item deleted:", payload.old.id);
            onItemDeleted?.(payload.old.id);
          }
        );

      // Subscribe to list_collaborators changes
      channel
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "list_collaborators",
            filter: `list_id=eq.${listId}`,
          },
          (payload) => {
            console.log("👥 Collaborator added:", payload.new);
            onCollaboratorAdded?.(payload.new);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "list_collaborators",
            filter: `list_id=eq.${listId}`,
          },
          (payload) => {
            console.log("👥 Collaborator removed:", payload.old.user_id);
            onCollaboratorRemoved?.(payload.old.user_id);
          }
        );

      // Subscribe to list metadata changes
      channel.on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "lists",
          filter: `id=eq.${listId}`,
        },
        (payload) => {
          console.log("📝 List updated:", payload.new);
          onListUpdated?.(payload.new);
        }
      );

      // Subscribe to the channel
      channel.subscribe((status) => {
        console.log(`📡 Realtime status for list ${listId}:`, status);
        setIsConnected(status === "SUBSCRIBED");
      });
    };

    setupSubscription();

    // Cleanup on unmount
    return () => {
      if (channel) {
        console.log(`🔌 Unsubscribing from list ${listId}`);
        supabase.removeChannel(channel);
        setIsConnected(false);
      }
    };
  }, [
    listId,
    onItemAdded,
    onItemUpdated,
    onItemDeleted,
    onCollaboratorAdded,
    onCollaboratorRemoved,
    onListUpdated,
  ]);

  return { isConnected };
}

/**
 * Hook for presence - shows who's currently viewing a list
 */
export function useListPresence(listId: string) {
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [myPresenceId, setMyPresenceId] = useState<string | null>(null);

  useEffect(() => {
    if (!listId) return;

    let channel: RealtimeChannel;

    const setupPresence = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase.channel(`presence:list:${listId}`, {
        config: {
          presence: {
            key: user.id,
          },
        },
      });

      // Track presence state
      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState();
          const users = Object.values(state).flat();
          setActiveUsers(users);
        })
        .on("presence", { event: "join" }, ({ newPresences }) => {
          console.log("👋 User joined:", newPresences);
        })
        .on("presence", { event: "leave" }, ({ leftPresences }) => {
          console.log("👋 User left:", leftPresences);
        });

      // Subscribe and track our presence
      await channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const presenceTrackStatus = await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
          console.log("✅ Presence tracked:", presenceTrackStatus);
          setMyPresenceId(user.id);
        }
      });
    };

    setupPresence();

    return () => {
      if (channel) {
        channel.untrack();
        supabase.removeChannel(channel);
        setActiveUsers([]);
        setMyPresenceId(null);
      }
    };
  }, [listId]);

  return { activeUsers, myPresenceId };
}
