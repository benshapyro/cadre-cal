# Cal.com Architecture Overview

> **Purpose:** Document Cal.com architecture patterns discovered during exploration to guide Group Polls implementation.
> **Last Updated:** 2025-11-30

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Key Architecture Patterns](#key-architecture-patterns)
3. [Event Types Feature Deep Dive](#event-types-feature-deep-dive)
4. [Teams and Organizations](#teams-and-organizations)
5. [Booking Flow](#booking-flow)
6. [Availability Checking System](#availability-checking-system)
7. [Database Schema Patterns](#database-schema-patterns)
8. [Integration Points for Group Polls](#integration-points-for-group-polls)

---

## Project Structure

Cal.com is a **Turborepo monorepo** with the following key directories:

```
cal.com/
├── apps/
│   ├── web/              # Next.js 15.5.4 main application
│   │   ├── app/          # App Router pages (Next.js 13+ pattern)
│   │   └── modules/      # Feature modules (views/components)
│   ├── api/              # Standalone API services (v1, v2)
│   └── ...
├── packages/
│   ├── features/         # Shared feature modules (bookings, event-types, etc.)
│   ├── trpc/             # tRPC API layer
│   │   └── server/routers/viewer/  # Main tRPC routers
│   ├── prisma/           # Database schema and client
│   ├── ui/               # Shared component library
│   └── lib/              # Shared utilities
└── ...
```

### Key Technologies

- **Framework:** Next.js 15.5.4 with App Router
- **Database:** PostgreSQL 16 via Prisma ORM
- **API Layer:** tRPC (type-safe RPC)
- **Monorepo:** Turborepo
- **UI Components:** Custom component library in `packages/ui`
- **State Management:** React hooks + tRPC queries
- **Styling:** Tailwind CSS

---

## Key Architecture Patterns

### 1. Feature-Based Organization

Cal.com organizes code by **feature modules** rather than technical layers:

```
packages/features/
├── bookings/           # Booking feature (components, hooks, utils)
├── eventtypes/         # Event types feature
├── ee/                 # Enterprise Edition features
│   ├── teams/          # Team collaboration
│   └── organizations/  # Organization management
└── ...
```

### 2. App Router Pages Pattern

Pages follow Next.js App Router conventions with **co-located files**:

```
apps/web/app/(use-page-wrapper)/(main-nav)/event-types/
├── page.tsx          # Server Component (SSR entry point)
├── loading.tsx       # Loading state
├── error.tsx         # Error boundary
├── actions.ts        # Server Actions
└── skeleton.tsx      # Skeleton loader component
```

**Example: Event Types Page**
```typescript
// apps/web/app/.../event-types/page.tsx
const Page = async ({ searchParams }: PageProps) => {
  // 1. Get server session
  const session = await getServerSession(...);

  // 2. Check onboarding redirect
  const onboardingPath = await checkOnboardingRedirect(session.user.id);
  if (onboardingPath) return redirect(onboardingPath);

  // 3. Fetch data via tRPC
  const userEventGroupsData = await getCachedEventGroups(...);

  // 4. Render with Shell layout
  return (
    <ShellMainAppDir heading={...} CTA={...}>
      <EventTypes userEventGroupsData={userEventGroupsData} />
    </ShellMainAppDir>
  );
};
```

**Key Pattern:**
- **Server Component** handles auth, data fetching, redirects
- **Client Component** (`"use client"`) handles interactivity
- Separation at page.tsx (server) → views/*.tsx (client)

### 3. tRPC API Layer

tRPC provides **type-safe, procedure-based APIs** with no REST boilerplate:

```
packages/trpc/server/routers/viewer/
├── eventTypes/
│   ├── _router.ts              # Route definitions
│   ├── get.handler.ts          # GET procedure
│   ├── get.schema.ts           # Zod validation schema
│   ├── getUserEventGroups.handler.ts
│   └── ...
├── bookings/
└── teams/
```

**Example: tRPC Router**
```typescript
// packages/trpc/server/routers/viewer/eventTypes/_router.ts
export const eventTypesRouter = router({
  getUserEventGroups: authedProcedure
    .input(ZEventTypeInputSchema)  // Zod schema validation
    .query(async ({ ctx, input }) => {
      const { getUserEventGroups } = await import("./getUserEventGroups.handler");
      return await getUserEventGroups({ ctx, input });
    }),

  delete: createEventPbacProcedure("eventType.delete", [MembershipRole.ADMIN])
    .input(ZDeleteInputSchema)
    .mutation(async ({ ctx, input }) => {
      // ... delete handler
    }),
});
```

**Key Pattern:**
- **Router file** (`_router.ts`) defines procedures
- **Handler file** (`.handler.ts`) contains business logic
- **Schema file** (`.schema.ts`) defines Zod validation
- **Separation:** query (read) vs mutation (write)
- **PBAC:** createEventPbacProcedure for permission checks

### 4. Module-Based Views

Feature UI lives in `apps/web/modules/{feature}/views/`:

```
apps/web/modules/event-types/views/
└── event-types-listing-view.tsx   # Main event types list component
```

**Pattern:**
- Views are **"use client"** React components
- Use tRPC hooks for data fetching: `trpc.viewer.eventTypes.getUserEventGroups.useInfiniteQuery(...)`
- Import UI components from `@calcom/ui`
- Import feature components from `@calcom/features`

### 5. Prisma Schema Patterns

Database models follow consistent conventions:

```prisma
model EventType {
  id                Int     @id @default(autoincrement())
  title             String
  slug              String
  description       String?
  length            Int     // Duration in minutes
  hidden            Boolean @default(false)

  // Relations
  userId Int?
  owner  User? @relation("owner", fields: [userId], references: [id], onDelete: Cascade)

  teamId Int?
  team   Team? @relation(fields: [teamId], references: [id], onDelete: Cascade)

  bookings                Booking[]
  availability            Availability[]
  webhooks                Webhook[]

  // JSON fields for flexibility
  locations              Json?
  bookingFields          Json?
  metadata               Json?

  // Timestamps
  createdAt DateTime? @default(now())
  updatedAt DateTime? @updatedAt

  @@unique([userId, slug])
  @@unique([teamId, slug])
  @@index([userId])
  @@index([teamId])
}
```

**Key Patterns:**
- **Auto-increment IDs:** `@id @default(autoincrement())`
- **Soft ownership:** EventType can belong to user OR team (not both)
- **Cascade deletes:** `onDelete: Cascade` for related data
- **Unique constraints:** Ensure slug uniqueness per owner
- **Indexes:** On foreign keys for query performance
- **JSON fields:** For flexible/evolving data (locations, metadata)

---

## Event Types Feature Deep Dive

### Data Flow

```
1. User visits /event-types
   ↓
2. Server Component (page.tsx)
   - Authenticates via getServerSession()
   - Checks onboarding redirect
   - Fetches data via tRPC eventTypesRouter.getUserEventGroups
   ↓
3. Renders Client Component (event-types-listing-view.tsx)
   - Displays event type groups (user's, teams')
   - Search/filter functionality
   - Infinite scroll pagination
   ↓
4. User interactions (create, edit, delete)
   - tRPC mutations called from client
   - Optimistic updates + refetch on success
```

### Key Files Reference

| Purpose | Location |
|---------|----------|
| Page entry | `apps/web/app/(use-page-wrapper)/(main-nav)/event-types/page.tsx` |
| List view | `apps/web/modules/event-types/views/event-types-listing-view.tsx` |
| tRPC router | `packages/trpc/server/routers/viewer/eventTypes/_router.ts` |
| Handlers | `packages/trpc/server/routers/viewer/eventTypes/*.handler.ts` |
| Database model | `packages/prisma/schema.prisma` (model EventType) |

### Component Composition

**Event Types Listing View:**
```typescript
// Imports from shared packages
import { CreateEventTypeDialog } from "@calcom/features/eventtypes/components/CreateEventTypeDialog";
import { EventTypeDescription } from "@calcom/features/eventtypes/components";
import { Button } from "@calcom/ui/components/button";
import { Icon } from "@calcom/ui/components/icon";

// tRPC hook for data
const query = trpc.viewer.eventTypes.getEventTypesFromGroup.useInfiniteQuery({
  limit: LIMIT,
  searchQuery: debouncedSearchTerm,
  group: { teamId, parentId },
});

// Infinite scroll
const buttonInView = useInViewObserver(() => {
  if (!query.isFetching && query.hasNextPage) {
    query.fetchNextPage();
  }
});
```

**Key Patterns:**
- **Infinite scroll:** `useInfiniteQuery` + intersection observer
- **Debounced search:** `useDebounce(searchTerm, 500)`
- **Optimistic UI:** Update local state before server confirmation
- **Reusable dialogs:** CreateEventTypeDialog, DuplicateDialog from `@calcom/features`

---

## Teams and Organizations

### Data Model

Cal.com uses a **unified Team model** for both teams and organizations:

```prisma
model Team {
  id                Int            @id @default(autoincrement())
  name              String
  slug              String?

  // Members with roles
  members           Membership[]

  // Team resources
  eventTypes        EventType[]
  workflows         Workflow[]
  webhooks          Webhook[]
  credentials       Credential[]

  // Organization hierarchy (if parentId = null, it's a top-level org/team)
  parentId          Int?
  parent            Team?          @relation("organization", fields: [parentId], ...)
  children          Team[]         @relation("organization")

  // Organization-specific flag
  isOrganization    Boolean        @default(false)

  metadata          Json?
  timeZone          String         @default("Europe/London")
  weekStart         String         @default("Sunday")
}

model Membership {
  id       Int             @id @default(autoincrement())
  teamId   Int
  userId   Int
  accepted Boolean         @default(false)
  role     MembershipRole  // MEMBER, ADMIN, or OWNER

  team     Team            @relation(...)
  user     User            @relation(...)

  @@unique([userId, teamId])
}

enum MembershipRole {
  MEMBER
  ADMIN
  OWNER
}
```

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Team** | Group of users who collaborate on scheduling |
| **Organization** | Top-level entity (Team with `isOrganization = true`) |
| **Sub-team** | Team within an organization (`parentId` set to org ID) |
| **Membership** | User's membership in a team with a specific role |
| **Team Event Type** | EventType owned by a team, not an individual |

### Role Permissions

| Role | Can Invite | Can Edit Settings | Can Delete Team | Can Manage Billing |
|------|-----------|-------------------|-----------------|-------------------|
| MEMBER | No | No | No | No |
| ADMIN | Yes | Yes | No | Yes |
| OWNER | Yes | Yes | Yes | Yes |

### Relevance for Group Polls

Teams are critical for Group Polls because:
1. **Team Availability** - Aggregate busy times across team members
2. **Poll Ownership** - Polls can be owned by teams (like EventTypes)
3. **Access Control** - Use existing Membership roles for poll permissions
4. **Notification Scope** - Notify team members about poll activity

**Key files:**
- Schema: `packages/prisma/schema.prisma` (Team, Membership models)
- tRPC: `packages/trpc/server/routers/viewer/teams/`
- Pages: `apps/web/app/(use-page-wrapper)/(main-nav)/teams/`
- Features: `packages/features/ee/teams/`

---

## Booking Flow

### Verified End-to-End Flow

Successfully tested the complete booking flow:

```
1. User visits /benshapyro (public booking page)
   ↓
2. Selects event type (30 Min Meeting)
   ↓
3. Calendar view shows available slots
   - Checks Google Calendar for busy times
   - Respects availability schedule
   ↓
4. User selects time slot (Dec 8, 11:00 AM PST)
   ↓
5. Booking form collects attendee info
   ↓
6. System creates:
   - Booking record (status: accepted)
   - BookingReference to google_calendar (event created)
   - BookingReference to google_meet_video (meet link generated)
   ↓
7. Confirmation page shows booking details
   ↓
8. Booking appears in /bookings list
```

### Database Records Created

**Booking table:**
```sql
id: 31
title: "30 Min Meeting between Ben Shapiro and Ben Shapiro"
startTime: 2025-12-08 19:00:00 (UTC)
endTime: 2025-12-08 19:30:00 (UTC)
status: accepted
location: integrations:google:meet
```

**BookingReference table:**
```sql
-- Google Calendar event
bookingId: 31, type: google_calendar, externalCalendarId: ben@gocadre.ai

-- Google Meet link
bookingId: 31, type: google_meet_video
```

### Relevance for Group Polls

The booking flow provides the pattern for:
1. **Poll → Booking Conversion** - After poll closes, create booking for winning slot
2. **Calendar Integration** - Reuse Google Calendar event creation
3. **Meet Link Generation** - Reuse Google Meet integration
4. **Confirmation Flow** - Similar UI for poll finalization

**Key files:**
- Booking creation: `packages/features/bookings/`
- Calendar integration: `packages/features/calendars/`
- tRPC: `packages/trpc/server/routers/viewer/bookings/`

---

## Availability Checking System

### Architecture (Dependency Injection Pattern)

Cal.com uses a **dependency injection container** for availability checking:

```typescript
// packages/features/di/containers/AvailableSlots.ts
const container = createContainer();
container.load(DI_TOKENS.BUSY_TIMES_SERVICE_MODULE, busyTimesModule);
container.load(DI_TOKENS.GET_USER_AVAILABILITY_SERVICE_MODULE, getUserAvailabilityModule);
container.load(DI_TOKENS.AVAILABLE_SLOTS_SERVICE_MODULE, availableSlotsModule);
// ... more modules

export function getAvailableSlotsService() {
  return container.get<AvailableSlotsService>(DI_TOKENS.AVAILABLE_SLOTS_SERVICE);
}
```

### Key Services

| Service | Location | Purpose |
|---------|----------|---------|
| `AvailableSlotsService` | `packages/trpc/server/routers/viewer/slots/util.ts` | Main entry point for slot availability |
| `BusyTimesService` | `packages/features/busyTimes/services/getBusyTimes.ts` | Aggregates busy times from calendars + bookings |
| `UserAvailabilityService` | `packages/features/availability/lib/getUserAvailability.ts` | Calculates user availability from schedules |
| `getAggregatedAvailability` | `packages/features/availability/lib/getAggregatedAvailability/` | Merges multiple users' availability (team events) |
| `CalendarManager` | `packages/features/calendars/lib/CalendarManager.ts` | Manages Google/Outlook calendar connections |

### Key Function Signatures

```typescript
// getUserAvailability - Entry point for user's availability
async _getUserAvailability(query: {
  dateFrom: Dayjs;
  dateTo: Dayjs;
  eventTypeId?: number;
  username?: string;
  userId?: number;
  afterEventBuffer?: number;
  beforeEventBuffer?: number;
  duration?: number;
  returnDateOverrides: boolean;
  bypassBusyCalendarTimes?: boolean;
}): Promise<{
  busy: EventBusyDetails[];
  dateRanges: DateRange[];
  oooExcludedDateRanges: DateRange[];
  timeZone: string;
  datesOutOfOffice: IOutOfOfficeData;
}>

// getBusyTimes - Fetches busy calendar times
async _getBusyTimes(params: {
  credentials: CredentialForCalendarService[];
  userId: number;
  userEmail: string;
  startTime: string;
  endTime: string;
  selectedCalendars: SelectedCalendar[];
}): Promise<EventBusyDetails[]>

// getAggregatedAvailability - Team scheduling
function getAggregatedAvailability(
  userAvailability: Array<{
    dateRanges: DateRange[];
    oooExcludedDateRanges: DateRange[];
    user?: { isFixed?: boolean };
  }>,
  schedulingType: SchedulingType | null // COLLECTIVE, ROUND_ROBIN
): DateRange[]
```

### Core Data Types

```typescript
type EventBusyDetails = {
  start: Date | string;
  end: Date | string;
  source?: string;
  title?: string;
  userId?: number;
};

type DateRange = {
  start: Dayjs;
  end: Dayjs;
};

type WorkingHours = {
  days: number[];      // 0=Sunday, 1=Monday, etc.
  startTime: number;   // Minutes since midnight (540 = 9:00 AM)
  endTime: number;     // Minutes since midnight (1020 = 5:00 PM)
  userId?: number;
};
```

### How Availability is Calculated (10-Step Flow)

```
1. Resolve Event Type
   - Fetch event type details with scheduling type, buffer times, duration
   ↓
2. Find Qualified Hosts
   - Handle round-robin, collective, routing forms
   - Get user credentials for connected calendars
   ↓
3. Calculate Time Range
   - Apply minimum booking notice
   - Adjust for rolling window period types
   ↓
4. Get User Availability via UserAvailabilityService
   - Load their schedule (default or event-type-specific)
   - Apply date overrides
   - Convert to DateRanges with timezone handling
   ↓
5. Fetch Busy Times via BusyTimesService
   - Query Prisma for confirmed bookings
   - Apply before/after buffers
   - Call getBusyCalendarTimes() for Google/Outlook
   - Merge all busy time blocks
   ↓
6. Aggregate Availability via getAggregatedAvailability()
   - COLLECTIVE: Intersect all users' availability (all must be free)
   - ROUND_ROBIN: Union of groups (at least one per group available)
   ↓
7. Generate Time Slots via getSlots()
   - Iterate through available date ranges
   - Create slots at specified frequency (30min, 60min)
   - Respect minimum booking notice
   ↓
8. Apply Restrictions
   - Check restriction schedules (per-event limits)
   - Filter by booking limits (max bookings per week/month)
   ↓
9. Handle Reservations
   - Check for slots reserved by other users (SelectedSlots table)
   ↓
10. Format Response
    - Group slots by date (YYYY-MM-DD format)
    - Include metadata: attendees, booking UID, away status
```

### Caching

```typescript
// Redis caching for slots (2-second TTL)
const DEFAULT_SLOTS_CACHE_TTL = 2000;

function withSlotsCache(redisClient, func) {
  return async (args) => {
    const cacheKey = JSON.stringify(args.input);
    const cached = await redisClient.get(cacheKey);
    if (cached) return cached;

    const result = await func(args);
    redisClient.set(cacheKey, result, { ttl: DEFAULT_SLOTS_CACHE_TTL });
    return result;
  };
}
```

### Database Tables for Availability

```sql
-- Schedule defines named availability schedules
Schedule: id=50, userId=1, name="Working Hours", timeZone="America/Los_Angeles"

-- Availability defines time windows for each schedule
Availability: scheduleId=50, startTime=08:00, endTime=17:00, days={1,2,3,4}  -- Mon-Thu
Availability: scheduleId=50, startTime=09:00, endTime=14:00, days={5}        -- Fri
```

### Key Files for Group Polls

For implementing team availability aggregation:

```
packages/features/busyTimes/services/getBusyTimes.ts    # Core busy time logic
packages/features/availability/lib/getUserAvailability.ts  # User availability service
packages/features/availability/lib/getAggregatedAvailability/  # Team aggregation
packages/features/di/containers/AvailableSlots.ts       # DI container setup
packages/trpc/server/routers/viewer/slots/              # Slots API endpoint
packages/features/calendars/lib/CalendarManager.ts      # Calendar API calls
packages/features/schedules/lib/slots.ts                # Slot generation
packages/features/schedules/lib/date-ranges.ts          # Date range utilities
```

### How to Reuse for Group Polls

```typescript
// Get availability for multiple team members
const userAvailabilityService = getUserAvailabilityService();

const teamAvailability = await Promise.all(
  teamMembers.map(member =>
    userAvailabilityService.getUserAvailability({
      userId: member.id,
      dateFrom: startDate,
      dateTo: endDate,
      bypassBusyCalendarTimes: false,
      returnDateOverrides: true,
    })
  )
);

// Aggregate using COLLECTIVE scheduling (intersect all)
import { getAggregatedAvailability } from "@calcom/features/availability/lib/getAggregatedAvailability";
const commonAvailability = getAggregatedAvailability(
  teamAvailability.map(ua => ({
    dateRanges: ua.dateRanges,
    oooExcludedDateRanges: ua.oooExcludedDateRanges,
  })),
  SchedulingType.COLLECTIVE
);
```

### Relevance for Group Polls

The availability system is **critical** for Group Polls:
1. **Team Availability Heat Map** - Call `getUserAvailability` for each team member
2. **Aggregate Busy Times** - Use `getAggregatedAvailability` with COLLECTIVE scheduling
3. **Show Optimal Slots** - Highlight times when most/all members are free
4. **Pre-populate Poll Options** - Suggest best times based on team availability

---

## Database Schema Patterns

### Key Models for Reference

| Model | Purpose | Key Relations |
|-------|---------|---------------|
| `User` | User accounts | EventTypes, Bookings, Teams |
| `EventType` | Scheduling templates | User/Team (owner), Bookings, Webhooks |
| `Booking` | Scheduled meetings | EventType, User (attendee), Calendar events |
| `Team` | Team collaboration | Users (members), EventTypes, Organizations |
| `Availability` | Time windows | User, EventType, Schedule |
| `Credential` | OAuth tokens | User, Calendar/Video apps |
| `SelectedCalendar` | Calendar sync config | User, integration |

### Naming Conventions

- **Tables:** PascalCase (e.g., `EventType`, `User`, `SelectedCalendar`)
- **Fields:** camelCase (e.g., `userId`, `eventTypeId`, `createdAt`)
- **Relations:** Descriptive names (e.g., `owner`, `team`, `bookings`)

### JSON Field Usage

Cal.com uses JSON fields for:
- **Flexible schemas:** `EventType.locations` (array of location objects)
- **App metadata:** `EventType.metadata` (stripe pricing, custom data)
- **Form fields:** `EventType.bookingFields` (dynamic form configuration)
- **Recurring patterns:** `EventType.recurringEvent` (rrule-like config)

### Seeded Test Data (from `yarn db-seed`)

The database includes test data useful for development:

**Users (43 total):**
| Email | Username | Notes |
|-------|----------|-------|
| `ben@gocadre.ai` | `benshapyro` | Your account (id=1) |
| `pro@example.com` | `pro` | Pro user for testing |
| `free-first-hidden@example.com` | `free-first-hidden` | Free tier user |
| `onboarding@example.com` | `onboarding` | Onboarding test user |
| `delete-me@example.com` | `delete-me` | Deletable test user |
| `member4-acme@example.com` | `member4-acme` | Team member |

**Teams/Organizations (19 total):**
| Name | Slug | Type | Parent |
|------|------|------|--------|
| Platform Team | `platform-admin-team` | Organization | — |
| Acme Inc | `acme` | Organization | — |
| Dunder Mifflin | `dunder-mifflin` | Organization | — |
| Team 1 | `team1` | Sub-team | Acme Inc |
| Seeded Team | `seeded-team` | Team | — |
| Seeded Team (Marketing) | `seeded-team-marketing` | Team | — |

**Other seeded data:**
- 148 team memberships
- 1,156 event types (including managed event types)
- 102 apps (Google Calendar, Zoom, Stripe, etc.)
- 51 availability windows
- 50 schedules

**Useful for testing:**
- Team booking flows: Use Acme Inc or Dunder Mifflin teams
- Multi-user scenarios: Use seeded team members
- Organization hierarchy: Acme → Team 1 relationship

---

## Integration Points for Group Polls

### Where Group Polls Will Fit

Based on Cal.com architecture, here's how Group Polls should integrate:

#### 1. Database Schema

> **Full schema defined in:** [`cadre_cal_DESIGN.md`](./cadre_cal_DESIGN.md#3-database-schema-new-tables)

New models follow Cal.com conventions discovered above:

| Model | Connects To | Purpose |
|-------|-------------|---------|
| `GroupPoll` | `User` (creator) | Poll metadata, status, share link |
| `GroupPollWindow` | `GroupPoll` | Proposed availability windows |
| `GroupPollParticipant` | `GroupPoll`, `User` (optional) | Cadre members + clients with access tokens |
| `GroupPollResponse` | `GroupPollParticipant` | Participant's painted availability |

**Cal.com conventions applied:**
- Auto-increment integer IDs (not cuid/uuid)
- Cascade deletes on foreign keys
- Indexes on frequently queried fields
- PascalCase table names, camelCase fields

#### 2. tRPC Router

Create `packages/trpc/server/routers/viewer/groupPolls/`:

```typescript
// _router.ts
export const groupPollsRouter = router({
  // Queries
  list: authedProcedure.query(async ({ ctx }) => { /* ... */ }),
  get: authedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => { /* ... */ }),

  // Mutations
  create: authedProcedure.input(ZCreatePollSchema).mutation(async ({ ctx, input }) => { /* ... */ }),
  update: authedProcedure.input(ZUpdatePollSchema).mutation(async ({ ctx, input }) => { /* ... */ }),
  delete: authedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => { /* ... */ }),

  // Responses
  submitResponse: procedure.input(ZSubmitResponseSchema).mutation(async ({ ctx, input }) => { /* ... */ }),
});
```

#### 3. Frontend Pages

Create App Router pages:

```
apps/web/app/(use-page-wrapper)/(main-nav)/group-polls/
├── page.tsx              # List view (Server Component)
├── [slug]/
│   └── page.tsx          # Poll detail/response page (Server Component)
├── create/
│   └── page.tsx          # Create poll page
└── [id]/
    └── edit/
        └── page.tsx      # Edit poll page
```

#### 4. Feature Module

Create `apps/web/modules/group-polls/views/`:

```
apps/web/modules/group-polls/views/
├── group-polls-listing-view.tsx     # List of polls
├── poll-creation-form-view.tsx      # Create poll UI
├── poll-response-view.tsx           # Time slot selection heat map
└── poll-results-view.tsx            # Aggregated results view
```

#### 5. Shared Components

Create `packages/features/group-polls/`:

```
packages/features/group-polls/
├── components/
│   ├── PollTimeSlotGrid.tsx       # Time slot selection UI
│   ├── PollHeatMap.tsx            # Availability heat map
│   └── PollResultsSummary.tsx     # Results display
├── hooks/
│   ├── usePollData.ts             # Data fetching hook
│   └── useAvailabilityCheck.ts    # Check team availability
└── lib/
    ├── availabilityUtils.ts       # Shared availability logic
    └── pollUtils.ts               # Poll-specific utilities
```

#### 6. Navigation Integration

Add to main navigation in `ShellMainAppDir`:

```typescript
// Navigation item
{
  name: "Group Polls",
  href: "/group-polls",
  icon: Icon.CalendarRange,  // Or custom icon
}
```

---

## Booking Creation System (Deep Dive)

### Entry Points

| Path | Purpose |
|------|---------|
| `apps/api/v2/src/ee/bookings/2024-08-13/controllers/bookings.controller.ts` | REST API (v2) |
| `packages/features/bookings/lib/handleNewBooking/` | Core booking logic |

### Booking Creation Flow

```
1. API Entry Point (POST /v2/bookings)
   ↓
2. Event Type Lookup & Validation
   - getBookedEventType() validates event type exists
   - Can lookup by eventTypeId OR username+eventTypeSlug
   ↓
3. Booking Type Determination
   - createInstantBooking() - for instant meetings
   - createRecurringBooking() - for recurring events
   - createSeatedBooking() - for group events with seats
   - createRegularBooking() - for standard 1-on-1 bookings
   ↓
4. Core Booking Data Creation
   - buildNewBookingData() constructs booking object
   - saveBooking() within Prisma transaction
   ↓
5. Calendar Event Creation (EventManager)
   - Creates video events (Google Meet, Zoom)
   - Creates calendar events (Google, Outlook)
   - Returns BookingReferences
   ↓
6. Notifications (BookingEmailSmsHandler)
   - Sends confirmation emails
   - Triggers workflows
```

### Key Files

```
packages/features/bookings/lib/handleNewBooking/
├── createBooking.ts          # Main booking creation
├── buildNewBookingData.ts    # Constructs booking object
├── getBookingData.ts         # Parses booking request
├── loadUsers.ts              # Loads organizer & team
├── ensureAvailableUsers.ts   # Validates host availability

packages/features/bookings/lib/
├── EventManager.ts           # Creates calendar/video events
├── BookingEmailSmsHandler.ts # Sends notifications
```

### Booking Model (Key Fields)

```prisma
model Booking {
  id                    Int
  uid                   String @unique       // Public identifier
  title                 String
  startTime             DateTime
  endTime               DateTime
  status                BookingStatus        // ACCEPTED, PENDING, CANCELLED
  location              String?              // "Zoom", "Google Meet"

  userId                Int?                 // Organizer
  eventTypeId           Int?

  attendees             Attendee[]           // All people joining
  references            BookingReference[]   // Links to external calendar events

  metadata              Json?
  createdAt             DateTime @default(now())
}
```

### Creating Bookings Programmatically (for Group Polls)

```typescript
import { createBooking } from "@calcom/features/bookings/lib/handleNewBooking/createBooking";

const booking = await createBooking({
  uid: generateUUID(),
  eventType: {
    eventTypeData: eventTypeDetails,
    id: eventTypeId,
    isConfirmedByDefault: true,
  },
  evt: {
    title: "Meeting from Poll",
    startTime: selectedSlot.start,
    endTime: selectedSlot.end,
    attendees: participants.map(p => ({
      name: p.name,
      email: p.email,
      timeZone: p.timeZone,
    })),
  },
  creationSource: "POLL_INTEGRATION",
});
```

---

## UI Components Reference

### Component Library Stack

- **Primitives:** Radix UI (`@radix-ui/react-*`)
- **Styling:** Tailwind CSS + CVA (Class Variance Authority)
- **Utilities:** `@calcom/ui/classNames` for merging classes

### Key Components for Group Polls

| Component | Location | Use Case |
|-----------|----------|----------|
| DatePicker | `@calcom/features/calendars/DatePicker` | Monthly calendar selection |
| Weekly Calendar | `@calcom/features/calendars/weeklyview/` | Week grid with time slots |
| Dialog | `@calcom/ui/components/dialog/Dialog.tsx` | Modals and confirmations |
| Button | `@calcom/ui/components/button/Button.tsx` | Actions |
| TextField | `@calcom/ui/components/form/TextField.tsx` | Text inputs |
| Select | `@calcom/ui/components/form/Select.tsx` | Dropdowns (react-select) |
| Checkbox | `@calcom/ui/components/form/Checkbox.tsx` | Boolean inputs |
| DateRangePicker | `@calcom/ui/components/form/date-range-picker/` | Date range selection |

### DatePicker Props

```typescript
type DatePickerProps = {
  weekStart?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  onChange: (date: Dayjs | null) => void;
  selected?: Dayjs | Dayjs[] | null;
  minDate?: Date;
  maxDate?: Date;
  locale: string;
  excludedDates?: string[];
  slots?: Record<string, Array<{
    time: string;
    userIds?: number[];
    away?: boolean;
    reason?: string;
    emoji?: string;
  }>>;
  isLoading?: boolean;
  isCompact?: boolean;
}
```

### Dialog Usage Pattern

```typescript
import { Dialog, DialogContent, DialogHeader, DialogFooter } from "@calcom/ui/components/dialog";
import { Button } from "@calcom/ui/components/button";

function MyDialog({ open, onClose }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent type="creation" title="Create Poll">
        <DialogHeader title="New Group Poll" subtitle="Schedule with multiple people" />
        {/* Form content */}
        <DialogFooter>
          <Button color="secondary" onClick={onClose}>Cancel</Button>
          <Button color="primary">Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Public Pages Pattern

### Route Groups

- **Authenticated:** `apps/web/app/(use-page-wrapper)/` - Requires login
- **Public:** `apps/web/app/(booking-page-wrapper)/` - No auth required

### Public Page Structure

```typescript
// apps/web/app/(booking-page-wrapper)/[user]/[type]/page.tsx

// Server Component - fetches data without auth
const ServerPage = async ({ params, searchParams }: PageProps) => {
  const legacyCtx = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const props = await getData(legacyCtx);  // Uses withAppDirSsr wrapper

  return <LegacyPage {...props} />;
};

export default ServerPage;
```

### Public tRPC Procedures

```typescript
// packages/trpc/server/routers/publicViewer/_router.tsx

import publicProcedure from "../../procedures/publicProcedure";

export const publicViewerRouter = router({
  // No auth required
  event: publicProcedure
    .input(ZEventInputSchema)
    .query(async (opts) => {
      const session = await getSession(opts.ctx);  // Session is OPTIONAL
      const userId = session?.user?.id;  // Can be undefined
      const { default: handler } = await import("./event.handler");
      return handler({ input: opts.input, userId });
    }),
});
```

### Session Optional Pattern

```typescript
// In public handlers, session is always optional
export async function handler({ input, userId }: { input: Input; userId?: number }) {
  // userId may be undefined for unauthenticated users
  const poll = await prisma.groupPoll.findUnique({
    where: { accessToken: input.accessToken },
    // ... don't require userId for public access
  });
}
```

### Data Filtering for Public Access

```typescript
// Strip sensitive fields before sending to client
const publicPollData = {
  title: poll.title,
  description: poll.description,
  windows: poll.windows,
  // DON'T include:
  // - participant emails (only show counts)
  // - creator details
  // - internal metadata
};
```

### Public Page Caching

```typescript
// Smart caching in createNextApiHandler
const cacheRules = {
  session: "no-cache",              // Never cache auth state
  "i18n.get": "max-age=31536000",   // Cache i18n for 1 year
  "slots.getSchedule": "no-cache",  // Don't cache availability
};
```

---

## Key Takeaways for Group Polls Implementation

### Follow These Patterns

1. **Feature Module Structure**
   - Database models in `packages/prisma/schema.prisma`
   - tRPC router in `packages/trpc/server/routers/viewer/groupPolls/`
   - App Router pages in `apps/web/app/.../group-polls/`
   - Views in `apps/web/modules/group-polls/views/`
   - Shared components in `packages/features/group-polls/`

2. **Code Organization**
   - Server Components for auth, data fetching, redirects (page.tsx)
   - Client Components for interactivity (views/*.tsx)
   - tRPC for all API calls (no REST endpoints)
   - Zod schemas for validation

3. **Database Patterns**
   - PascalCase table names, camelCase fields
   - Auto-increment IDs
   - Cascade deletes for relations
   - Unique constraints on slugs
   - Indexes on foreign keys and frequently queried fields
   - JSON for flexible data

4. **UI Patterns**
   - Use `@calcom/ui` component library
   - Follow existing dialog/modal patterns
   - Implement infinite scroll for large lists
   - Debounce search inputs
   - Show loading states and error boundaries

### Leverage Existing Code

**Reuse from Event Types:**
- Location selection component
- Duration picker
- Time slot grid (adapt for polls)
- User/team avatar display
- Booking confirmation flow

**Reuse from Bookings:**
- Availability checking logic
- Calendar integration
- Notification patterns

---

## Next Steps

**✅ All Features Complete (as of 2025-11-29):**
1. ~~Explore Booking Flow~~ - Implemented poll → booking conversion in `book.handler.ts`
2. ~~Study Availability Logic~~ - Heat map calculation using response data
3. ~~Examine UI Components~~ - Using Cal.com UI library throughout
4. ~~Test Database Queries~~ - Full CRUD operations working
5. ~~Calendar Integration~~ - EventManager integration in `book.handler.ts` (Phase 2B)
6. ~~QR Code Generation~~ - ShareDialog with react-qr-code, download as PNG (Phase 5)
7. ~~Public Poll Link~~ - `/poll/[shareSlug]` with multi-participant submit (Phase 5)
8. ~~Slack Notifications~~ - DM to Cadre participants on responses (Phase 6)
9. ~~Poll Editing~~ - Add/remove participants, update date range (Phase 7)
10. ~~Code Quality~~ - 15 improvements: logging, tests, ARIA, race conditions, timezone docs (Phase 1C)

**Test Coverage:**
- 39 unit tests (timeUtils + heatMapCalculation)
- 7 E2E tests (full flows)

---

**References:**
- Cal.com codebase: `/Users/bshap/Projects/cadre-internal/calendar/cal.com/`
- Prisma schema: `packages/prisma/schema.prisma`
- tRPC routers: `packages/trpc/server/routers/viewer/`
- App pages: `apps/web/app/`
