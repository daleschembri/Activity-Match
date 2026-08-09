import { z } from "zod";
import {
  AcceptanceMode,
  ListingType,
  SkillLevel,
  SwipeDirection,
  Visibility,
} from "./enums";

export const geopointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const createActivitySchema = z
  .object({
    listing_type: z.enum([
      ListingType.CONFIRMED,
      ListingType.PROPOSED,
      ListingType.IDEA,
    ]),
    title: z.string().min(3).max(80),
    description: z.string().max(2000).default(""),
    category_id: z.string().uuid(),
    starts_at: z.string().datetime().optional(),
    duration_minutes: z.number().int().positive().optional(),
    location_id: z.string().uuid().optional(),
    capacity: z.number().int().min(2).max(200).optional(),
    quorum: z.number().int().min(2).max(100).optional(),
    cost_amount: z.number().min(0).multipleOf(0.01).default(0),
    cost_currency: z.string().length(3).default("EUR"),
    cost_note: z.string().max(200).optional(),
    skill_level: z
      .enum([
        SkillLevel.ANY,
        SkillLevel.BEGINNER,
        SkillLevel.INTERMEDIATE,
        SkillLevel.ADVANCED,
      ])
      .default(SkillLevel.ANY),
    equipment_note: z.string().max(500).optional(),
    equipment_provided: z.boolean().default(false),
    accessibility_note: z.string().max(500).optional(),
    min_age: z.number().int().min(16).max(120).optional(),
    max_age: z.number().int().min(16).max(120).optional(),
    join_deadline: z.string().datetime().optional(),
    acceptance_mode: z
      .enum([
        AcceptanceMode.AUTO,
        AcceptanceMode.APPROVAL,
        AcceptanceMode.INVITE_ONLY,
        AcceptanceMode.APPROVAL_WITH_QUESTIONS,
      ])
      .default(AcceptanceMode.AUTO),
    visibility: z
      .enum([Visibility.PUBLIC, Visibility.LINK_ONLY])
      .default(Visibility.PUBLIC),
    tag_ids: z.array(z.string().uuid()).max(12).default([]),
    host_is_participating: z.boolean().default(true),
    idempotency_key: z.string().min(8).max(128),
  })
  .superRefine((data, ctx) => {
    if (data.listing_type === ListingType.CONFIRMED) {
      if (!data.starts_at)
        ctx.addIssue({ code: "custom", message: "starts_at required", path: ["starts_at"] });
      if (!data.location_id)
        ctx.addIssue({ code: "custom", message: "location_id required", path: ["location_id"] });
      if (!data.capacity)
        ctx.addIssue({ code: "custom", message: "capacity required", path: ["capacity"] });
    }
    if (
      data.listing_type === ListingType.PROPOSED ||
      data.listing_type === ListingType.IDEA
    ) {
      if (!data.quorum)
        ctx.addIssue({ code: "custom", message: "quorum required", path: ["quorum"] });
    }
    if (
      data.acceptance_mode === AcceptanceMode.INVITE_ONLY &&
      data.visibility !== Visibility.LINK_ONLY
    ) {
      ctx.addIssue({
        code: "custom",
        message: "invite_only requires link_only visibility",
        path: ["visibility"],
      });
    }
  });

export const feedFiltersSchema = z.object({
  max_distance_minutes: z.number().int().min(5).max(120).optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  days_of_week: z.array(z.string()).optional(),
  time_of_day: z.array(z.enum(["morning", "afternoon", "evening", "night"])).optional(),
  max_cost: z.number().min(0).optional(),
  skill_levels: z.array(z.string()).optional(),
  listing_types: z.array(z.string()).optional(),
  categories: z.array(z.string().uuid()).optional(),
  recurrence: z.enum(["one_off", "recurring", "any"]).optional(),
  include_full: z.boolean().optional(),
});

export const swipeSchema = z.object({
  activity_id: z.string().uuid(),
  direction: z.enum([SwipeDirection.LEFT, SwipeDirection.RIGHT, SwipeDirection.UP]),
  position_in_feed: z.number().int().min(0),
  dwell_ms: z.number().int().min(0),
  idempotency_key: z.string().min(8).max(128),
});

export const joinRequestSchema = z.object({
  activity_id: z.string().uuid(),
  introduction: z.string().trim().min(1, "Write a message to the host").max(300),
  availability_confirmed: z.boolean(),
  screening_answers: z
    .array(z.object({ question_id: z.string().uuid(), answer: z.string().max(300) }))
    .optional(),
  idempotency_key: z.string().min(8).max(128),
});

export const draftFromTextSchema = z.object({
  free_text: z.string().min(1).max(1000),
  viewer_timezone: z.string(),
  viewer_location: geopointSchema,
});

export const onboardingInterestsSchema = z.object({
  category_ids: z.array(z.string().uuid()).min(1).max(10),
});

export const availabilitySlotSchema = z.object({
  day_of_week: z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
  time_start: z.string().regex(/^\d{2}:\d{2}$/),
  time_end: z.string().regex(/^\d{2}:\d{2}$/),
});

export const guestInterestSchema = z.object({
  public_slug: z.string().min(8),
  display_name: z.string().min(2).max(40),
  contact_ref: z.string().email().or(z.string().min(8)),
  verification_code: z.string().length(6).optional(),
});
