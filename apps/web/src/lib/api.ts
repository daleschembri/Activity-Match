import type {
  ActivityDetail,
  ActivityDraft,
  ActivitySummary,
  ApiResponse,
  AppNotification,
  AttendanceCheckinStatus,
  AttendanceMark,
  AttendanceParticipant,
  ChatSummary,
  ChatParticipant,
  ChatPollPayload,
  FeedPage,
  FeedbackSentiment,
  Group,
  JoinRequest,
  Message,
  PastActivityDetail,
  ReliabilityDisplay,
  UserProfile,
} from "@activity-match/shared";
import type { ChatMessage } from "@/lib/chatMessages";
import { applyPollVote } from "@/lib/pollVotes";
import { DEFAULT_CONFIG } from "@activity-match/shared";
import { getAccessToken, isSupabaseConfigured, supabase } from "./supabase";

async function invoke<T>(name: string, body: Record<string, unknown>): Promise<ApiResponse<T>> {
  const token = await getAccessToken();
  const { data, error } = await supabase.functions.invoke(name, {
    body,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (error) return { error: { code: "VALIDATION_FAILED", message: error.message } };
  return data as ApiResponse<T>;
}

function mapActivityRow(row: Record<string, unknown>, participationCount = 0): ActivitySummary {
  const capacity = row.capacity as number | null;
  const spacesRemaining = capacity != null ? Math.max(0, capacity - participationCount) : null;
  const location = row.location as { area_label?: string } | null;
  const category = (row.category as ActivitySummary["category"] | null) ?? {
    id: (row.category_id as string) ?? "",
    name: "Uncategorized",
    parent_id: null,
    is_active: true,
  };
  const host = (row.host as ActivitySummary["host"] | null) ?? {
    id: (row.host_user_id as string) ?? "",
    display_name: "Host",
    avatar_ref: null,
  };

  return {
    id: row.id as string,
    title: row.title as string,
    listing_type: row.listing_type as ActivitySummary["listing_type"],
    status: row.status as ActivitySummary["status"],
    category,
    starts_at: (row.starts_at as string) ?? null,
    duration_minutes: (row.duration_minutes as number) ?? null,
    area_label: location?.area_label ?? null,
    distance_from_viewer_minutes: null,
    cost_amount: Number(row.cost_amount ?? 0),
    cost_currency: (row.cost_currency as string) ?? "EUR",
    skill_level: row.skill_level as ActivitySummary["skill_level"],
    capacity,
    participation_count: participationCount,
    spaces_remaining: spacesRemaining,
    is_full: capacity != null && participationCount >= capacity,
    is_joinable: row.status === "published" && (capacity == null || participationCount < capacity),
    host,
    tags: [],
    cover_image_ref: (row.cover_image_ref as string | null) ?? null,
    published_at: row.published_at as string | undefined,
  };
}

async function participationCounts(activityIds: string[]): Promise<Record<string, number>> {
  if (!activityIds.length) return {};
  const { data, error } = await supabase.rpc("get_participation_counts", {
    p_activity_ids: activityIds,
  });
  if (error) {
    console.warn("get_participation_counts failed:", error.message);
    return {};
  }
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.activity_id as string] = row.participant_count as number;
  }
  return counts;
}

const ACTIVITY_SELECT = `
  id, title, listing_type, status, starts_at, duration_minutes,
  cost_amount, cost_currency, skill_level, capacity, published_at, cover_image_ref,
  description, quorum, cost_note, equipment_note, equipment_provided,
  accessibility_note, min_age, max_age, join_deadline, acceptance_mode,
  visibility, public_slug, host_user_id, host_is_participating, attendance_resolved_at,
  category:categories(id, name, parent_id, is_active),
  host:profiles!activities_host_user_id_fkey(id, display_name, avatar_ref),
  location:locations(id, name, area_label, address_line, is_public_place, timezone)
`;

export const api = {
  async getProfile(): Promise<UserProfile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (error) throw new Error(error.message);
    return data as UserProfile;
  },

  async getFeed(filters?: { include_full?: boolean }, cursor?: string): Promise<FeedPage> {
    const { data: { user } } = await supabase.auth.getUser();

    let query = supabase
      .from("activities")
      .select(ACTIVITY_SELECT)
      .eq("status", "published")
      .eq("visibility", "public")
      .order("published_at", { ascending: false })
      .limit(20);

    if (cursor) query = query.lt("published_at", cursor);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    let rows = data ?? [];

    if (user) {
      const [{ data: swipes }, { data: joinRequests }] = await Promise.all([
        supabase
          .from("swipe_events")
          .select("activity_id, direction, created_at")
          .eq("user_id", user.id),
        supabase
          .from("join_requests")
          .select("activity_id")
          .eq("user_id", user.id)
          .in("status", ["pending", "waitlisted", "accepted"]),
      ]);

      const suppressionMs = DEFAULT_CONFIG.left_swipe_suppression_days * 24 * 60 * 60 * 1000;
      const now = Date.now();
      const excludedIds = new Set<string>();

      for (const swipe of swipes ?? []) {
        if (swipe.direction === "left") {
          const age = now - new Date(swipe.created_at as string).getTime();
          if (age < suppressionMs) excludedIds.add(swipe.activity_id as string);
        } else {
          excludedIds.add(swipe.activity_id as string);
        }
      }

      for (const request of joinRequests ?? []) {
        excludedIds.add(request.activity_id as string);
      }

      rows = rows.filter((row) => {
        if ((row.host_user_id as string) === user.id) return false;
        return !excludedIds.has(row.id as string);
      });
    }

    const ids = rows.map((r) => r.id as string);
    const counts = await participationCounts(ids);
    let items = rows.map((row) => mapActivityRow(row, counts[row.id as string] ?? 0));

    if (!filters?.include_full) {
      items = items.filter((item) => !item.is_full);
    }

    return {
      items,
      next_cursor: items.length ? (rows[rows.length - 1]?.published_at as string) ?? null : null,
      total_available: items.length,
      exhausted: items.length === 0,
      filters_widened: false,
    };
  },

  async getActivity(id: string): Promise<ActivityDetail | null> {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("activities")
      .select(ACTIVITY_SELECT)
      .eq("id", id)
      .single();

    if (error || !data) return null;

    const counts = await participationCounts([id]);
    const participationCount = counts[id] ?? 0;
    const summary = mapActivityRow(data, participationCount);

    let viewer_role: ActivityDetail["viewer_role"] = user ? "viewer" : "anonymous";
    if (user) {
      if (data.host_user_id === user.id) viewer_role = "host";
      else {
        const { data: participation } = await supabase
          .from("participations")
          .select("id, status")
          .eq("activity_id", id)
          .eq("user_id", user.id)
          .in("status", ["confirmed", "attended", "no_show"])
          .maybeSingle();
        if (participation) viewer_role = "participant";
        else {
          const { data: request } = await supabase
            .from("join_requests")
            .select("id")
            .eq("activity_id", id)
            .eq("user_id", user.id)
            .in("status", ["pending", "waitlisted"])
            .maybeSingle();
          if (request) viewer_role = "requester";
        }
      }
    }

    const hostUserId = data.host_user_id as string;
    const [{ data: hostProfile }, { data: participationRows }, { data: geoLocations }] = await Promise.all([
      supabase.from("profiles").select("id, display_name, avatar_ref, bio").eq("id", hostUserId).single(),
      supabase
        .from("participations")
        .select("user:profiles!participations_user_id_fkey(id, display_name, avatar_ref)")
        .eq("activity_id", id)
        .eq("status", "confirmed"),
      supabase.rpc("get_locations_geo"),
    ]);

    const locationRow = data.location as {
      id?: string;
      name?: string;
      area_label?: string;
      address_line?: string;
      is_public_place?: boolean;
      timezone?: string;
    } | null;

    let location: ActivityDetail["location"];
    if (locationRow?.id) {
      const coords = (geoLocations as Array<{ id: string; lat: number; lng: number }> | null)?.find(
        (entry) => entry.id === locationRow.id,
      );
      location = {
        id: locationRow.id,
        name: locationRow.name ?? "Meeting point",
        area_label: locationRow.area_label ?? summary.area_label ?? "",
        is_public_place: locationRow.is_public_place ?? true,
        address_line: locationRow.address_line ?? undefined,
        timezone: locationRow.timezone ?? "UTC",
        point: coords ? { lat: coords.lat, lng: coords.lng } : undefined,
      };
    }

    const participants = (participationRows ?? [])
      .map((row) => {
        const raw = row.user as
          | { id: string; display_name: string; avatar_ref: string | null }
          | { id: string; display_name: string; avatar_ref: string | null }[]
          | null;
        const profile = Array.isArray(raw) ? raw[0] : raw;
        if (!profile) return null;
        return {
          ...profile,
          is_host: profile.id === hostUserId,
        };
      })
      .filter(Boolean) as NonNullable<ActivityDetail["participants"]>;

    const hostFromJoin = summary.host;
    const host = {
      id: hostProfile?.id ?? hostFromJoin.id,
      display_name: hostProfile?.display_name ?? hostFromJoin.display_name,
      avatar_ref: hostProfile?.avatar_ref ?? hostFromJoin.avatar_ref,
      bio: hostProfile?.bio ?? null,
    };

    return {
      ...summary,
      host,
      description: data.description as string,
      location,
      quorum: data.quorum as number | null,
      cost_note: data.cost_note as string | null,
      equipment_note: data.equipment_note as string | null,
      equipment_provided: data.equipment_provided as boolean,
      accessibility_note: data.accessibility_note as string | null,
      min_age: data.min_age as number | null,
      max_age: data.max_age as number | null,
      join_deadline: data.join_deadline as string | null,
      acceptance_mode: data.acceptance_mode as ActivityDetail["acceptance_mode"],
      visibility: data.visibility as ActivityDetail["visibility"],
      public_slug: data.public_slug as string,
      participants,
      participant_count_visible: participationCount,
      viewer_role,
    };
  },

  async updateProfile(updates: {
    display_name?: string;
    bio?: string | null;
    home_area_label?: string;
    avatar_ref?: string | null;
    date_of_birth?: string | null;
    gender?: string | null;
  }): Promise<UserProfile> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const payload: Record<string, unknown> = {};
    if (updates.display_name !== undefined) {
      const name = updates.display_name.trim();
      if (name.length < 2 || name.length > 40) {
        throw new Error("Display name must be 2–40 characters.");
      }
      payload.display_name = name;
    }
    if (updates.bio !== undefined) {
      const bio = updates.bio?.trim() ?? "";
      if (bio.length > 300) throw new Error("Bio must be 300 characters or less.");
      payload.bio = bio || null;
    }
    if (updates.home_area_label !== undefined) {
      const area = updates.home_area_label.trim();
      if (!area) throw new Error("Location is required.");
      payload.home_area_label = area;
    }
    if (updates.avatar_ref !== undefined) payload.avatar_ref = updates.avatar_ref;
    if (updates.date_of_birth !== undefined) {
      const dob = updates.date_of_birth?.trim() ?? "";
      if (!dob) {
        payload.date_of_birth = null;
      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
        throw new Error("Please enter a valid date of birth.");
      } else {
        const birth = new Date(`${dob}T00:00:00`);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (Number.isNaN(birth.getTime()) || birth > today) {
          throw new Error("Date of birth cannot be in the future.");
        }
        const minAgeDate = new Date(today);
        minAgeDate.setFullYear(minAgeDate.getFullYear() - 13);
        if (birth > minAgeDate) {
          throw new Error("You must be at least 13 years old.");
        }
        payload.date_of_birth = dob;
      }
    }
    if (updates.gender !== undefined) {
      const allowed = new Set(["woman", "man", "non_binary", "prefer_not_to_say"]);
      const gender = updates.gender?.trim() ?? "";
      if (!gender) {
        payload.gender = null;
      } else if (!allowed.has(gender)) {
        throw new Error("Please choose a valid gender option.");
      } else {
        payload.gender = gender;
      }
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", user.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as UserProfile;
  },

  async uploadAvatar(file: File): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) throw new Error(uploadError.message);

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    await api.updateProfile({ avatar_ref: data.publicUrl });
    return data.publicUrl;
  },

  async uploadActivityCover(file: File): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
    if (file.size > 5 * 1024 * 1024) throw new Error("Image must be 5 MB or smaller.");

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("activity-covers")
      .upload(path, file, { upsert: false, contentType: file.type });
    if (uploadError) throw new Error(uploadError.message);

    const { data } = supabase.storage.from("activity-covers").getPublicUrl(path);
    return data.publicUrl;
  },

  async getLocations() {
    const { data, error } = await supabase.rpc("get_locations_geo");
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{ id: string; name: string; area_label: string; lat: number; lng: number }>;
  },

  async createLocationFromPin(pin: { name: string; area_label: string; lat: number; lng: number }) {
    const { data, error } = await supabase.rpc("create_location_from_pin", {
      p_name: pin.name,
      p_area_label: pin.area_label,
      p_lat: pin.lat,
      p_lng: pin.lng,
    });
    if (error) throw new Error(error.message);
    return data as string;
  },

  async resolveLocationId(payload: Record<string, unknown>): Promise<string | null> {
    if (payload.location_id) return payload.location_id as string;
    const pin = payload.location_pin as
      | { name: string; area_label: string; lat: number; lng: number }
      | undefined;
    if (pin) return api.createLocationFromPin(pin);
    return null;
  },

  buildActivityPayload(payload: Record<string, unknown>) {
    const title = String(payload.title ?? "").trim();
    if (title.length < 3) throw new Error("Title must be at least 3 characters.");
    if (!payload.category_id) throw new Error("Please choose a category.");

    return {
      listing_type: payload.listing_type ?? "confirmed",
      title,
      description: String(payload.description ?? "").slice(0, 2000),
      category_id: payload.category_id,
      capacity: Number(payload.capacity ?? 8),
      cost_amount: Number(payload.cost_amount ?? 0),
      cost_currency: payload.cost_currency ?? "EUR",
      cost_note: payload.cost_note ? String(payload.cost_note).slice(0, 200) : null,
      skill_level: payload.skill_level ?? "any",
      starts_at: payload.starts_at ?? null,
      duration_minutes: payload.duration_minutes ? Number(payload.duration_minutes) : null,
      location_id: payload.location_id ?? null,
      acceptance_mode: payload.acceptance_mode ?? "auto",
      host_is_participating: payload.host_is_participating ?? true,
      visibility: payload.visibility ?? "public",
      cover_image_ref: payload.cover_image_ref ?? null,
    };
  },

  validateActivityForPublish(payload: Record<string, unknown>) {
    if (!payload.starts_at) throw new Error("Date and time are required.");
    if (!payload.location_id && !payload.location_pin) throw new Error("Please drop a pin on the map.");
    const pin = payload.location_pin as { name?: string; area_label?: string } | undefined;
    if (pin) {
      if (!String(pin.name ?? "").trim()) throw new Error("Place name is required.");
      if (!String(pin.area_label ?? "").trim()) throw new Error("Area is required.");
    }
    const capacity = Number(payload.capacity ?? 0);
    if (capacity < 2) throw new Error("Capacity must be at least 2.");
    const startsAt = new Date(String(payload.starts_at));
    if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() <= Date.now()) {
      throw new Error("Start time must be in the future.");
    }
  },

  async createActivity(payload: Record<string, unknown>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const activity = api.buildActivityPayload(payload);
    const locationId = await api.resolveLocationId(payload);
    if (!locationId) throw new Error("Please drop a pin on the map and name the place.");

    const { data, error } = await supabase
      .from("activities")
      .insert({
        ...activity,
        location_id: locationId,
        starts_at: activity.starts_at ?? new Date(Date.now() + 7 * 86400000).toISOString(),
        host_user_id: user.id,
        status: "draft",
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { data };
  },

  async publishActivity(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("activities")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", id)
      .eq("host_user_id", user.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { data };
  },

  async createAndPublishActivity(payload: Record<string, unknown>) {
    api.validateActivityForPublish(payload);
    const { data: draft } = await api.createActivity(payload);
    const { data: published } = await api.publishActivity(draft.id);
    return published;
  },

  validateActivityForUpdate(payload: Record<string, unknown>) {
    if (!payload.starts_at) throw new Error("Date and time are required.");
    if (!payload.location_id && !payload.location_pin) throw new Error("Please drop a pin on the map.");
    const pin = payload.location_pin as { name?: string; area_label?: string } | undefined;
    if (pin) {
      if (!String(pin.name ?? "").trim()) throw new Error("Place name is required.");
      if (!String(pin.area_label ?? "").trim()) throw new Error("Area is required.");
    }
    const capacity = Number(payload.capacity ?? 0);
    if (capacity < 2) throw new Error("Capacity must be at least 2.");
  },

  async updateActivity(id: string, payload: Record<string, unknown>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: existing, error: fetchError } = await supabase
      .from("activities")
      .select("host_user_id, status, location_id")
      .eq("id", id)
      .single();
    if (fetchError || !existing) throw new Error("Activity not found");
    if (existing.host_user_id !== user.id) throw new Error("Only the host can edit this activity");
    if (!["published", "draft"].includes(existing.status as string)) {
      throw new Error("This activity can no longer be edited");
    }

    api.validateActivityForUpdate(payload);
    const activity = api.buildActivityPayload(payload);
    const pin = payload.location_pin as
      | { lat: number; lng: number; name: string; area_label: string }
      | undefined;
    let locationId = existing.location_id as string | null;

    if (pin) {
      const existingLocationId = existing.location_id as string | null;
      if (existingLocationId) {
        const { data: geoLocations } = await supabase.rpc("get_locations_geo");
        const current = (geoLocations as Array<{ id: string; lat: number; lng: number }> | null)?.find(
          (entry) => entry.id === existingLocationId,
        );
        const pinMoved =
          !current ||
          Math.abs(current.lat - pin.lat) > 0.0001 ||
          Math.abs(current.lng - pin.lng) > 0.0001;
        locationId = pinMoved ? await api.createLocationFromPin(pin) : existingLocationId;
      } else {
        locationId = await api.createLocationFromPin(pin);
      }
    }

    if (!locationId) throw new Error("Please drop a pin on the map and name the place.");

    const { data, error } = await supabase
      .from("activities")
      .update({
        title: activity.title,
        description: activity.description,
        category_id: activity.category_id,
        capacity: activity.capacity,
        cost_amount: activity.cost_amount,
        cost_currency: activity.cost_currency,
        cost_note: activity.cost_note,
        skill_level: activity.skill_level,
        starts_at: activity.starts_at,
        duration_minutes: activity.duration_minutes,
        location_id: locationId,
        acceptance_mode: activity.acceptance_mode,
        host_is_participating: activity.host_is_participating,
        cover_image_ref: activity.cover_image_ref,
      })
      .eq("id", id)
      .eq("host_user_id", user.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async removeParticipant(activityId: string, participantUserId: string) {
    const { data, error } = await supabase.rpc("remove_participant_by_host", {
      p_activity_id: activityId,
      p_participant_user_id: participantUserId,
    });
    if (error) throw new Error(error.message);
    if (data?.error) {
      const code = data.error.code as string;
      if (code === "NOT_PARTICIPANT") throw new Error("That person is not a confirmed attendee.");
      if (code === "CANNOT_REMOVE_HOST") throw new Error("You cannot remove yourself from the attendee list here.");
      throw new Error(code);
    }
    return data;
  },

  async recordSwipe(payload: Record<string, unknown>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error: swipeError } = await supabase.from("swipe_events").upsert({
      user_id: user.id,
      activity_id: payload.activity_id,
      direction: payload.direction,
      position_in_feed: payload.position_in_feed,
      dwell_ms: payload.dwell_ms ?? 0,
    }, { onConflict: "user_id,activity_id" });
    if (swipeError) throw new Error(swipeError.message);

    if (payload.direction === "left") {
      await supabase
        .from("saved_activities")
        .delete()
        .eq("user_id", user.id)
        .eq("activity_id", payload.activity_id as string);
    }
    if (payload.direction === "right") {
      try {
        const introduction = typeof payload.introduction === "string" ? payload.introduction.trim() : "";
        if (!introduction) throw new Error("A message to the host is required");
        await api.createJoinRequest({
          activity_id: payload.activity_id,
          introduction,
          availability_confirmed: true,
          idempotency_key: payload.idempotency_key,
          source: "swipe",
        });
      } catch {
        // Swipe is saved even if join fails (own activity, full, already requested, etc.)
      }
      await supabase
        .from("saved_activities")
        .delete()
        .eq("user_id", user.id)
        .eq("activity_id", payload.activity_id as string);
    }
    if (payload.direction === "up") {
      const { error: saveError } = await supabase.from("saved_activities").upsert({
        user_id: user.id,
        activity_id: payload.activity_id as string,
      });
      if (saveError) throw new Error(saveError.message);
    }
    return { data: { ok: true } };
  },

  async getStarredActivities(): Promise<ActivitySummary[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: saved, error } = await supabase
      .from("saved_activities")
      .select("activity_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    if (!saved?.length) return [];

    const activityIds = saved.map((row) => row.activity_id as string);

    const [{ data: joinRequests }, { data: leftSwipes }] = await Promise.all([
      supabase
        .from("join_requests")
        .select("activity_id")
        .eq("user_id", user.id)
        .in("activity_id", activityIds)
        .in("status", ["pending", "waitlisted", "accepted"]),
      supabase
        .from("swipe_events")
        .select("activity_id")
        .eq("user_id", user.id)
        .eq("direction", "left")
        .in("activity_id", activityIds),
    ]);

    const excluded = new Set<string>([
      ...(joinRequests ?? []).map((row) => row.activity_id as string),
      ...(leftSwipes ?? []).map((row) => row.activity_id as string),
    ]);

    const pendingIds = activityIds.filter((id) => !excluded.has(id));
    if (!pendingIds.length) return [];

    const { data: rows, error: activitiesError } = await supabase
      .from("activities")
      .select(ACTIVITY_SELECT)
      .in("id", pendingIds)
      .eq("status", "published")
      .eq("visibility", "public");

    if (activitiesError) throw new Error(activitiesError.message);

    const counts = await participationCounts(pendingIds);
    const byId = new Map(
      (rows ?? []).map((row) => [row.id as string, mapActivityRow(row, counts[row.id as string] ?? 0)]),
    );

    return pendingIds.map((id) => byId.get(id)).filter((item): item is ActivitySummary => Boolean(item));
  },

  async createJoinRequest(payload: Record<string, unknown>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const introduction = typeof payload.introduction === "string" ? payload.introduction.trim() : "";
    if (!introduction) throw new Error("Write a message to the host before sending your request.");

    const { data, error } = await supabase.rpc("create_join_request_atomic", {
      p_user_id: user.id,
      p_activity_id: payload.activity_id,
      p_introduction: introduction,
      p_availability_confirmed: payload.availability_confirmed ?? true,
      p_source: (payload.source as string) ?? "detail",
    });
    if (error) throw new Error(error.message);
    if (data?.error) {
      throw new Error(data.error.message ?? data.error.code ?? "Could not send join request");
    }
    return data;
  },

  async getJoinRequests(status: "pending" | "waitlisted" = "pending"): Promise<JoinRequest[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: hosted } = await supabase.from("activities").select("id").eq("host_user_id", user.id);
    const activityIds = hosted?.map((a) => a.id) ?? [];
    if (!activityIds.length) return [];

    const { data, error } = await supabase
      .from("join_requests")
      .select(
        "*, user:profiles!join_requests_user_id_fkey(id, display_name, avatar_ref), activity:activities(id, title, capacity, acceptance_mode)",
      )
      .eq("status", status)
      .in("activity_id", activityIds)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);

    const requests = (data ?? []) as JoinRequest[];
    const ids = [...new Set(requests.map((r) => r.activity_id))];
    const counts = await participationCounts(ids);

    return requests.map((req) => ({
      ...req,
      activity: req.activity
        ? {
            ...req.activity,
            participation_count: counts[req.activity_id] ?? 0,
            is_full:
              req.activity.capacity != null &&
              (counts[req.activity_id] ?? 0) >= req.activity.capacity,
          }
        : req.activity,
    }));
  },

  async respondToJoinRequest(requestId: string, decision: "accept" | "decline" | "waitlist") {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    if (decision === "accept") {
      const { data, error } = await supabase.rpc("accept_join_request", {
        p_request_id: requestId,
        p_actor_id: user.id,
      });
      if (error) throw new Error(error.message);
      return data;
    }

    if (decision === "waitlist") {
      const { data, error } = await supabase.rpc("host_move_request_to_waitlist", {
        p_request_id: requestId,
        p_host_id: user.id,
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error.message ?? data.error.code);
      return data;
    }

    const status = "declined";
    const { error } = await supabase
      .from("join_requests")
      .update({ status, resolved_at: new Date().toISOString() })
      .eq("id", requestId);
    if (error) throw new Error(error.message);
    return { data: { ok: true } };
  },

  async claimWaitlist(requestId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const { data, error } = await supabase.rpc("accept_join_request", {
      p_request_id: requestId,
      p_actor_id: user.id,
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error.message ?? data.error.code ?? "Could not claim spot");
    return data;
  },

  async declineWaitlistOffer(requestId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const { data, error } = await supabase.rpc("decline_waitlist_offer", {
      p_request_id: requestId,
      p_user_id: user.id,
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error.message ?? data.error.code);
    return data;
  },

  async getWaitlistOffer(requestId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("join_requests")
      .select(
        `
        id, status, claim_expires_at, activity_id,
        activity:activities(
          id, title, starts_at, duration_minutes, cover_image_ref, capacity,
          category:categories(id, name),
          location:locations(area_label, name)
        )
      `,
      )
      .eq("id", requestId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data || data.status !== "waitlisted") return null;

    const activityRaw = data.activity as unknown;
    const activity = (Array.isArray(activityRaw) ? activityRaw[0] : activityRaw) as {
      id: string;
      title: string;
      starts_at: string | null;
      duration_minutes: number | null;
      cover_image_ref: string | null;
      capacity: number | null;
      category: { id: string; name: string } | { id: string; name: string }[] | null;
      location: { area_label: string | null; name: string | null } | { area_label: string | null; name: string | null }[] | null;
    } | null;

    if (!activity) return null;

    const category = Array.isArray(activity.category) ? activity.category[0] : activity.category;
    const location = Array.isArray(activity.location) ? activity.location[0] : activity.location;

    const counts = await participationCounts([activity.id]);
    const participationCount = counts[activity.id] ?? 0;

    return {
      request_id: data.id as string,
      claim_expires_at: data.claim_expires_at as string | null,
      activity: {
        id: activity.id,
        title: activity.title,
        starts_at: activity.starts_at,
        duration_minutes: activity.duration_minutes,
        cover_image_ref: activity.cover_image_ref,
        category_name: category?.name ?? "Activity",
        area_label: location?.area_label ?? location?.name ?? null,
        participation_count: participationCount,
        capacity: activity.capacity,
        is_full: activity.capacity != null && participationCount >= activity.capacity,
      },
    };
  },

  async leaveActivity(activityId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase.rpc("leave_activity", {
      p_activity_id: activityId,
      p_user_id: user.id,
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error.message ?? data.error.code);
    return data;
  },

  async withdrawJoinRequest(activityId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase.rpc("withdraw_join_request", {
      p_activity_id: activityId,
      p_user_id: user.id,
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error.message ?? data.error.code);
    return data;
  },

  async canAccessActivityChat(activityId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: activity } = await supabase
      .from("activities")
      .select("host_user_id")
      .eq("id", activityId)
      .maybeSingle();
    if (!activity) return false;
    if (activity.host_user_id === user.id) return true;

    const { data: participation } = await supabase
      .from("participations")
      .select("id")
      .eq("activity_id", activityId)
      .eq("user_id", user.id)
      .in("status", ["confirmed", "attended", "no_show"])
      .maybeSingle();
    return Boolean(participation);
  },

  async getMyChats(): Promise<ChatSummary[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const plans = await api.getMyPlans();
    const unreadByActivity = await api.getUnreadMessageCounts();
    const byId = new Map<string, ChatSummary>();

    const chatEligible = (status: ActivitySummary["status"]) =>
      status === "published" || status === "completed";

    for (const activity of plans.hosted) {
      if (chatEligible(activity.status)) {
        byId.set(activity.id, {
          ...activity,
          chat_role: "host",
          unread_count: unreadByActivity[activity.id] ?? 0,
        });
      }
    }
    for (const activity of plans.joined) {
      if (!byId.has(activity.id) && chatEligible(activity.status)) {
        byId.set(activity.id, {
          ...activity,
          chat_role: "participant",
          unread_count: unreadByActivity[activity.id] ?? 0,
        });
      }
    }

    const activityIds = [...byId.keys()];
    const lastByActivity = await api.getChatLastMessages(activityIds);

    for (const [id, chat] of byId) {
      byId.set(id, { ...chat, last_message: lastByActivity[id] ?? null });
    }

    return [...byId.values()].sort((a, b) => {
      const aTime = a.starts_at ? new Date(a.starts_at).getTime() : 0;
      const bTime = b.starts_at ? new Date(b.starts_at).getTime() : 0;
      return bTime - aTime;
    });
  },

  async getChatLastMessages(
    activityIds: string[],
  ): Promise<Record<string, ChatSummary["last_message"]>> {
    if (!activityIds.length) return {};

    const { data: conversations } = await supabase
      .from("conversations")
      .select("id, activity_id")
      .in("activity_id", activityIds);

    if (!conversations?.length) return {};

    const convToActivity = new Map(conversations.map((c) => [c.id as string, c.activity_id as string]));
    const convIds = conversations.map((c) => c.id as string);

    const { data: messages, error } = await supabase
      .from("messages")
      .select(
        "conversation_id, body, created_at, type, sender:profiles!messages_sender_user_id_fkey(display_name)",
      )
      .in("conversation_id", convIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const result: Record<string, ChatSummary["last_message"]> = {};
    for (const row of messages ?? []) {
      const activityId = convToActivity.get(row.conversation_id as string);
      if (!activityId || result[activityId]) continue;
      const sender = Array.isArray(row.sender) ? row.sender[0] : row.sender;
      result[activityId] = {
        body: row.body as string,
        created_at: row.created_at as string,
        sender_name: (sender?.display_name as string | undefined) ?? null,
        type: row.type as Message["type"],
      };
    }
    return result;
  },

  async getChatParticipants(activityId: string): Promise<ChatParticipant[]> {
    const activity = await api.getActivity(activityId);
    if (!activity) return [];

    const { data: rows, error } = await supabase
      .from("participations")
      .select("user:profiles!participations_user_id_fkey(id, display_name, avatar_ref)")
      .eq("activity_id", activityId)
      .in("status", ["confirmed", "attended", "no_show"]);

    if (error) throw new Error(error.message);

    const participants: ChatParticipant[] = (rows ?? [])
      .map((row) => {
        const profile = Array.isArray(row.user) ? row.user[0] : row.user;
        if (!profile) return null;
        return {
          id: profile.id as string,
          display_name: profile.display_name as string,
          avatar_ref: profile.avatar_ref as string | null,
          is_host: profile.id === activity.host.id,
        };
      })
      .filter(Boolean) as ChatParticipant[];

    if (!participants.some((p) => p.id === activity.host.id)) {
      participants.unshift({
        id: activity.host.id,
        display_name: activity.host.display_name,
        avatar_ref: activity.host.avatar_ref,
        is_host: true,
      });
    }

    return participants;
  },

  async voteChatPoll(messageId: string, optionId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: message, error: fetchError } = await supabase
      .from("messages")
      .select("id, type, payload")
      .eq("id", messageId)
      .maybeSingle();

    if (fetchError) throw new Error(fetchError.message);
    if (!message) throw new Error("Poll not found");
    if (message.type !== "poll") throw new Error("Not a poll message");

    const currentPayload = message.payload as unknown as ChatPollPayload;
    const nextPayload = applyPollVote(currentPayload, optionId, user.id);

    // RPC returns JSONB; PostgREST cannot coerce that scalar to a row — check error only.
    const { error: rpcError } = await supabase.rpc("vote_chat_poll", {
      p_message_id: messageId,
      p_option_id: optionId,
    });
    if (!rpcError) return nextPayload;

    const { error: updateError } = await supabase
      .from("messages")
      .update({ payload: nextPayload as unknown as Record<string, unknown> })
      .eq("id", messageId);

    if (updateError) {
      throw new Error(updateError.message || rpcError.message);
    }

    return nextPayload;
  },

  async getUnreadMessageCounts(): Promise<Record<string, number>> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return {};

    const { data, error } = await supabase.rpc("get_unread_message_counts");
    if (error) {
      console.warn("get_unread_message_counts failed:", error.message);
      return {};
    }

    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      const activityId = row.activity_id as string;
      counts[activityId] = Number(row.unread_count ?? 0);
    }
    return counts;
  },

  async getUnreadChatCount(): Promise<number> {
    const counts = await api.getUnreadMessageCounts();
    return Object.values(counts).reduce((sum, count) => sum + count, 0);
  },

  async markConversationRead(activityId: string) {
    const { error } = await supabase.rpc("mark_conversation_read", {
      p_activity_id: activityId,
    });
    if (error) {
      console.warn("mark_conversation_read failed:", error.message);
    }
  },

  async getMessages(activityId: string): Promise<ChatMessage[]> {
    const allowed = await api.canAccessActivityChat(activityId);
    if (!allowed) throw new Error("Chat is only available after you are accepted.");

    const { data: conv } = await supabase.from("conversations").select("id").eq("activity_id", activityId).maybeSingle();
    if (!conv) return [];
    const { data, error } = await supabase
      .from("messages")
      .select("*, sender:profiles!messages_sender_user_id_fkey(id, display_name, avatar_ref)")
      .eq("conversation_id", conv.id)
      .order("created_at");
    if (error) throw new Error(error.message);
    return (data ?? []) as ChatMessage[];
  },

  async ensureAttendanceCheckin(activityId: string) {
    const { error } = await supabase.rpc("ensure_attendance_checkin_prompt", {
      p_activity_id: activityId,
    });
    if (error) {
      console.warn("ensure_attendance_checkin_prompt failed:", error.message);
    }
  },

  async getAttendanceCheckinStatus(activityId: string): Promise<AttendanceCheckinStatus> {
    const { data: { user } } = await supabase.auth.getUser();
    const confirmationHours = DEFAULT_CONFIG.attendance_confirmation_hours;

    const { data: activity, error: activityError } = await supabase
      .from("activities")
      .select("id, starts_at, status, host_user_id, attendance_prompt_sent_at")
      .eq("id", activityId)
      .maybeSingle();

    if (activityError) throw new Error(activityError.message);

    const startsAt = activity?.starts_at ? new Date(activity.starts_at as string) : null;
    const withinWindow = Boolean(
      activity?.status === "published" &&
        startsAt &&
        startsAt > new Date() &&
        startsAt.getTime() - Date.now() <= confirmationHours * 60 * 60 * 1000,
    );
    const confirmBy =
      startsAt && withinWindow
        ? new Date(startsAt.getTime() - 2 * 60 * 60 * 1000).toISOString()
        : null;

    const { data: participationRows, error: participationError } = await supabase
      .from("participations")
      .select("user_id, attendance_confirmed_at, user:profiles!participations_user_id_fkey(id, display_name, avatar_ref)")
      .eq("activity_id", activityId)
      .eq("status", "confirmed");

    if (participationError) throw new Error(participationError.message);

    const hostUserId = activity?.host_user_id as string | undefined;
    const viewerIsHost = Boolean(user && hostUserId && user.id === hostUserId);
    const participants = (participationRows ?? [])
      .map((row) => {
        const profile = Array.isArray(row.user) ? row.user[0] : row.user;
        if (!profile || !row.user_id) return null;
        return {
          user_id: row.user_id as string,
          display_name: profile.display_name as string,
          avatar_ref: profile.avatar_ref as string | null,
          attendance_confirmed_at: (row.attendance_confirmed_at as string | null) ?? null,
          is_host: row.user_id === hostUserId,
        };
      })
      .filter(Boolean) as AttendanceCheckinStatus["participants"];

    const viewerRow = user ? participants.find((p) => p.user_id === user.id) : undefined;
    const viewerConfirmedAt = viewerRow?.attendance_confirmed_at ?? null;
    const viewerCanRespond = Boolean(
      user &&
        withinWindow &&
        viewerRow &&
        !viewerRow.is_host &&
        !viewerConfirmedAt,
    );

    return {
      within_window: withinWindow,
      prompt_sent: Boolean(activity?.attendance_prompt_sent_at),
      confirm_by: confirmBy,
      viewer_is_host: viewerIsHost,
      viewer_can_respond: viewerCanRespond,
      viewer_confirmed_at: viewerConfirmedAt,
      participants,
    };
  },

  async confirmActivityCheckin(activityId: string, attending: boolean) {
    const { error } = await supabase.rpc("confirm_activity_checkin", {
      p_activity_id: activityId,
      p_attending: attending,
    });
    if (error) throw new Error(error.message);
  },

  async sendMessage(activityId: string, body: string) {
    const allowed = await api.canAccessActivityChat(activityId);
    if (!allowed) throw new Error("Chat is only available after you are accepted.");

    const { data: { user } } = await supabase.auth.getUser();
    const { data: conv } = await supabase.from("conversations").select("id").eq("activity_id", activityId).single();
    if (!conv || !user) throw new Error("Cannot send message");
    const { error } = await supabase.from("messages").insert({
      conversation_id: conv.id,
      sender_user_id: user.id,
      body,
      type: "user_text",
    });
    if (error) throw new Error(error.message);
    void api.markConversationRead(activityId).catch(() => undefined);
    return { data: { ok: true } };
  },

  async createChatPoll(
    activityId: string,
    payload: { question: string; options: string[]; allowMultiple?: boolean },
  ) {
    const allowed = await api.canAccessActivityChat(activityId);
    if (!allowed) throw new Error("Chat is only available after you are accepted.");

    const trimmedQuestion = payload.question.trim();
    const trimmedOptions = payload.options.map((opt) => opt.trim()).filter(Boolean);
    if (!trimmedQuestion) throw new Error("Poll question is required");
    if (trimmedOptions.length < 2) throw new Error("Add at least two poll options");
    if (trimmedOptions.length > 6) throw new Error("Polls can have at most six options");

    const { data: { user } } = await supabase.auth.getUser();
    const { data: conv } = await supabase.from("conversations").select("id").eq("activity_id", activityId).single();
    if (!conv || !user) throw new Error("Cannot create poll");

    const pollPayload: ChatPollPayload = {
      question: trimmedQuestion,
      allow_multiple: Boolean(payload.allowMultiple),
      options: trimmedOptions.map((label, index) => ({
        id: `opt-${index + 1}`,
        label,
        votes: [],
      })),
    };

    const { error } = await supabase.from("messages").insert({
      conversation_id: conv.id,
      sender_user_id: user.id,
      body: trimmedQuestion,
      type: "poll",
      payload: pollPayload,
    });
    if (error) throw new Error(error.message);
    void api.markConversationRead(activityId).catch(() => undefined);
    return { data: { ok: true } };
  },

  async draftFromText(freeText: string): Promise<ActivityDraft> {
    if (isSupabaseConfigured) {
      const res = await invoke<ActivityDraft>("draft-from-text", {
        free_text: freeText,
        viewer_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        viewer_location: { lat: 35.9, lng: 14.5 },
      });
      if (!("error" in res) && res.data) return res.data;
    }
    return {
      title: { value: freeText.split(/[.!?\n]/)[0].slice(0, 80), confidence: 0.7, origin: "inferred" },
      description: { value: freeText, confidence: 0.9, origin: "extracted" },
      suggested_tags: ["social", "casual"],
    };
  },

  async getUserInterests(): Promise<string[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from("user_interests")
      .select("category_id")
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => row.category_id as string);
  },

  async saveUserInterests(categoryIds: string[]) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error: deleteError } = await supabase.from("user_interests").delete().eq("user_id", user.id);
    if (deleteError) throw new Error(deleteError.message);

    if (categoryIds.length) {
      const { error } = await supabase.from("user_interests").insert(
        categoryIds.map((category_id) => ({ user_id: user.id, category_id, weight: 1 })),
      );
      if (error) throw new Error(error.message);
    }
  },

  async saveOnboarding(categoryIds: string[], availability: Array<{ day_of_week: string; time_start: string; time_end: string }>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error: deleteInterestsError } = await supabase.from("user_interests").delete().eq("user_id", user.id);
    if (deleteInterestsError) throw new Error(deleteInterestsError.message);
    if (categoryIds.length) {
      const { error } = await supabase.from("user_interests").insert(
        categoryIds.map((category_id) => ({ user_id: user.id, category_id, weight: 1 })),
      );
      if (error) throw new Error(error.message);
    }

    const { error: deleteAvailabilityError } = await supabase.from("user_availability").delete().eq("user_id", user.id);
    if (deleteAvailabilityError) throw new Error(deleteAvailabilityError.message);
    if (availability.length) {
      const { error } = await supabase.from("user_availability").insert(
        availability.map((slot) => ({ user_id: user.id, ...slot })),
      );
      if (error) throw new Error(error.message);
    }

    const { error } = await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
    if (error) throw new Error(error.message);
  },

  async getReliability(userId: string): Promise<ReliabilityDisplay> {
    const { data } = await supabase.from("reliability_records").select("*").eq("user_id", userId).maybeSingle();
    const minActivities = DEFAULT_CONFIG.reliability_visibility_min_activities;
    if (!data || data.attended_count + data.hosted_count < minActivities) {
      return { label: "New to the platform", is_new: true };
    }
    return {
      label: "Reliability",
      is_new: false,
      attended_count: data.attended_count,
      late_cancellation_count: data.late_cancellation_count,
      no_show_count: data.no_show_count,
      hosted_count: data.hosted_count,
    };
  },

  async resolvePublicActivity(slug: string): Promise<ActivityDetail | null> {
    const { data } = await supabase
      .from("activities")
      .select(ACTIVITY_SELECT)
      .eq("public_slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (!data) return null;
    return api.getActivity(data.id as string);
  },

  async createGuestInterest(payload: Record<string, unknown>) {
    return invoke("create-guest-interest", payload);
  },

  async getGroup(id: string): Promise<Group | null> {
    const { data, error } = await supabase
      .from("activity_groups")
      .select("*, category:categories(*)")
      .eq("id", id)
      .single();
    if (error || !data) return null;

    const { data: sessions } = await supabase
      .from("activities")
      .select(ACTIVITY_SELECT)
      .eq("group_id", id)
      .eq("status", "published")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at")
      .limit(5);

    const counts = await participationCounts((sessions ?? []).map((s) => s.id as string));

    return {
      ...(data as unknown as Group),
      member_count: 0,
      upcoming_sessions: (sessions ?? []).map((s) => mapActivityRow(s, counts[s.id as string] ?? 0)),
    };
  },

  async getMyPlans(): Promise<{
    hosted: Array<ActivitySummary & { also_participating: boolean }>;
    joined: ActivitySummary[];
  }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { hosted: [], joined: [] };

    const { data: hostedRows, error: hostedError } = await supabase
      .from("activities")
      .select(ACTIVITY_SELECT)
      .eq("host_user_id", user.id)
      .in("status", ["published", "draft", "completed"])
      .order("starts_at", { ascending: false });
    if (hostedError) throw new Error(hostedError.message);

    const { data: joinedParticipations, error: joinedError } = await supabase
      .from("participations")
      .select("activity_id")
      .eq("user_id", user.id)
      .in("status", ["confirmed", "attended", "no_show"]);
    if (joinedError) throw new Error(joinedError.message);

    const joinedIds = joinedParticipations?.map((p) => p.activity_id) ?? [];
    const participatingIds = new Set(joinedIds);
    const hostedIds = new Set((hostedRows ?? []).map((r) => r.id as string));

    let joinedRows: Record<string, unknown>[] = [];
    if (joinedIds.length) {
      const { data } = await supabase
        .from("activities")
        .select(ACTIVITY_SELECT)
        .in("id", joinedIds);
      joinedRows = (data ?? []).filter((r) => !hostedIds.has(r.id as string));
    }

    const allIds = [
      ...(hostedRows ?? []).map((r) => r.id as string),
      ...joinedRows.map((r) => r.id as string),
    ];
    const counts = await participationCounts(allIds);

    return {
      hosted: (hostedRows ?? []).map((r) => ({
        ...mapActivityRow(r, counts[r.id as string] ?? 0),
        also_participating:
          participatingIds.has(r.id as string) || Boolean(r.host_is_participating),
      })),
      joined: joinedRows.map((r) => mapActivityRow(r, counts[r.id as string] ?? 0)),
    };
  },

  async submitFeedback(activityId: string, sentiment: FeedbackSentiment) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const activity = await api.getActivity(activityId);
    if (!activity) throw new Error("Activity not found");
    if (activity.viewer_role !== "participant") {
      throw new Error("Only participants can leave feedback");
    }

    const { error } = await supabase.from("activity_feedback").upsert({
      activity_id: activityId,
      user_id: user.id,
      sentiment,
      rating: sentiment === "up" ? 5 : 1,
    });
    if (error) throw new Error(error.message);
  },

  async getAttendanceParticipants(activityId: string): Promise<AttendanceParticipant[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: activity } = await supabase
      .from("activities")
      .select("host_user_id")
      .eq("id", activityId)
      .single();
    if (!activity || activity.host_user_id !== user.id) {
      throw new Error("Only the host can view attendance");
    }

    const { data, error } = await supabase
      .from("participations")
      .select("user_id, status, user:profiles!participations_user_id_fkey(id, display_name, avatar_ref)")
      .eq("activity_id", activityId)
      .in("status", ["confirmed", "attended", "no_show"])
      .neq("user_id", activity.host_user_id);

    if (error) throw new Error(error.message);

    return (data ?? [])
      .map((row) => {
        const profile = Array.isArray(row.user) ? row.user[0] : row.user;
        if (!profile || !row.user_id) return null;
        return {
          user_id: row.user_id as string,
          display_name: profile.display_name as string,
          avatar_ref: profile.avatar_ref as string | null,
          status: row.status as AttendanceParticipant["status"],
        };
      })
      .filter(Boolean) as AttendanceParticipant[];
  },

  async markAttendance(activityId: string, marks: AttendanceMark[]) {
    const { data, error } = await supabase.rpc("mark_attendance", {
      p_activity_id: activityId,
      p_marks: marks,
    });
    if (error) throw new Error(error.message);
    return data as { attended_count: number; total_count: number };
  },

  async respondToAttendanceOutcome(activityId: string, accepted: boolean) {
    const { error } = await supabase.rpc("respond_to_attendance_outcome", {
      p_activity_id: activityId,
      p_accepted: accepted,
    });
    if (error) throw new Error(error.message);
  },

  async isAttendanceResolved(activityId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("activities")
      .select("attendance_resolved_at")
      .eq("id", activityId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return Boolean(data?.attendance_resolved_at);
  },

  async getPastActivity(id: string): Promise<PastActivityDetail | null> {
    const activity = await api.getActivity(id);
    if (!activity) return null;

    const { data: activityRow } = await supabase
      .from("activities")
      .select("attendance_resolved_at, status")
      .eq("id", id)
      .single();

    if (!activityRow?.attendance_resolved_at) return null;

    const hostUserId = activity.host.id;
    const { data: participationRows } = await supabase
      .from("participations")
      .select("status, user:profiles!participations_user_id_fkey(id, display_name, avatar_ref)")
      .eq("activity_id", id)
      .eq("status", "attended");

    const attendees = (participationRows ?? [])
      .map((row) => {
        const profile = Array.isArray(row.user) ? row.user[0] : row.user;
        if (!profile) return null;
        return {
          id: profile.id as string,
          display_name: profile.display_name as string,
          avatar_ref: profile.avatar_ref as string | null,
          is_host: profile.id === hostUserId,
        };
      })
      .filter(Boolean) as PastActivityDetail["attendees"];

    const hostInList = attendees.some((a) => a.id === hostUserId);
    if (!hostInList) {
      const { data: hostParticipation } = await supabase
        .from("participations")
        .select("id")
        .eq("activity_id", id)
        .eq("user_id", hostUserId)
        .eq("status", "attended")
        .maybeSingle();
      if (hostParticipation) {
        attendees.unshift({
          id: activity.host.id,
          display_name: activity.host.display_name,
          avatar_ref: activity.host.avatar_ref,
          is_host: true,
        });
      }
    }

    const { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .eq("activity_id", id)
      .maybeSingle();

    return {
      ...activity,
      attendance_resolved_at: (activityRow?.attendance_resolved_at as string | null) ?? null,
      attendees,
      chat_read_only: Boolean(conv),
    };
  },

  async getPendingAttendanceOutcome(activityId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from("participations")
      .select("id")
      .eq("activity_id", activityId)
      .eq("user_id", user.id)
      .eq("status", "no_show")
      .maybeSingle();

    if (!data) return false;

    const { data: dispute } = await supabase
      .from("attendance_disputes")
      .select("id")
      .eq("activity_id", activityId)
      .eq("user_id", user.id)
      .maybeSingle();

    return !dispute;
  },

  async getCategories() {
    const { data, error } = await supabase.from("categories").select("*").eq("is_active", true).order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async getNotifications(): Promise<AppNotification[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("notifications")
      .select(`
        *,
        activity:activities(id, title),
        actor:profiles!notifications_actor_user_id_fkey(id, display_name, avatar_ref)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);
    return (data ?? []) as AppNotification[];
  },

  async getUnreadNotificationCount(): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null);

    if (error) throw new Error(error.message);
    return count ?? 0;
  },

  async markNotificationRead(notificationId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (error) throw new Error(error.message);
  },

  async markAllNotificationsRead() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);

    if (error) throw new Error(error.message);
  },

  async processActivityLifecycle() {
    const { error } = await supabase.rpc("process_activity_lifecycle");
    if (error) console.warn("process_activity_lifecycle failed:", error.message);
  },
};
