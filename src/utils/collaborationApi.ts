// src/utils/collaborationApi.ts
import { supabase } from "./supabaseClient";

export interface Collaborator {
  id: string;
  list_id: string;
  user_id: string;
  role: "owner" | "editor" | "viewer";
  created_at: string;
  user?: {
    display_name?: string;
    email?: string;
  };
}

/**
 * Generate a unique share link for a list
 */
export async function generateShareLink(
  listId: string
): Promise<string | null> {
  try {
    // Generate a random share link ID
    const shareLinkId = Array.from(
      { length: 16 },
      () => Math.random().toString(36)[2]
    ).join("");

    const { data, error } = await supabase
      .from("lists")
      .update({
        is_shareable: true,
        share_link_id: shareLinkId,
      })
      .eq("id", listId)
      .select("share_link_id")
      .single();

    if (error) {
      console.error("❌ generateShareLink failed:", error);
      return null;
    }

    return data.share_link_id;
  } catch (e) {
    console.error("❌ generateShareLink exception:", e);
    return null;
  }
}

/**
 * Get the share link ID for a list (if it exists)
 */
export async function getShareLink(listId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("lists")
      .select("share_link_id, is_shareable")
      .eq("id", listId)
      .single();

    if (error || !data?.is_shareable) {
      return null;
    }

    return data.share_link_id;
  } catch (e) {
    console.error("❌ getShareLink exception:", e);
    return null;
  }
}

/**
 * Disable sharing for a list (revoke share link)
 */
export async function revokeShareLink(listId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("lists")
      .update({
        is_shareable: false,
        share_link_id: null,
      })
      .eq("id", listId);

    if (error) {
      console.error("❌ revokeShareLink failed:", error);
      return false;
    }

    return true;
  } catch (e) {
    console.error("❌ revokeShareLink exception:", e);
    return false;
  }
}

/**
 * Join a list via share link
 */
export async function joinListViaShareLink(
  shareLinkId: string
): Promise<{ success: boolean; listId?: string; error?: string }> {
  try {
    // First, get the list by share link ID
    const { data: listData, error: listError } = await supabase
      .from("lists")
      .select("id, owner_id, is_shareable")
      .eq("share_link_id", shareLinkId)
      .eq("is_shareable", true)
      .single();

    if (listError || !listData) {
      return { success: false, error: "Invalid or expired share link" };
    }

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Check if user is already the owner
    if (listData.owner_id === user.id) {
      return { success: true, listId: listData.id };
    }

    // Check if user is already a collaborator
    const { data: existingCollab } = await supabase
      .from("list_collaborators")
      .select("id")
      .eq("list_id", listData.id)
      .eq("user_id", user.id)
      .single();

    if (existingCollab) {
      return { success: true, listId: listData.id };
    }

    // Add user as a collaborator
    const { error: insertError } = await supabase
      .from("list_collaborators")
      .insert({
        list_id: listData.id,
        user_id: user.id,
        role: "editor",
      });

    if (insertError) {
      console.error("❌ joinListViaShareLink insert failed:", insertError);
      return { success: false, error: "Failed to join list" };
    }

    return { success: true, listId: listData.id };
  } catch (e) {
    console.error("❌ joinListViaShareLink exception:", e);
    return { success: false, error: "An error occurred" };
  }
}

/**
 * Get all collaborators for a list
 */
export async function getCollaborators(
  listId: string
): Promise<Collaborator[]> {
  try {
    const { data, error } = await supabase
      .from("list_collaborators")
      .select(
        `
        id,
        list_id,
        user_id,
        role,
        created_at
      `
      )
      .eq("list_id", listId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("❌ getCollaborators failed:", error);
      return [];
    }

    return data || [];
  } catch (e) {
    console.error("❌ getCollaborators exception:", e);
    return [];
  }
}

/**
 * Remove a collaborator from a list
 */
export async function removeCollaborator(
  listId: string,
  userId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("list_collaborators")
      .delete()
      .eq("list_id", listId)
      .eq("user_id", userId);

    if (error) {
      console.error("❌ removeCollaborator failed:", error);
      return false;
    }

    return true;
  } catch (e) {
    console.error("❌ removeCollaborator exception:", e);
    return false;
  }
}

/**
 * Leave a list (remove yourself as collaborator)
 */
export async function leaveList(listId: string): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    return await removeCollaborator(listId, user.id);
  } catch (e) {
    console.error("❌ leaveList exception:", e);
    return false;
  }
}

/**
 * Update a collaborator's role
 */
export async function updateCollaboratorRole(
  listId: string,
  userId: string,
  role: "editor" | "viewer"
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("list_collaborators")
      .update({ role })
      .eq("list_id", listId)
      .eq("user_id", userId);

    if (error) {
      console.error("❌ updateCollaboratorRole failed:", error);
      return false;
    }

    return true;
  } catch (e) {
    console.error("❌ updateCollaboratorRole exception:", e);
    return false;
  }
}

/**
 * Check if current user is owner of a list
 */
export async function isListOwner(listId: string): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from("lists")
      .select("owner_id")
      .eq("id", listId)
      .single();

    if (error || !data) return false;

    return data.owner_id === user.id;
  } catch (e) {
    console.error("❌ isListOwner exception:", e);
    return false;
  }
}

/**
 * Get user's role in a list
 */
export async function getUserRoleInList(
  listId: string
): Promise<"owner" | "editor" | "viewer" | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    // Check if owner
    const { data: listData } = await supabase
      .from("lists")
      .select("owner_id")
      .eq("id", listId)
      .single();

    if (listData?.owner_id === user.id) {
      return "owner";
    }

    // Check collaborator role
    const { data: collabData } = await supabase
      .from("list_collaborators")
      .select("role")
      .eq("list_id", listId)
      .eq("user_id", user.id)
      .single();

    return (collabData?.role as "editor" | "viewer") || null;
  } catch (e) {
    console.error("❌ getUserRoleInList exception:", e);
    return null;
  }
}

/**
 * Get all lists the user has access to (owned + collaborated)
 */
export async function getAllAccessibleLists() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    // Get owned lists
    const { data: ownedLists, error: ownedError } = await supabase
      .from("lists")
      .select(
        `
        *,
        list_items(count)
      `
      )
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (ownedError) {
      console.error("❌ getAllAccessibleLists (owned) failed:", ownedError);
    }

    // Get collaborated lists
    const { data: collabData, error: collabError } = await supabase
      .from("list_collaborators")
      .select(
        `
        list_id,
        role,
        lists (
          *,
          list_items(count)
        )
      `
      )
      .eq("user_id", user.id);

    if (collabError) {
      console.error("❌ getAllAccessibleLists (collab) failed:", collabError);
    }

    const collaboratedLists =
      collabData?.map((c: any) => ({
        ...c.lists,
        userRole: c.role,
        isCollaborator: true,
      })) || [];

    // Combine and deduplicate
    const allLists = [
      ...(ownedLists?.map((l) => ({ ...l, userRole: "owner" })) || []),
      ...collaboratedLists,
    ];

    return allLists;
  } catch (e) {
    console.error("❌ getAllAccessibleLists exception:", e);
    return [];
  }
}
