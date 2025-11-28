// src/utils/shuffleSessionApi.ts
import { supabase } from "./supabaseClient";
import { HomeRestaurant } from "../types/homeRestaurant";
import { LocationData } from "../components/LocationSelector";

export interface ShuffleSession {
  id: string;
  session_code: string;
  host_user_id: string;
  source_type:
    | "favorites"
    | "liked"
    | "lists"
    | "filters"
    | "surprise"
    | "combined"
    | null;
  filter_categories: string[];
  filter_rating: string | null;
  filter_distance: string | null;
  filter_number: string | null;
  filter_location: LocationData | null;
  combined_sources: {
    host?: string;
    guest?: string;
  } | null;
  selected_list_ids: string[];
  status: "waiting" | "configuring" | "active" | "completed";
  restaurants: HomeRestaurant[];
  eliminated_ids: string[];
  winner: HomeRestaurant | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface SessionParticipant {
  id: string;
  session_id: string;
  user_id: string;
  role: "host" | "guest";
  joined_at: string;
  is_ready: boolean;
}

export interface SessionAction {
  id: string;
  session_id: string;
  user_id: string;
  action_type: "eliminate" | "ready" | "update_filters";
  action_data: any;
  created_at: string;
}

/**
 * Create a new shuffle session
 */
export async function createShuffleSession(): Promise<ShuffleSession | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Generate session code
    const { data: codeData, error: codeError } = await supabase.rpc(
      "generate_session_code"
    );

    if (codeError) {
      console.error("❌ Failed to generate session code:", codeError);
      return null;
    }

    const sessionCode = codeData as string;

    // Create session
    const { data, error } = await supabase
      .from("shuffle_sessions")
      .insert({
        session_code: sessionCode,
        host_user_id: user.id,
        status: "waiting",
        filter_categories: [],
        eliminated_ids: [],
        restaurants: [],
        selected_list_ids: [],
      })
      .select()
      .single();

    if (error) {
      console.error("❌ createShuffleSession failed:", error);
      return null;
    }

    // Add host as participant
    await supabase.from("shuffle_session_participants").insert({
      session_id: data.id,
      user_id: user.id,
      role: "host",
    });

    return data;
  } catch (e) {
    console.error("❌ createShuffleSession exception:", e);
    return null;
  }
}

/**
 * Join a shuffle session by code
 */
export async function joinShuffleSession(
  code: string
): Promise<ShuffleSession | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Find session by code
    const { data: session, error: sessionError } = await supabase
      .from("shuffle_sessions")
      .select("*")
      .eq("session_code", code.toUpperCase())
      .eq("status", "waiting")
      .single();

    if (sessionError || !session) {
      console.error("❌ Session not found:", sessionError);
      return null;
    }

    // Check if already a participant
    const { data: existing } = await supabase
      .from("shuffle_session_participants")
      .select("id")
      .eq("session_id", session.id)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      return session;
    }

    // Add as participant
    const { error: joinError } = await supabase
      .from("shuffle_session_participants")
      .insert({
        session_id: session.id,
        user_id: user.id,
        role: "guest",
      });

    if (joinError) {
      console.error("❌ joinShuffleSession failed:", joinError);
      return null;
    }

    return session;
  } catch (e) {
    console.error("❌ joinShuffleSession exception:", e);
    return null;
  }
}

/**
 * Get session participants
 */
export async function getSessionParticipants(
  sessionId: string
): Promise<SessionParticipant[]> {
  try {
    const { data, error } = await supabase
      .from("shuffle_session_participants")
      .select("*")
      .eq("session_id", sessionId)
      .order("joined_at", { ascending: true });

    if (error) {
      console.error("❌ getSessionParticipants failed:", error);
      return [];
    }

    return data || [];
  } catch (e) {
    console.error("❌ getSessionParticipants exception:", e);
    return [];
  }
}

/**
 * Update session filters
 */
export async function updateSessionFilters(
  sessionId: string,
  filters: {
    source_type?: string;
    filter_categories?: string[];
    filter_rating?: string;
    filter_distance?: string;
    filter_number?: string;
    filter_location?: LocationData | null;
    selected_list_ids?: string[];
    combined_sources?: any;
  }
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("shuffle_sessions")
      .update(filters)
      .eq("id", sessionId);

    if (error) {
      console.error("❌ updateSessionFilters failed:", error);
      return false;
    }

    // Record action
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("shuffle_session_actions").insert({
        session_id: sessionId,
        user_id: user.id,
        action_type: "update_filters",
        action_data: filters,
      });
    }

    return true;
  } catch (e) {
    console.error("❌ updateSessionFilters exception:", e);
    return false;
  }
}

/**
 * Set participant ready status
 */
export async function setParticipantReady(
  sessionId: string,
  isReady: boolean
): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from("shuffle_session_participants")
      .update({ is_ready: isReady })
      .eq("session_id", sessionId)
      .eq("user_id", user.id);

    if (error) {
      console.error("❌ setParticipantReady failed:", error);
      return false;
    }

    // Record action
    await supabase.from("shuffle_session_actions").insert({
      session_id: sessionId,
      user_id: user.id,
      action_type: "ready",
      action_data: { is_ready: isReady },
    });

    return true;
  } catch (e) {
    console.error("❌ setParticipantReady exception:", e);
    return false;
  }
}

/**
 * Start shuffle session (load restaurants)
 */
export async function startShuffleSession(
  sessionId: string,
  restaurants: HomeRestaurant[]
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("shuffle_sessions")
      .update({
        status: "active",
        restaurants,
        started_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (error) {
      console.error("❌ startShuffleSession failed:", error);
      return false;
    }

    return true;
  } catch (e) {
    console.error("❌ startShuffleSession exception:", e);
    return false;
  }
}

/**
 * Eliminate a restaurant
 */
export async function eliminateRestaurant(
  sessionId: string,
  restaurantId: string
): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    // Get current session
    const { data: session } = await supabase
      .from("shuffle_sessions")
      .select("eliminated_ids")
      .eq("id", sessionId)
      .single();

    if (!session) return false;

    const newEliminatedIds = [...(session.eliminated_ids || []), restaurantId];

    // Update session
    const { error } = await supabase
      .from("shuffle_sessions")
      .update({ eliminated_ids: newEliminatedIds })
      .eq("id", sessionId);

    if (error) {
      console.error("❌ eliminateRestaurant failed:", error);
      return false;
    }

    // Record action
    await supabase.from("shuffle_session_actions").insert({
      session_id: sessionId,
      user_id: user.id,
      action_type: "eliminate",
      action_data: { restaurant_id: restaurantId },
    });

    return true;
  } catch (e) {
    console.error("❌ eliminateRestaurant exception:", e);
    return false;
  }
}

/**
 * Set session winner
 */
export async function setSessionWinner(
  sessionId: string,
  winner: HomeRestaurant
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("shuffle_sessions")
      .update({
        winner,
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (error) {
      console.error("❌ setSessionWinner failed:", error);
      return false;
    }

    return true;
  } catch (e) {
    console.error("❌ setSessionWinner exception:", e);
    return false;
  }
}

/**
 * Leave session
 */
export async function leaveShuffleSession(sessionId: string): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from("shuffle_session_participants")
      .delete()
      .eq("session_id", sessionId)
      .eq("user_id", user.id);

    if (error) {
      console.error("❌ leaveShuffleSession failed:", error);
      return false;
    }

    return true;
  } catch (e) {
    console.error("❌ leaveShuffleSession exception:", e);
    return false;
  }
}

/**
 * Delete session (host only)
 */
export async function deleteShuffleSession(
  sessionId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("shuffle_sessions")
      .delete()
      .eq("id", sessionId);

    if (error) {
      console.error("❌ deleteShuffleSession failed:", error);
      return false;
    }

    return true;
  } catch (e) {
    console.error("❌ deleteShuffleSession exception:", e);
    return false;
  }
}
