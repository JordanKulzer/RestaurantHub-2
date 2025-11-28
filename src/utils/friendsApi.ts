// src/utils/friendsApi.ts
import { supabase } from "./supabaseClient";

export interface UserProfile {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  bio?: string | null;
  birthday?: string | null;
  total_shuffles: number;
  created_at?: string;
  updated_at?: string;
}

export interface Friend extends UserProfile {
  friendship_id: string;
  status: "pending" | "accepted" | "blocked";
  created_at: string;
}

export interface FriendRequest {
  id: string;
  sender: UserProfile;
  created_at: string;
}

// Get current user's profile
export async function getUserProfile(): Promise<UserProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }

  return data;
}

export async function updateUserProfile(updates: {
  display_name?: string;
  username?: string;
  bio?: string;
  birthday?: string;
}): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("user_profiles")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) throw error;
}

// Increment shuffle count
export async function incrementShuffleCount() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.rpc("increment_shuffle_count", { user_id: user.id });
}

// Get all friends
export async function getFriends(): Promise<Friend[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // ✅ Use manual join instead of foreign key hint
  const { data: friendships, error: friendshipsError } = await supabase
    .from("friendships")
    .select("id, status, created_at, friend_id")
    .eq("user_id", user.id)
    .eq("status", "accepted")
    .order("created_at", { ascending: false });

  if (friendshipsError) {
    console.error("Error fetching friendships:", friendshipsError);
    return [];
  }

  if (!friendships || friendships.length === 0) return [];

  // Get friend profiles separately
  const friendIds = friendships.map((f) => f.friend_id);
  const { data: profiles, error: profilesError } = await supabase
    .from("user_profiles")
    .select("*")
    .in("id", friendIds);

  if (profilesError) {
    console.error("Error fetching friend profiles:", profilesError);
    return [];
  }

  // Combine the data
  return friendships.map((f) => {
    const profile = profiles?.find((p) => p.id === f.friend_id);
    return {
      friendship_id: f.id,
      status: f.status as "accepted",
      created_at: f.created_at,
      id: profile?.id || "",
      display_name: profile?.display_name || null,
      username: profile?.username || null,
      avatar_url: profile?.avatar_url || null,
      total_shuffles: profile?.total_shuffles || 0,
    };
  });
}

// Get friend count
export async function getFriendCount(): Promise<number> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from("friendships")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "accepted");

  if (error) {
    console.error("Error counting friends:", error);
    return 0;
  }

  return count || 0;
}

// Send friend request
export async function sendFriendRequest(recipientUsername: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Find recipient by username
  const { data: recipient, error: searchError } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("username", recipientUsername)
    .single();

  if (searchError || !recipient) {
    throw new Error("User not found");
  }

  // Create friend request
  const { error } = await supabase.from("friend_requests").insert({
    sender_id: user.id,
    recipient_id: recipient.id,
  });

  if (error) {
    if (error.code === "23505") {
      // Unique constraint violation
      throw new Error("Friend request already sent");
    }
    throw error;
  }
}

// Get pending friend requests
export async function getPendingFriendRequests(): Promise<FriendRequest[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // ✅ Use manual join instead of foreign key hint
  const { data: requests, error: requestsError } = await supabase
    .from("friend_requests")
    .select("id, created_at, sender_id")
    .eq("recipient_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (requestsError) {
    console.error("Error fetching friend requests:", requestsError);
    return [];
  }

  if (!requests || requests.length === 0) return [];

  // Get sender profiles separately
  const senderIds = requests.map((r) => r.sender_id);
  const { data: profiles, error: profilesError } = await supabase
    .from("user_profiles")
    .select("*")
    .in("id", senderIds);

  if (profilesError) {
    console.error("Error fetching sender profiles:", profilesError);
    return [];
  }

  // Combine the data
  return requests.map((r) => {
    const profile = profiles?.find((p) => p.id === r.sender_id);
    return {
      id: r.id,
      created_at: r.created_at,
      sender: {
        id: profile?.id || "",
        display_name: profile?.display_name || null,
        username: profile?.username || null,
        avatar_url: profile?.avatar_url || null,
        total_shuffles: profile?.total_shuffles || 0,
      },
    };
  });
}

// Accept friend request
export async function acceptFriendRequest(requestId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Get request details
  const { data: request, error: fetchError } = await supabase
    .from("friend_requests")
    .select("sender_id")
    .eq("id", requestId)
    .single();

  if (fetchError || !request) throw new Error("Request not found");

  // Create bidirectional friendship
  await supabase.from("friendships").insert([
    { user_id: user.id, friend_id: request.sender_id, status: "accepted" },
    { user_id: request.sender_id, friend_id: user.id, status: "accepted" },
  ]);

  // Update request status
  await supabase
    .from("friend_requests")
    .update({ status: "accepted" })
    .eq("id", requestId);
}

// Decline friend request
export async function declineFriendRequest(requestId: string) {
  await supabase
    .from("friend_requests")
    .update({ status: "declined" })
    .eq("id", requestId);
}

// Remove friend
export async function removeFriend(friendshipId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Get the friendship to find the friend_id
  const { data: friendship } = await supabase
    .from("friendships")
    .select("friend_id")
    .eq("id", friendshipId)
    .single();

  if (!friendship) throw new Error("Friendship not found");

  // Delete both sides of the friendship
  await supabase
    .from("friendships")
    .delete()
    .or(
      `and(user_id.eq.${user.id},friend_id.eq.${friendship.friend_id}),and(user_id.eq.${friendship.friend_id},friend_id.eq.${user.id})`
    );
}

// Block user
export async function blockUser(userId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Remove existing friendship if any
  await supabase
    .from("friendships")
    .delete()
    .or(
      `and(user_id.eq.${user.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${user.id})`
    );

  // Create blocked relationship
  await supabase.from("friendships").insert({
    user_id: user.id,
    friend_id: userId,
    status: "blocked",
  });
}

// Search users by username
export async function searchUsers(query: string): Promise<UserProfile[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .ilike("username", `%${query}%`)
    .neq("id", user.id) // Exclude current user
    .limit(10);

  if (error) {
    console.error("Error searching users:", error);
    return [];
  }

  return data;
}

// Check if users are friends
export async function areFriends(userId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from("friendships")
    .select("id")
    .eq("user_id", user.id)
    .eq("friend_id", userId)
    .eq("status", "accepted")
    .single();

  return !error && !!data;
}
