// src/hooks/useRealtimeList.ts
import { useEffect, useState, useRef } from "react";
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
  onNoteChanged?: () => void;
}

export function useRealtimeList({
  listId,
  onItemAdded,
  onItemUpdated,
  onItemDeleted,
  onCollaboratorAdded,
  onCollaboratorRemoved,
  onListUpdated,
  onNoteChanged,
}: UseRealtimeListOptions) {
  const [isConnected, setIsConnected] = useState(false);

  // ✅ Use refs to store latest callbacks without triggering re-subscription
  const callbacksRef = useRef({
    onItemAdded,
    onItemUpdated,
    onItemDeleted,
    onCollaboratorAdded,
    onCollaboratorRemoved,
    onListUpdated,
    onNoteChanged,
  });

  // ✅ Update refs when callbacks change (doesn't trigger useEffect)
  useEffect(() => {
    callbacksRef.current = {
      onItemAdded,
      onItemUpdated,
      onItemDeleted,
      onCollaboratorAdded,
      onCollaboratorRemoved,
      onListUpdated,
      onNoteChanged,
    };
  }, [
    onItemAdded,
    onItemUpdated,
    onItemDeleted,
    onCollaboratorAdded,
    onCollaboratorRemoved,
    onListUpdated,
    onNoteChanged,
  ]);

  // ✅ Only re-subscribe when listId changes
  useEffect(() => {
    if (!listId) return;

    let channel: RealtimeChannel;

    const setupSubscription = async () => {
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
            callbacksRef.current.onItemAdded?.(payload.new);
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
            callbacksRef.current.onItemUpdated?.(payload.new);
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
            callbacksRef.current.onItemDeleted?.(payload.old.id);
          }
        )
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
            callbacksRef.current.onCollaboratorAdded?.(payload.new);
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
            callbacksRef.current.onCollaboratorRemoved?.(payload.old.user_id);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "lists",
            filter: `id=eq.${listId}`,
          },
          (payload) => {
            console.log("📝 List updated:", payload.new);
            callbacksRef.current.onListUpdated?.(payload.new);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "list_item_notes",
          },
          (payload) => {
            console.log("📝 Note changed:", payload);
            callbacksRef.current.onNoteChanged?.();
          }
        )
        .subscribe((status) => {
          console.log(`📡 Realtime status for list ${listId}:`, status);
          setIsConnected(status === "SUBSCRIBED");
        });
    };

    setupSubscription();

    return () => {
      if (channel) {
        console.log(`🔌 Unsubscribing from list ${listId}`);
        supabase.removeChannel(channel);
        setIsConnected(false);
      }
    };
  }, [listId]);

  return { isConnected };
}

export function useListPresence(listId: string) {
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [myPresenceId, setMyPresenceId] = useState<string | null>(null);

  // ✅ Only re-subscribe when listId changes
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
