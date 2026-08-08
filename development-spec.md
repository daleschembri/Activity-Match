# Development Specification: Activity Discovery and Matching Platform

**Document type:** Technical specification for implementation
**Status:** Draft v1.0
**Scope:** MVP plus the structural hooks required for later phases

---

## 1. Purpose and scope of this document

This document defines **what** the system must do, in terms that are independent of any language, framework, database, hosting model or client platform. It defines entities, relationships, state machines, operations, business rules, permissions, background processes and acceptance criteria.

It deliberately does **not** specify: programming language, storage engine, transport protocol, authentication provider, hosting, push notification vendor, or client architecture. Any implementation satisfying the contracts below is conformant.

### 1.1 How to read the field tables

| Notation | Meaning |
|---|---|
| `id` | Opaque unique identifier. Format is an implementation choice, but must be non-sequential and non-guessable where exposed publicly. |
| `text` | Unicode string. Length limits given where they matter. |
| `enum(...)` | Closed set of values. Values are part of the contract. |
| `timestamp` | Absolute point in time. Stored in UTC. See [Section 16.2](#162-time-and-timezones). |
| `date`, `time` | Calendar date, wall-clock time. Interpreted in the activity's local timezone. |
| `decimal(n,2)` | Fixed-precision number, used for money. Never floating point for currency. |
| `geopoint` | Latitude and longitude pair. |
| `?` suffix | Nullable. |
| `[]` suffix | Ordered collection. |

---

## 2. Glossary

| Term | Definition |
|---|---|
| **Activity** | A single listing that people can join. May be a standalone one-off, or a session belonging to a group. |
| **Listing type** | Whether an activity is a confirmed plan, a proposed plan, or an idea. Determines which fields are required. |
| **Group** | A container for a recurring activity that generates sessions and has persistent membership. |
| **Session** | An activity that belongs to a group. |
| **Join request** | A user's expression of intent to take part in an activity. |
| **Participation** | An accepted, capacity-consuming place in an activity. |
| **Host** | The user who created an activity or group, or a user granted host rights on it. |
| **Guest** | A person interacting with an activity through a shared link without a full account. |
| **Capacity** | The maximum number of participations an activity can hold, inclusive of the host if the host is participating. |
| **Quorum** | The minimum number of participations required for a proposed plan or idea to become viable. |
| **Reliability record** | Aggregate counts of a user's attendances, late cancellations and no-shows. |

---

## 3. Domain model

### 3.1 Entity overview

```
User ──< JoinRequest >── Activity
 │                          │
 │                          ├──< Participation >── User
 │                          ├──< AvailabilityWindow
 │                          ├──< ScreeningQuestion ──< ScreeningAnswer
 │                          ├──< ActivityTag >── Tag
 │                          ├──── Location
 │                          ├──── Conversation ──< Message
 │                          └──? Group ──< GroupMembership >── User
 │
 ├──< UserInterest >── Category
 ├──< UserAvailability
 ├──── ReliabilityRecord
 ├──< SwipeEvent
 ├──< SavedActivity
 └──< Report
```

### 3.2 User

| Field | Type | Notes |
|---|---|---|
| `id` | `id` | |
| `display_name` | `text` | 2 to 40 characters |
| `avatar_ref` | `text?` | Reference to stored media |
| `bio` | `text?` | Max 300 characters |
| `home_location` | `geopoint` | Used for distance calculation |
| `home_area_label` | `text` | Coarse label shown publicly, for example "St Paul's Bay". Exact coordinates are never exposed. |
| `travel_radius_minutes` | `integer` | Default 20. Range 5 to 120. |
| `date_of_birth` | `date?` | Required only where an activity enforces age restrictions |
| `verification_status` | `enum(unverified, pending, verified)` | |
| `account_status` | `enum(active, suspended, deactivated, deleted)` | |
| `created_at` | `timestamp` | |
| `locale` | `text` | BCP 47 tag |
| `timezone` | `text` | IANA identifier |

**Rules**

- `home_location` is never returned by any operation to any actor other than the user themselves. Distance is computed server-side and returned as a derived value.
- A user in `suspended` state may read but not create, join, or send messages.
- Deletion is a soft delete. See [Section 16.6](#166-data-retention-and-deletion).

### 3.3 Activity

The central entity. A single shape covers all three listing types and both one-off and recurring cases, with conditional requirements.

| Field | Type | Notes |
|---|---|---|
| `id` | `id` | |
| `public_slug` | `text` | Non-guessable. Used in shared links. |
| `host_user_id` | `id` | |
| `group_id` | `id?` | Non-null when this activity is a session of a group |
| `listing_type` | `enum(confirmed, proposed, idea)` | |
| `title` | `text` | 3 to 80 characters |
| `description` | `text` | Max 2000 characters |
| `category_id` | `id` | |
| `starts_at` | `timestamp?` | Required when `listing_type = confirmed` |
| `duration_minutes` | `integer?` | |
| `location_id` | `id?` | Required when `listing_type = confirmed` |
| `capacity` | `integer?` | Required when `listing_type = confirmed`. Minimum 2. |
| `quorum` | `integer?` | Applies to `proposed` and `idea`. Minimum 2. |
| `cost_amount` | `decimal(10,2)` | Zero means free |
| `cost_currency` | `text` | ISO 4217 |
| `cost_note` | `text?` | For example "paid at the venue" |
| `skill_level` | `enum(any, beginner, intermediate, advanced)` | |
| `equipment_note` | `text?` | |
| `equipment_provided` | `boolean` | |
| `accessibility_note` | `text?` | |
| `min_age` | `integer?` | |
| `max_age` | `integer?` | |
| `join_deadline` | `timestamp?` | Must be at or before `starts_at` |
| `acceptance_mode` | `enum(auto, approval, invite_only, approval_with_questions)` | |
| `visibility` | `enum(public, link_only)` | `invite_only` acceptance forces `link_only` |
| `status` | `enum(draft, published, cancelled, completed, expired)` | See [Section 4.1](#41-activity-lifecycle) |
| `cancelled_reason` | `text?` | |
| `created_at`, `updated_at` | `timestamp` | |

**Derived values (computed, never stored as source of truth)**

| Value | Definition |
|---|---|
| `participation_count` | Count of participations in `confirmed` state |
| `spaces_remaining` | `capacity - participation_count`, floored at 0 |
| `is_full` | `spaces_remaining = 0` |
| `is_joinable` | `status = published` and not full and `join_deadline` not passed |
| `distance_from_viewer` | Computed per request against the viewer's `home_location` |

**Conditional requirements by listing type**

| Field | `confirmed` | `proposed` | `idea` |
|---|---|---|---|
| `starts_at` | Required | Forbidden | Forbidden |
| `location_id` | Required | Optional (area only) | Optional (area only) |
| `capacity` | Required | Optional | Optional |
| `quorum` | Forbidden | Required | Required |
| `AvailabilityWindow[]` | Forbidden | At least one required | Optional |
| `join_deadline` | Optional | Forbidden | Forbidden |

**Rules**

- An activity may not be edited into a different `listing_type` except through the promotion operations in [Section 5.6](#56-promotion-operations).
- Reducing `capacity` below `participation_count` is rejected.
- Any change to `starts_at` or `location_id` on a published activity triggers a change notification to all confirmed participants and posts a system message.

### 3.4 Location

| Field | Type | Notes |
|---|---|---|
| `id` | `id` | |
| `name` | `text` | Venue or meeting point name |
| `address_line` | `text?` | Disclosed only to confirmed participants |
| `area_label` | `text` | Coarse public label |
| `point` | `geopoint` | |
| `is_public_place` | `boolean` | Used by safety checks. See [Section 13.3](#133-listing-risk-checks). |
| `timezone` | `text` | IANA identifier. Authoritative for interpreting the activity's local time. |

### 3.5 Group

| Field | Type | Notes |
|---|---|---|
| `id` | `id` | |
| `owner_user_id` | `id` | |
| `name` | `text` | 3 to 60 characters |
| `description` | `text?` | |
| `category_id` | `id` | |
| `frequency` | `enum(weekly, fortnightly, monthly, irregular)` | |
| `preferred_days` | `enum(mon..sun)[]` | |
| `preferred_time_start`, `preferred_time_end` | `time?` | |
| `default_location_id` | `id?` | |
| `target_size` | `integer?` | |
| `skill_level` | `enum(any, beginner, intermediate, advanced)` | |
| `attendance_mode` | `enum(fixed, flexible)` | `fixed` means members are auto-added to each session |
| `membership_state` | `enum(open, approval, closed)` | |
| `chat_persists_between_sessions` | `boolean` | |
| `status` | `enum(active, dormant, archived)` | |

**Rules**

- Sessions inherit group defaults at creation time. Once created, a session is independently editable and does not re-inherit later group changes.
- When `attendance_mode = fixed`, creating a session automatically creates confirmed participations for all active members, each of which the member may cancel.
- When `attendance_mode = flexible`, members receive a session notification and opt in.

### 3.6 GroupMembership

| Field | Type | Notes |
|---|---|---|
| `id`, `group_id`, `user_id` | `id` | |
| `role` | `enum(owner, host, member)` | |
| `status` | `enum(active, pending, left, removed)` | |
| `joined_at` | `timestamp` | |

### 3.7 JoinRequest

| Field | Type | Notes |
|---|---|---|
| `id`, `activity_id`, `user_id` | `id` | |
| `guest_id` | `id?` | Set instead of `user_id` for guest requests |
| `intent` | `enum(join, interest)` | `join` for confirmed activities, `interest` for proposed and ideas |
| `status` | `enum(pending, accepted, declined, waitlisted, withdrawn, expired)` | |
| `introduction` | `text?` | Max 300 characters |
| `availability_confirmed` | `boolean` | Whether the requester confirmed they can make the stated time |
| `waitlist_position` | `integer?` | Set when `waitlisted` |
| `claim_expires_at` | `timestamp?` | Set when a waitlisted request is offered a place |
| `source` | `enum(swipe, detail, share_link, invite)` | Analytics and ranking signal |
| `created_at`, `resolved_at` | `timestamp` | |

**Rules**

- One active join request per user per activity. Re-requesting after `withdrawn` or `declined` is allowed only if the host has not blocked the user, and is rate limited to one retry.
- A join request cannot be created against an activity where `is_joinable` is false, except as a waitlist entry when the activity is full.

### 3.8 Participation

Created when a join request is accepted. This is the capacity-consuming record.

| Field | Type | Notes |
|---|---|---|
| `id`, `activity_id`, `user_id` | `id` | |
| `guest_id` | `id?` | |
| `status` | `enum(confirmed, cancelled_by_user, removed_by_host, attended, no_show)` | |
| `attendance_confirmed_at` | `timestamp?` | The user's pre-event confirmation |
| `cancelled_at` | `timestamp?` | |
| `is_late_cancellation` | `boolean` | Derived at cancellation time. See [Section 6.5](#65-cancellation-and-no-show-rules). |
| `created_at` | `timestamp` | |

### 3.9 AvailabilityWindow

Used by proposed plans and ideas to express when the activity could happen.

| Field | Type | Notes |
|---|---|---|
| `id`, `activity_id` | `id` | |
| `day_of_week` | `enum(mon..sun)?` | Null when using an absolute date |
| `date` | `date?` | Null when using a recurring day |
| `time_start`, `time_end` | `time` | |

### 3.10 UserAvailability

The user's general availability, captured at onboarding and editable.

| Field | Type |
|---|---|
| `id`, `user_id` | `id` |
| `day_of_week` | `enum(mon..sun)` |
| `time_start`, `time_end` | `time` |

### 3.11 Category and Tag

| Entity | Fields | Notes |
|---|---|---|
| `Category` | `id`, `name`, `parent_id?`, `is_active` | Closed, curated set. Used for hard filtering and cold start. |
| `Tag` | `id`, `label`, `is_system`, `usage_count` | Open set. Generated by extraction, editable by hosts, used for adjacency. |
| `ActivityTag` | `activity_id`, `tag_id`, `origin: enum(suggested, host_added)` | |
| `UserInterest` | `user_id`, `category_id`, `weight: decimal` | Weight starts at onboarding value and is updated by behaviour |

**Rule:** every activity must resolve to exactly one category. Tags are unlimited but capped at 12 per activity.

### 3.12 Conversation and Message

| Field | Type | Notes |
|---|---|---|
| `Conversation.id`, `.activity_id?`, `.group_id?` | `id` | Exactly one of the two is non-null |
| `Conversation.status` | `enum(active, archived, locked)` | |
| `Message.id`, `.conversation_id`, `.sender_user_id?` | `id` | Null sender indicates a system message |
| `Message.type` | `enum(user_text, user_media, system, poll)` | |
| `Message.body` | `text` | |
| `Message.payload` | structured | Type-dependent. See [Section 9.3](#93-system-message-catalogue). |
| `Message.created_at`, `.edited_at?`, `.deleted_at?` | `timestamp` | |

### 3.13 ReliabilityRecord

Maintained per user, updated by background jobs. Never edited directly.

| Field | Type |
|---|---|
| `user_id` | `id` |
| `attended_count` | `integer` |
| `late_cancellation_count` | `integer` |
| `no_show_count` | `integer` |
| `hosted_count` | `integer` |
| `hosted_cancelled_count` | `integer` |
| `last_recalculated_at` | `timestamp` |

**Rule:** this is exposed publicly as raw counts, never as a computed score or rating out of ten. See [Section 13.5](#135-reliability-display-rules).

### 3.14 Guest

| Field | Type | Notes |
|---|---|---|
| `id` | `id` | |
| `display_name` | `text` | |
| `contact_ref` | `text` | Verified phone number or email, stored hashed where used only for matching |
| `verified_at` | `timestamp` | |
| `converted_user_id` | `id?` | Set when the guest later registers |

### 3.15 SwipeEvent

| Field | Type |
|---|---|
| `id`, `user_id`, `activity_id` | `id` |
| `direction` | `enum(left, right, up)` |
| `position_in_feed` | `integer` |
| `dwell_ms` | `integer` |
| `created_at` | `timestamp` |

### 3.16 Report

| Field | Type |
|---|---|
| `id`, `reporter_user_id` | `id` |
| `target_type` | `enum(user, activity, message, group)` |
| `target_id` | `id` |
| `reason` | `enum(inappropriate_content, dating_solicitation, harassment, spam, unsafe, other)` |
| `detail` | `text?` |
| `status` | `enum(open, reviewing, actioned, dismissed)` |

---

## 4. State machines

### 4.1 Activity lifecycle

```
draft ──publish──> published ──┬──cancel────> cancelled
                               ├──complete──> completed
                               └──expire────> expired
```

| Transition | Trigger | Guard |
|---|---|---|
| `draft → published` | Host publishes | All conditionally required fields present |
| `published → cancelled` | Host cancels | Any time before `completed` |
| `published → completed` | Background job | `starts_at + duration` has passed and at least one participation existed |
| `published → expired` | Background job | Deadline or start time passed with no viable participation, or a proposed plan or idea reached its expiry horizon without quorum |
| `cancelled → *` | None | Terminal |
| `completed → *` | None | Terminal |

**Rules**

- Cancelling a published activity with confirmed participants requires a reason and notifies all participants immediately.
- A cancellation less than 24 hours before `starts_at` increments the host's `hosted_cancelled_count`.
- Expired and completed activities are removed from all discovery surfaces but remain readable to past participants.

### 4.2 JoinRequest lifecycle

```
                 ┌──accept───> accepted
pending ─────────┼──decline──> declined
                 ├──waitlist─> waitlisted ──offer──> waitlisted(claim window)
                 └──withdraw─> withdrawn                │
                                                        ├──claim──> accepted
                                                        └──lapse──> expired
```

| Transition | Actor | Effect |
|---|---|---|
| `→ pending` | Requester | Created. Host notified. |
| `pending → accepted` | Host, or system under `auto` mode | Creates a `Participation`, adds user to conversation, notifies requester |
| `pending → declined` | Host | Notifies requester. No reason is required or exposed. |
| `pending → waitlisted` | Host, or system when activity is full | Assigns `waitlist_position` |
| `waitlisted → accepted` | Requester claims an offered place within the window | Atomic capacity check applies |
| `waitlisted → expired` | Background job | Claim window lapsed. Offer passes to the next position. |
| `pending → withdrawn` | Requester | |

### 4.3 Participation lifecycle

```
confirmed ──┬──user cancels──────> cancelled_by_user
            ├──host removes──────> removed_by_host
            ├──marked present────> attended
            └──marked absent─────> no_show
```

Attendance outcome is set after the activity completes, by the process in [Section 6.6](#66-attendance-resolution).

### 4.4 Group lifecycle

```
active ──no session for N days──> dormant ──owner archives──> archived
   ^                                  │
   └────────new session created───────┘
```

`N` is configurable, default 90 days.

---

## 5. Operations

Operations are described as abstract contracts. Each has an actor, inputs, preconditions, effects and error conditions. Transport, naming convention and payload shape are implementation choices.

### 5.1 Discovery

**`getFeed`**

| Aspect | Definition |
|---|---|
| Actor | Authenticated user |
| Inputs | `filters?`, `cursor?`, `limit` (default 20, max 50) |
| Preconditions | Actor is `active` |
| Effects | Records feed impressions for shown activities |
| Returns | Ordered activity summaries, `next_cursor`, `total_available` |
| Errors | `RATE_LIMITED` |

Filter inputs: `max_distance_minutes`, `date_from`, `date_to`, `days_of_week[]`, `time_of_day[]`, `max_cost`, `skill_levels[]`, `listing_types[]`, `categories[]`, `recurrence` (`one_off`, `recurring`, `any`).

Ranking is defined in [Section 7](#7-discovery-and-ranking).

**`recordSwipe`**

| Aspect | Definition |
|---|---|
| Inputs | `activity_id`, `direction`, `position_in_feed`, `dwell_ms` |
| Effects | Persists a `SwipeEvent`. On `right`, additionally invokes `createJoinRequest`. On `up`, creates a `SavedActivity`. |
| Idempotency | Repeated swipes on the same activity by the same user are collapsed to the latest |

**`getActivity`**

Returns full detail. Field visibility varies by the viewer's relationship to the activity. See [Section 8](#8-permissions-and-field-visibility).

### 5.2 Activity creation

**`draftActivityFromText`**

| Aspect | Definition |
|---|---|
| Inputs | `free_text` (max 1000 characters), `viewer_timezone`, `viewer_location` |
| Effects | None. Pure transformation. |
| Returns | A partial activity with a per-field `confidence` and `origin: enum(extracted, inferred, default, missing)`, plus suggested tags and a resolved category |
| Errors | `EXTRACTION_UNAVAILABLE` (client must fall back to the manual form) |

**Contract for the extraction component**

This is deliberately abstracted so it can be a language model, a rules engine, or a human. It must satisfy:

1. It never returns a value with `origin: extracted` unless the value is present in the input text.
2. It never returns `location`, `capacity` or `cost` as `extracted` unless explicitly stated. Anything else is `inferred` or `missing`.
3. Relative dates are resolved against the caller's timezone and the current time.
4. It returns exactly one category from the active category set.
5. It returns between 3 and 8 tags.
6. It returns within a bounded time. If it cannot, the client proceeds with an empty draft.

**`createActivity`**

| Aspect | Definition |
|---|---|
| Inputs | Full activity payload, `idempotency_key` |
| Preconditions | Actor is `active`; payload passes conditional requirements; rate limit not exceeded |
| Effects | Creates activity in `draft`, creates the conversation, creates activity tags |
| Errors | `VALIDATION_FAILED`, `RATE_LIMITED`, `QUOTA_EXCEEDED` |

**`publishActivity`**, **`updateActivity`**, **`cancelActivity`** follow the state machine in [Section 4.1](#41-activity-lifecycle).

### 5.3 Joining

**`createJoinRequest`**

| Aspect | Definition |
|---|---|
| Inputs | `activity_id`, `introduction?`, `screening_answers[]?`, `availability_confirmed`, `idempotency_key` |
| Preconditions | Activity is `published`; actor is not the host; actor is not blocked by the host; no active request exists; age restrictions satisfied; screening answers present when `acceptance_mode = approval_with_questions` |
| Effects | Under `auto`, attempts atomic acceptance. Otherwise creates a `pending` request. If the activity is full, creates a `waitlisted` request. |
| Returns | The request with its resulting status |
| Errors | `ACTIVITY_NOT_JOINABLE`, `ALREADY_REQUESTED`, `AGE_RESTRICTED`, `SCREENING_REQUIRED`, `BLOCKED`, `DEADLINE_PASSED` |

**`respondToJoinRequest`**

| Aspect | Definition |
|---|---|
| Actor | Host of the activity |
| Inputs | `request_id`, `decision: enum(accept, decline, waitlist)` |
| Preconditions | Request is `pending` or `waitlisted`; on accept, capacity is available |
| Effects | Per [Section 4.2](#42-joinrequest-lifecycle) |
| Errors | `ACTIVITY_FULL`, `NOT_HOST`, `INVALID_STATE` |

**`withdrawJoinRequest`**, **`claimWaitlistOffer`**, **`cancelParticipation`**, **`removeParticipant`** follow the state machines above.

### 5.4 Capacity, concurrency and idempotency

This is the highest-risk area of the system and must be specified explicitly.

**Requirements**

1. **Acceptance must be atomic with respect to capacity.** Two concurrent accepts on the last remaining place must result in exactly one success and one `ACTIVITY_FULL`. Any mechanism achieving this is acceptable: a serialisable transaction, a conditional write, a row lock, a queue with a single consumer per activity, or an append-only ledger with a compaction step.
2. **No overselling under any circumstance.** `participation_count` may never exceed `capacity`.
3. **All mutating operations accept an idempotency key.** Replaying the same key returns the original result without repeating side effects. Keys expire after 24 hours.
4. **Side effects are at-least-once and must be idempotent.** Notifications, system messages and chat membership changes must tolerate replay without duplicating user-visible output.
5. **Capacity is released immediately** on cancellation or removal, and the waitlist offer process is triggered synchronously or near-synchronously.

### 5.5 Guest access

**`resolvePublicActivity`**

| Aspect | Definition |
|---|---|
| Actor | Anonymous |
| Inputs | `public_slug` |
| Returns | Public field set only. See [Section 8.2](#82-field-visibility-matrix). |
| Rate limit | Per source address, to prevent slug enumeration |

**`createGuestInterest`**

| Aspect | Definition |
|---|---|
| Actor | Anonymous, then verified guest |
| Inputs | `public_slug`, `display_name`, `contact_ref`, `verification_code` |
| Preconditions | Contact verified within this flow; activity is joinable; activity `visibility` permits link access |
| Effects | Creates or reuses a `Guest`, creates a `JoinRequest` with `source = share_link` |
| Errors | `VERIFICATION_FAILED`, `ACTIVITY_NOT_JOINABLE` |

**Guest constraints**

- A guest may hold participations, receive activity updates and read the activity conversation.
- A guest may **not** post in the conversation, create activities, host, or appear in discovery.
- Guest access is scoped to the specific activities they joined. There is no global guest session across unrelated activities.
- Guest tokens expire 7 days after the activity completes.
- On registration with a matching `contact_ref`, all guest records are merged into the new user and `converted_user_id` is set.

### 5.6 Promotion operations

**`promoteProposalToConfirmed`**

| Aspect | Definition |
|---|---|
| Actor | Host of a `proposed` activity |
| Inputs | `activity_id`, `starts_at`, `location_id`, `capacity`, `join_deadline?` |
| Preconditions | Activity is `published` and `listing_type = proposed` |
| Effects | Sets `listing_type = confirmed`, converts all `interest` requests to `pending` (or accepts them under `auto`), notifies all interested users, posts a system message |

**`createFirstSessionFromIdea`**

| Aspect | Definition |
|---|---|
| Actor | Host of an `idea` activity |
| Preconditions | Interest count is at or above `quorum` |
| Effects | Creates a `Group`, creates a first session as a `confirmed` activity, converts interested users to group members, migrates the conversation to the group |

**`repeatActivity`**

| Aspect | Definition |
|---|---|
| Actor | Host of a `completed` activity |
| Inputs | `activity_id`, `starts_at`, `invite_previous_participants: boolean` |
| Effects | Creates a new activity copying all fields except timing and status. When inviting, creates `pending` requests pre-accepted for previous attendees, or direct participations if the host chooses. |

---

## 6. Business rules

### 6.1 Capacity

- `capacity` counts participations in `confirmed` state only.
- The host occupies a place if and only if the host is a participant. The client must make this explicit at creation time ("Are you playing too?").
- `capacity` may be increased at any time. It may be decreased only to a value at or above `participation_count`.

### 6.2 Join deadlines

- Default `join_deadline` when unspecified: `starts_at`.
- Once passed, no new join requests may be created, and pending requests are auto-expired.
- Waitlist claims already offered remain valid until their claim window closes, even past the deadline.

### 6.3 Waitlist

- Ordering is by `created_at` ascending. Position is recomputed whenever an entry leaves the waitlist.
- When a place opens, the system offers it to position 1 with a claim window.
- Default claim window: `min(2 hours, 25% of the time remaining until starts_at)`, floored at 15 minutes.
- If the window lapses, the offer passes to the next position and the lapsed request is marked `expired`.
- If the waitlist empties without the place being claimed, the activity returns to open state and re-enters discovery.

### 6.4 Acceptance modes

| Mode | Behaviour |
|---|---|
| `auto` | Requests are accepted immediately, subject to the atomic capacity check, until full. Subsequent requests become waitlist entries. |
| `approval` | Requests enter `pending`. The host must act. |
| `invite_only` | Activity is not in discovery. Requests may only originate from `source = invite` or `share_link`. |
| `approval_with_questions` | As `approval`, but the request is rejected unless all required screening answers are provided. Maximum 3 questions, each max 120 characters. |

**Rule:** a host may change acceptance mode on a published activity. Pending requests are unaffected by the change. Changing to `auto` does not retroactively accept anyone.

### 6.5 Cancellation and no-show rules

| Event | Definition | Consequence |
|---|---|---|
| Early cancellation | Participant cancels more than 12 hours before `starts_at` | No reliability consequence |
| Late cancellation | Participant cancels within 12 hours of `starts_at` | Increments `late_cancellation_count` |
| No-show | Participant does not cancel and is not marked attended | Increments `no_show_count` |
| Host cancellation | Host cancels the activity within 24 hours of `starts_at` | Increments `hosted_cancelled_count` |

The 12 and 24 hour thresholds are configuration, not constants in code.

### 6.6 Attendance resolution

Runs after `starts_at + duration + grace_period` (default grace 2 hours).

1. Participations with `attendance_confirmed_at` set and no contrary signal are marked `attended`.
2. The host is prompted once to correct the attendance list within 48 hours.
3. Participations neither confirmed nor corrected are marked `attended` by default, not `no_show`.
4. A `no_show` may only be set by explicit host action, and the affected user is notified and may dispute it.

**Rationale:** false no-show marks are far more damaging than missed ones, because reliability data is publicly visible and effectively permanent.

### 6.7 Age restrictions

- If `min_age` or `max_age` is set, a join request from a user without `date_of_birth` is rejected with `AGE_RESTRICTED` and a prompt to add it.
- Date of birth is never exposed to hosts. Only a pass or fail is evaluated server-side.

### 6.8 Quotas and rate limits

Values are configuration. Suggested MVP defaults:

| Action | Limit |
|---|---|
| Activities created | 10 per user per rolling 7 days |
| Join requests | 30 per user per rolling 24 hours |
| Messages | 60 per user per conversation per hour |
| Reports | 10 per user per rolling 24 hours |
| Public slug resolution | 60 per source address per hour |
| Guest verification attempts | 5 per contact per hour |

---

## 7. Discovery and ranking

### 7.1 Pipeline

```
Candidate set → Hard filters → Eligibility filters → Scoring → Diversity pass → Page
```

### 7.2 Hard filters (exclusion, non-negotiable)

An activity is excluded if any of the following is true:

- `status != published`
- `visibility != public`
- `is_joinable = false`
- The viewer is the host
- The viewer has an active join request or participation on it
- The viewer swiped left on it within the suppression window (default 30 days)
- The viewer has blocked the host, or the host has blocked the viewer
- Travel time exceeds the viewer's `travel_radius_minutes`
- Age restrictions exclude the viewer
- Any active filter in the request excludes it

### 7.3 Scoring

All components normalise to the range 0 to 1. Weights are configuration.

```
score = w1 · category_affinity
      + w2 · tag_affinity
      + w3 · proximity
      + w4 · time_fit
      + w5 · urgency
      + w6 · host_reliability
      + w7 · social_proof
      - w8 · recency_penalty
```

| Component | Definition |
|---|---|
| `category_affinity` | Viewer's `UserInterest.weight` for the activity's category |
| `tag_affinity` | Overlap between the activity's tags and tags on activities the viewer has previously right-swiped or attended |
| `proximity` | `1 - (travel_time / travel_radius)` |
| `time_fit` | Overlap between the activity's start time and the viewer's `UserAvailability` |
| `urgency` | `deadline_proximity × (spaces_remaining / capacity)`. Peaks for activities that are soon and still short. |
| `host_reliability` | Derived from the host's record, with a neutral default for new hosts |
| `social_proof` | Shared groups, past co-attendance, or mutual participation with confirmed participants |
| `recency_penalty` | Number of times shown to this viewer without action |

**New activity boost:** activities published within the last 24 hours receive a fixed score uplift. Without this, new supply is never seen and hosts churn. This is a required behaviour, not an optimisation.

### 7.4 Exploration and diversity pass

After scoring, the page is assembled to a target composition:

| Bucket | Share | Definition |
|---|---|---|
| Familiar | 70% | Categories the viewer has engaged with |
| Adjacent | 20% | Categories linked to the viewer's categories by an adjacency map |
| Wildcard | 10% | Neither, selected by local popularity |

Additional constraints on any single page:

- No more than 3 activities from the same host
- No more than 5 from the same category
- At least 1 `proposed` or `idea` listing where any exist, so that the non-confirmed listing types remain discoverable

The adjacency map is a static, curated category-to-category relation in the MVP. It becomes learned in a later phase. Example: board games relates to quiz nights, escape rooms, tabletop roleplaying, puzzle events and social cafés.

### 7.5 Cold start

| Case | Behaviour |
|---|---|
| New user | Rank by `proximity`, `time_fit` and local popularity, filtered to onboarding-selected categories. All affinity weights default to neutral. |
| New activity | Receives the publication boost and guaranteed impressions for its first 24 hours. |
| Thin result set | Progressively relax in this order: travel radius, then time of day, then day of week, then category. Never relax age, capacity or block filters. The client must state that filters were widened. |

### 7.6 Feed exhaustion

When the candidate set is exhausted, the response signals exhaustion explicitly and the client presents three actions: widen filters, save an alert, create an activity. The feed is finite by design and must not pad with irrelevant results.

---

## 8. Permissions and field visibility

### 8.1 Actor roles relative to an activity

| Role | Definition |
|---|---|
| Anonymous | No session |
| Guest | Verified guest with a scoped token |
| Viewer | Authenticated user with no relationship to the activity |
| Requester | Has a `pending` or `waitlisted` request |
| Participant | Has a `confirmed` participation |
| Host | Created the activity, or holds host role on its group |
| Moderator | Platform staff role |

### 8.2 Field visibility matrix

| Field | Anonymous | Viewer | Requester | Participant | Host |
|---|---|---|---|---|---|
| Title, description, category, tags | Yes | Yes | Yes | Yes | Yes |
| Date, time, cost, skill level | Yes | Yes | Yes | Yes | Yes |
| `area_label`, distance | Yes | Yes | Yes | Yes | Yes |
| `address_line`, exact `point` | No | No | No | Yes | Yes |
| Capacity and spaces remaining | Yes | Yes | Yes | Yes | Yes |
| Participant identities | No | Count only | Count only | Yes | Yes |
| Host public profile | Yes | Yes | Yes | Yes | Yes |
| Host reliability counts | Yes | Yes | Yes | Yes | Yes |
| Public questions and answers | Yes | Yes | Yes | Yes | Yes |
| Other requesters' identities | No | No | No | No | Yes |
| Requester introductions and answers | No | No | Own only | Own only | Yes |
| Conversation messages | No | No | No | Yes | Yes |

### 8.3 Prohibited capabilities

These must not exist in any operation, at any permission level. They are structural product commitments, not preferences.

- Listing, searching, browsing or filtering users independently of an activity.
- Initiating a private one-to-one conversation with a user with whom you share no activity.
- Any messaging channel between a requester and a host before acceptance, other than the scoped host-initiated question thread and public Q&A.
- Exposing any user's exact location, contact details, or date of birth to any other user.

---

## 9. Conversations

### 9.1 Creation and membership

- A conversation is created with its activity, before publication.
- Membership is derived from participations, not managed independently. Accepting a request adds the user. Cancellation or removal removes them.
- A removed user retains read access to messages sent before their removal, and loses write access immediately.

### 9.2 Lifecycle

| Activity state | Conversation state |
|---|---|
| `published` | `active` |
| `completed`, one-off | `archived` after 7 days: read-only, retrievable |
| `completed`, group session with `chat_persists_between_sessions = true` | Merges into the group conversation |
| `cancelled` | `locked` immediately, read-only |

### 9.3 System message catalogue

System messages are posted automatically. Each has a stable type so clients can render them distinctly and so they can be localised.

| Type | Trigger | Payload |
|---|---|---|
| `activity_published` | Publication | Activity summary |
| `participant_joined` | Participation created | User reference |
| `participant_left` | Participation cancelled or removed | User reference, reason class |
| `capacity_reached` | Spaces reach zero | |
| `spaces_available` | Spaces return above zero | Count |
| `details_changed` | Time, location or cost changed | Field, old value, new value |
| `deadline_reminder` | Configurable interval before `join_deadline` | Deadline, spaces remaining |
| `attendance_request` | Configurable interval before `starts_at` | Confirmation deadline |
| `activity_cancelled` | Host cancels | Reason |
| `feedback_prompt` | After completion | |

Example rendering of `deadline_reminder`:

> Padel tomorrow at 19:00. Location: [venue]. Fee: €8. Two spaces remain. Please confirm attendance by 17:00.

### 9.4 Polls

- Any participant may create a poll. Maximum 6 options, single or multiple choice.
- Results are visible to all participants. Votes are attributed.
- Polls are informational. They never mutate activity state automatically.

---

## 10. Notifications

Delivery channel is an implementation choice. The contract is the event catalogue, the recipient rule, and the user's control over each.

| Event | Recipients | Default | User-controllable |
|---|---|---|---|
| Join request received | Host | On | Yes |
| Request accepted | Requester | On | No |
| Request declined | Requester | On | Yes |
| Waitlist place offered | Requester | On | No |
| Waitlist offer expiring | Requester | On | No |
| Activity details changed | Participants | On | No |
| Activity cancelled | Participants and requesters | On | No |
| Attendance confirmation due | Participants | On | Yes |
| New message | Conversation members | On | Yes, per conversation |
| Join deadline approaching, activity not full | Host | On | Yes |
| Activity matching a saved alert | Alert owner | Off | Yes |
| Post-activity feedback prompt | Participants | On | Yes |
| Group session created | Group members | On | Yes |

**Rules**

- Notifications that materially affect a user's plans (`accepted`, `cancelled`, `details_changed`, `waitlist_offered`) are not suppressible.
- Message notifications are batched with a minimum interval, default 60 seconds, to avoid group chat flooding.
- Every notification carries a deep link target identifying the entity, so clients can route without parsing text.

---

## 11. Background processes

All are idempotent and safe to re-run. Each defines a trigger and a guard so that duplicate execution produces no duplicate side effects.

| Process | Cadence | Responsibility |
|---|---|---|
| Activity expiry | Every 15 minutes | Transition past-deadline and past-start activities to `expired` or `completed` |
| Waitlist offer | Event-driven, plus every 5 minutes as a safety net | Offer open places, expire lapsed claims, advance the queue |
| Deadline reminders | Every 15 minutes | Post system messages and notifications at configured offsets |
| Attendance prompts | Every 15 minutes | Request confirmation ahead of `starts_at` |
| Attendance resolution | Hourly | Apply the rules in [Section 6.6](#66-attendance-resolution) |
| Reliability recalculation | Hourly, or event-driven | Update `ReliabilityRecord` |
| Session generation | Daily | Create upcoming sessions for active groups per their frequency |
| Quorum evaluation | Hourly | Notify hosts of proposals and ideas that have reached quorum |
| Group dormancy | Daily | Mark groups dormant after the inactivity threshold |
| Guest token expiry | Daily | Revoke expired guest access |
| Interest weight decay | Weekly | Decay `UserInterest.weight` towards neutral so stale interests fade |

---

## 12. Validation and error contract

### 12.1 Error shape

Every failed operation returns a stable machine-readable `code`, a human-readable `message`, and where applicable a `field` and `details` object. Clients branch on `code` only. Messages are for display and may change.

### 12.2 Error codes

| Code | Meaning |
|---|---|
| `VALIDATION_FAILED` | One or more fields failed validation. `details` lists them. |
| `NOT_FOUND` | Entity does not exist or the actor may not know that it exists |
| `NOT_PERMITTED` | Actor lacks the required role |
| `INVALID_STATE` | Operation is not valid for the entity's current state |
| `ACTIVITY_FULL` | No capacity available |
| `ACTIVITY_NOT_JOINABLE` | Not published, cancelled, expired, or past deadline |
| `DEADLINE_PASSED` | Join deadline has passed |
| `ALREADY_REQUESTED` | An active request already exists |
| `AGE_RESTRICTED` | Actor does not meet the age requirement |
| `SCREENING_REQUIRED` | Required screening answers missing |
| `BLOCKED` | A block relationship prevents the action |
| `RATE_LIMITED` | Rate limit exceeded. Includes `retry_after`. |
| `QUOTA_EXCEEDED` | Plan or free-tier quota exceeded |
| `VERIFICATION_FAILED` | Guest contact verification failed |
| `EXTRACTION_UNAVAILABLE` | Structure extraction could not complete |
| `CONFLICT` | Concurrent modification. Client should refetch and retry. |

### 12.3 Validation rules

| Field | Rule |
|---|---|
| `title` | 3 to 80 characters, no URLs, no contact details |
| `description` | Max 2000 characters, no contact details, no external booking links in the MVP |
| `starts_at` | Must be in the future at publication, and within 12 months |
| `join_deadline` | Must be at or before `starts_at` and after now |
| `capacity` | Integer 2 to 200 |
| `quorum` | Integer 2 to 100, and at or below `capacity` where both are set |
| `cost_amount` | Zero or positive, max 2 decimal places |
| `min_age`, `max_age` | 16 to 120; `min_age` at or below `max_age` |
| Tags | 0 to 12, each 2 to 30 characters |
| Screening questions | 0 to 3, each 5 to 120 characters |

**Contact detail stripping:** phone numbers, email addresses and external messaging handles must be detected and rejected in `title`, `description`, `bio` and `introduction`. This enforces the no-personal-contact-details principle. Detection is best-effort; false negatives are handled by reporting.

---

## 13. Safety, trust and moderation

### 13.1 Structural safeguards

These are enforced by the model, not by policy text:

- No user browsing outside activities ([Section 8.3](#83-prohibited-capabilities))
- No pre-acceptance private messaging
- No exposure of exact location or contact details
- Group-first defaults

### 13.2 Blocking

- A block is unidirectional in intent and bidirectional in effect: neither party sees the other's activities, and neither may request to join the other's.
- Blocking a user with whom you share a current activity does not remove either party from that activity. It is escalated to the host as a signal, and the blocker is offered cancellation without a late-cancellation penalty.

### 13.3 Listing risk checks

Applied at publication and flagged for review rather than blocked outright:

| Check | Condition |
|---|---|
| Low capacity | `capacity = 2` |
| Non-public location | `is_public_place = false` |
| Late hour | `starts_at` local time between 23:00 and 05:00 |
| Dating language | Description or title matches dating solicitation patterns |
| Age gating | Both age bounds set narrowly |

An activity triggering low capacity or non-public location requires an explicit public meeting point and displays safety guidance to requesters before they join.

### 13.4 Reporting and moderation

- Any user may report a user, activity, message or group.
- Reports of `unsafe` or `harassment` are prioritised and must have a defined response time target.
- Moderator actions: dismiss, warn, remove content, unpublish activity, suspend user, ban user.
- Every moderator action writes to an immutable audit log with actor, target, action, reason and timestamp.

### 13.5 Reliability display rules

- Displayed as raw counts, for example "12 attended, 1 late cancellation, 0 no-shows".
- Never displayed as a score, star rating, percentage or league position.
- Users with fewer than 3 completed activities display "New to the platform" rather than counts, to avoid a single early no-show being permanently defining.
- Reliability counts decay out of the visible record after 12 months.

### 13.6 Community policy enforcement

The platform states explicitly that it is for finding people to take part in activities and is not for dating. `dating_solicitation` is a first-class report reason and a moderation category. Repeat offences result in suspension.

---

## 14. Analytics event taxonomy

Events required to compute the validation metrics. Names are illustrative; the set is the contract.

| Event | Key properties |
|---|---|
| `feed_impression` | `activity_id`, `position`, `bucket` (familiar, adjacent, wildcard) |
| `swipe` | `activity_id`, `direction`, `position`, `dwell_ms` |
| `activity_detail_viewed` | `activity_id`, `source` |
| `join_request_created` | `activity_id`, `source`, `listing_type` |
| `join_request_resolved` | `activity_id`, `decision`, `latency_seconds` |
| `participation_created` | `activity_id`, `acceptance_mode` |
| `participation_cancelled` | `activity_id`, `hours_before_start` |
| `attendance_resolved` | `activity_id`, `outcome` |
| `activity_created` | `listing_type`, `recurrence`, `creation_method` (free_text, form, create_similar, repeat) |
| `activity_published` | `listing_type`, `time_to_publish_seconds` |
| `activity_filled` | `activity_id`, `time_to_fill_seconds` |
| `activity_expired_unfilled` | `activity_id`, `spaces_short` |
| `share_link_created` | `activity_id`, `channel` |
| `share_link_opened` | `activity_id`, `is_new_visitor` |
| `guest_interest_created` | `activity_id` |
| `guest_converted` | `guest_id` |
| `group_created` | `origin` (idea_promotion, direct, repeat) |
| `feed_exhausted` | `filters_applied`, `results_shown` |

### 14.1 Derived metrics

| Metric | Formula |
|---|---|
| Right-swipe rate | `swipe(right) / feed_impression` |
| Request conversion | `join_request_created / swipe(right)` |
| Acceptance rate | `participation_created / join_request_created` |
| Attendance rate | `attendance_resolved(attended) / participation_created` |
| **Fill rate (north star)** | `activity_filled / (activity_filled + activity_expired_unfilled)` |
| Time to fill | Median of `activity_filled.time_to_fill_seconds` |
| Share conversion | `guest_interest_created / share_link_opened` |
| Second-action rate | Users with two or more `join_request_created` or `activity_created` within 14 days |

---

## 15. Configuration

Every value below is runtime configuration, changeable without a deployment. Hard-coding any of them is a defect.

| Key | Default |
|---|---|
| `waitlist_claim_window_max_minutes` | 120 |
| `waitlist_claim_window_min_minutes` | 15 |
| `late_cancellation_threshold_hours` | 12 |
| `host_late_cancellation_threshold_hours` | 24 |
| `attendance_grace_period_hours` | 2 |
| `host_attendance_correction_window_hours` | 48 |
| `left_swipe_suppression_days` | 30 |
| `new_activity_boost_hours` | 24 |
| `feed_bucket_shares` | 0.70 / 0.20 / 0.10 |
| `feed_max_per_host` | 3 |
| `feed_max_per_category` | 5 |
| `group_dormancy_days` | 90 |
| `guest_token_ttl_days_after_completion` | 7 |
| `reliability_visibility_min_activities` | 3 |
| `reliability_decay_months` | 12 |
| `ranking_weights` | See [Section 7.3](#73-scoring) |

---

## 16. Non-functional requirements

### 16.1 Performance

| Operation | Target |
|---|---|
| `getFeed` first page | 400 ms at the 95th percentile |
| `getActivity` | 300 ms at the 95th percentile |
| `createJoinRequest` | 500 ms at the 95th percentile |
| Message delivery to connected clients | 2 seconds at the 95th percentile |
| `resolvePublicActivity` | 300 ms at the 95th percentile, cacheable |

The shared public activity view is the most latency-sensitive surface in the product, because it is opened from a link by people with no investment in the product.

### 16.2 Time and timezones

- All timestamps are stored and transmitted in UTC with explicit offset.
- Activity local time is interpreted in the location's timezone, not the host's and not the viewer's.
- Displayed times are rendered in the viewer's timezone, with the activity's timezone shown when the two differ.
- Recurrence generation respects daylight saving transitions: a weekly 19:00 session remains at 19:00 local time.

### 16.3 Offline and unreliable networks

- Swipes are queued locally and submitted with idempotency keys, so a lost connection does not lose input or double-submit.
- The feed page is cached and readable offline. Actions taken offline are reconciled on reconnect, and conflicts (for example, an activity filled meanwhile) are surfaced explicitly rather than silently discarded.

### 16.4 Media

- Uploaded images are validated by content type and size, stripped of EXIF metadata including GPS coordinates, and served in multiple resolutions.
- EXIF stripping is a safety requirement, not an optimisation.

### 16.5 Auditability

The following write to an immutable audit log: moderation actions, account status changes, activity cancellations, participant removals, permission changes, and any administrative override of capacity or attendance.

### 16.6 Data retention and deletion

| Data | Retention |
|---|---|
| Account on deletion request | Anonymised within 30 days: display name replaced, avatar removed, bio cleared |
| Messages sent by a deleted user | Retained, attributed to a removed user placeholder, since deleting them would corrupt other participants' conversations |
| Reliability record on deletion | Deleted |
| Reports and moderation records | Retained per the platform's legal obligations, with the reporter pseudonymised |
| Analytics events | Pseudonymised after 24 months |
| Guest contact references | Deleted 30 days after the last associated activity completes |

### 16.7 Accessibility

- All interactive targets meet minimum size guidance for touch.
- The swipe interaction must have an equivalent button-based path. Gesture-only actions are not acceptable.
- Colour is never the sole carrier of meaning, in particular for capacity state and urgency indicators.
- All content is screen-reader navigable, with activity cards exposing a coherent reading order: title, when, where, capacity, qualifiers.

### 16.8 Localisation readiness

- No user-facing string is embedded in logic. System messages are emitted as type plus payload and rendered client-side.
- Currency, distance, date and time formats follow the viewer's locale.
- The data model imposes no assumptions about name structure or address format.

---

## 17. Build sequence and acceptance criteria

Each stage is independently demonstrable. Do not begin a stage before the previous one meets its criteria.

### Stage 1: Core entities and activity lifecycle

**Acceptance criteria**

- A user can create, publish, edit and cancel a confirmed one-off activity.
- All conditional field requirements are enforced.
- Expiry and completion transitions occur automatically at the correct times.
- Field visibility matches [Section 8.2](#82-field-visibility-matrix) for every role.

### Stage 2: Join, capacity and acceptance modes

**Acceptance criteria**

- All four acceptance modes behave per [Section 6.4](#64-acceptance-modes).
- Under concurrent load, capacity is never exceeded. This must be demonstrated by a test that issues simultaneous accepts against the final place.
- Waitlist offer, claim and lapse behave per [Section 6.3](#63-waitlist).
- Every mutating operation is idempotent under key replay.

### Stage 3: Discovery

**Acceptance criteria**

- Hard filters exclude every case in [Section 7.2](#72-hard-filters-exclusion-non-negotiable).
- Scoring is deterministic and reproducible given the same inputs and weights.
- Bucket composition and diversity constraints hold on every page.
- New activities receive their boost and guaranteed impressions.
- Feed exhaustion is signalled rather than padded.

### Stage 4: Conversations and notifications

**Acceptance criteria**

- Conversation membership is always derivable from participations, with no drift.
- Every system message type in [Section 9.3](#93-system-message-catalogue) fires on its trigger, exactly once.
- No pre-acceptance private channel exists in any operation.
- Non-suppressible notifications cannot be disabled by any settings combination.

### Stage 5: Creation from free text

**Acceptance criteria**

- The extraction contract in [Section 5.2](#52-activity-creation) holds, including the rule that location, capacity and cost are never marked as extracted unless explicitly stated.
- Extraction failure degrades to a usable manual form.
- Every suggested value is editable and rejectable before publication.

### Stage 6: Attendance, reliability and feedback

**Acceptance criteria**

- No-show can only be set by explicit host action within the correction window.
- Reliability counts match a recomputation from source records.
- Display rules in [Section 13.5](#135-reliability-display-rules) are enforced, including the new-user threshold.

### Stage 7: Sharing and guests

**Acceptance criteria**

- A shared link opens a public view without a session, within the latency target.
- A guest can express interest with verification alone, and cannot exceed guest constraints in [Section 5.5](#55-guest-access).
- Slug enumeration is rate limited and slugs are non-guessable.
- Guest-to-user conversion merges records without duplication.

### Stage 8: Recurring groups

**Acceptance criteria**

- Sessions generate on schedule, respecting daylight saving.
- Both `fixed` and `flexible` attendance modes behave per [Section 3.5](#35-group).
- Session-level edits do not propagate backwards to the group.
- Conversation persistence follows the group's setting.

### Stage 9: Proposed plans and ideas

**Acceptance criteria**

- Availability windows are captured and matched.
- Quorum evaluation notifies hosts correctly.
- Promotion operations in [Section 5.6](#56-promotion-operations) preserve all interest records and notify all interested users.

---

## 18. Open technical decisions

These require a decision before or during implementation and are deliberately left open here.

1. **Travel time versus straight-line distance.** The radius is expressed in minutes, which implies a routing calculation. Straight-line distance with a mode-dependent multiplier may be sufficient at MVP scale and avoids an external dependency in the hot path of the feed.
2. **Feed generation strategy.** Compute on request, precompute per user, or hybrid. Precomputation improves latency but complicates freshness, which matters because urgency is a ranking component.
3. **Real-time transport for conversations.** Push, poll or persistent connection. The message delivery target constrains this.
4. **Where structure extraction runs.** Client, server, or an external service. The contract holds regardless, but latency and failure behaviour differ significantly.
5. **Capacity concurrency mechanism.** The requirement is stated in [Section 5.4](#54-capacity-concurrency-and-idempotency); the mechanism is unconstrained.
6. **Whether guests can be counted toward quorum** for proposed plans and ideas, or only toward confirmed capacity.
7. **Session generation horizon.** How far ahead to materialise recurring sessions, balancing discoverability against churn when groups change their schedule.
