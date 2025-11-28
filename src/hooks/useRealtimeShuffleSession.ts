// src/hooks/useRealtimeShuffleSession.ts
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "../utils/supabaseClient";
import { RealtimeChannel } from "@supabase/supabase-js";
import {
  ShuffleSession,
  SessionParticipant,
  getSessionParticipants,
} from "../utils/shuffleSessionApi";

interface UseRealtimeShuffleSessionOptions {
  sessionId: string | null;
  onSessionUpdated?: (session: ShuffleSession) => void;
  onParticipantJoined?: (participant: SessionParticipant) => void;
  onParticipantLeft?: (userId: string) => void;
  onParticipantReady?: (participant: SessionParticipant) => void;
  onRestaurantEliminated?: (restaurantId: string, userId: string) => void;
  onSessionStarted?: () => void;
  onWinnerDeclared?: (winner: any) => void;
}

export function useRealtimeShuffleSession({
  sessionId,
  onSessionUpdated,
  onParticipantJoined,
  onParticipantLeft,
  onParticipantReady,
  onRestaurantEliminated,
  onSessionStarted,
  onWinnerDeclared,
}: UseRealtimeShuffleSessionOptions) {
  const [session, setSession] = useState<ShuffleSession | null>(null);
  const [participants, setParticipants] = useState<SessionParticipant[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const callbacksRef = useRef({
    onSessionUpdated,
    onParticipantJoined,
    onParticipantLeft,
    onParticipantReady,
    onRestaurantEliminated,
    onSessionStarted,
    onWinnerDeclared,
  });

  useEffect(() => {
    callbacksRef.current = {
      onSessionUpdated,
      onParticipantJoined,
      onParticipantLeft,
      onParticipantReady,
      onRestaurantEliminated,
      onSessionStarted,
      onWinnerDeclared,
    };
  }, [
    onSessionUpdated,
    onParticipantJoined,
    onParticipantLeft,
    onParticipantReady,
    onRestaurantEliminated,
    onSessionStarted,
    onWinnerDeclared,
  ]);

  const loadSession = useCallback(async () => {
    if (!sessionId) return;

    try {
      const { data, error } = await supabase
        .from("shuffle_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (error) {
        console.error("❌ Failed to load session:", error);
        return;
      }

      setSession(data);
    } catch (e) {
      console.error("❌ loadSession exception:", e);
    }
  }, [sessionId]);

  const loadParticipants = useCallback(async () => {
    if (!sessionId) return;

    const parts = await getSessionParticipants(sessionId);
    setParticipants(parts);
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      setSession(null);
      setParticipants([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([loadSession(), loadParticipants()]).finally(() =>
      setLoading(false)
    );
  }, [sessionId, loadSession, loadParticipants]);

  useEffect(() => {
    if (!sessionId) return;

    let sessionChannel: RealtimeChannel;
    let participantsChannel: RealtimeChannel;
    let actionsChannel: RealtimeChannel;

    const setupSubscriptions = async () => {
      // Subscribe to session changes
      sessionChannel = supabase.channel(`session:${sessionId}`);

      sessionChannel
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "shuffle_sessions",
            filter: `id=eq.${sessionId}`,
          },
          (payload) => {
            console.log("📡 Session updated:", payload.new);
            const updatedSession = payload.new as ShuffleSession;
            setSession(updatedSession);
            callbacksRef.current.onSessionUpdated?.(updatedSession);

            // Check for specific updates
            if (
              updatedSession.status === "active" &&
              payload.old.status === "configuring"
            ) {
              callbacksRef.current.onSessionStarted?.();
            }

            if (updatedSession.winner && !payload.old.winner) {
              callbacksRef.current.onWinnerDeclared?.(updatedSession.winner);
            }
          }
        )
        .subscribe((status) => {
          console.log(`📡 Session channel status: ${status}`);
          setIsConnected(status === "SUBSCRIBED");
        });

      // Subscribe to participant changes
      participantsChannel = supabase.channel(`participants:${sessionId}`);

      participantsChannel
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "shuffle_session_participants",
            filter: `session_id=eq.${sessionId}`,
          },
          (payload) => {
            console.log("👥 Participant joined:", payload.new);
            const participant = payload.new as SessionParticipant;
            setParticipants((prev) => [...prev, participant]);
            callbacksRef.current.onParticipantJoined?.(participant);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "shuffle_session_participants",
            filter: `session_id=eq.${sessionId}`,
          },
          (payload) => {
            console.log("👥 Participant updated:", payload.new);
            const participant = payload.new as SessionParticipant;
            setParticipants((prev) =>
              prev.map((p) => (p.id === participant.id ? participant : p))
            );

            if (participant.is_ready !== payload.old.is_ready) {
              callbacksRef.current.onParticipantReady?.(participant);
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "shuffle_session_participants",
            filter: `session_id=eq.${sessionId}`,
          },
          (payload) => {
            console.log("👥 Participant left:", payload.old);
            const oldParticipant = payload.old as SessionParticipant;
            setParticipants((prev) =>
              prev.filter((p) => p.id !== oldParticipant.id)
            );
            callbacksRef.current.onParticipantLeft?.(oldParticipant.user_id);
          }
        )
        .subscribe();

      // Subscribe to session actions (for real-time elimination feedback)
      actionsChannel = supabase.channel(`actions:${sessionId}`);

      actionsChannel
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "shuffle_session_actions",
            filter: `session_id=eq.${sessionId}`,
          },
          (payload) => {
            console.log("⚡ Action:", payload.new);
            const action = payload.new as any;

            if (action.action_type === "eliminate") {
              callbacksRef.current.onRestaurantEliminated?.(
                action.action_data.restaurant_id,
                action.user_id
              );
            }
          }
        )
        .subscribe();
    };

    setupSubscriptions();

    return () => {
      if (sessionChannel) {
        console.log(`🔌 Unsubscribing from session ${sessionId}`);
        supabase.removeChannel(sessionChannel);
      }
      if (participantsChannel) {
        supabase.removeChannel(participantsChannel);
      }
      if (actionsChannel) {
        supabase.removeChannel(actionsChannel);
      }
      setIsConnected(false);
    };
  }, [sessionId]);

  return {
    session,
    participants,
    isConnected,
    loading,
    refreshSession: loadSession,
    refreshParticipants: loadParticipants,
  };
}
