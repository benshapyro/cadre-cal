# Development Notes & Discoveries

> **Purpose:** Important findings, gotchas, and decisions encountered during development.
> Add entries as we discover Cal.com quirks or make significant technical choices.

---

## Setup & Configuration

### PostgreSQL Version Choice
- **Date:** 2025-11-26
- **Finding:** PostgreSQL 16 was already installed and running locally
- **Decision:** Use PostgreSQL 16 instead of 15 (both supported by Cal.com)
- **Impact:** Ensures we use latest features; production should also use 16+

### Database Port
- **Date:** 2025-11-26
- **Finding:** `.env.example` defaults to port 5450, but standard PostgreSQL runs on 5432
- **Decision:** Updated `.env` to use 5432 (actual running instance)
- **Note:** Check if 5450 was intended for a specific reason (connection pooler?)

### Google Calendar OAuth Setup
- **Date:** 2025-11-26
- **Google Cloud Project:** "Cal Local" (Project ID: cal-local-479503)
- **OAuth Client:** "cadre cal local dev"
- **Account Type:** External (to allow non-@gocadre.ai accounts to connect)
- **Test User:** ben@gocadre.ai
- **Scopes Configured:**
  - `https://www.googleapis.com/auth/calendar` - Full calendar access
  - `https://www.googleapis.com/auth/calendar.events` - Event management
- **Redirect URI:** `http://localhost:3000/api/integrations/googlecalendar/callback`
- **Credentials:** Added to `cal.com/.env` as `GOOGLE_API_CREDENTIALS`
- **Format:** Single-line JSON string with client_id, client_secret, project_id
- **Status:** ✅ Complete and ready for testing

### Important: .env File Security
- **File:** `cal.com/.env` (git ignored, never commit!)
- **Contains:** OAuth client ID and secret, database credentials, encryption keys
- **Location:** `/Users/bshap/Projects/cadre-internal/calendar/cal.com/.env`
- **Backup:** Keep credentials secure; can regenerate from Google Cloud Console if needed

### Stripe Configuration for Local Development
- **Date:** 2025-11-26
- **Issue:** Onboarding wizard fails with "STRIPE_PRIVATE_KEY is not set" error
- **Root Cause:** Onboarding checks payment/billing status even though Stripe isn't needed locally
- **Solution:** Add dummy Stripe key to `.env`:
  ```bash
  STRIPE_PRIVATE_KEY=sk_test_dummy_key_for_local_dev
  ```
- **Impact:** Allows onboarding to proceed; doesn't affect core functionality
- **Production Note:** Will need real Stripe credentials if enabling paid features

### Database Seeding Required
- **Date:** 2025-11-26
- **Issue:** Calendar apps (Google Calendar, etc.) not appearing during onboarding
- **Root Cause:** App metadata not loaded into database after migrations
- **Solution:** Run database seed script:
  ```bash
  yarn db-seed
  ```
- **What it does:**
  - Populates App table with 100+ apps (calendars, video, CRM, etc.)
  - Creates test users (pro@example.com, admin@example.com, etc.)
  - Seeds example teams, organizations, event types, and bookings
- **When to run:** After initial migration, or if apps aren't showing up
- **Safe to run multiple times:** Script uses upsert, won't create duplicates

### .env File Gotcha: Duplicate Keys
- **Date:** 2025-11-26
- **Issue:** GOOGLE_API_CREDENTIALS appears twice in `.env.example`
  - Line ~121: Added by us during setup (with credentials)
  - Line ~144: Default empty placeholder
- **Problem:** In `.env` files, **last value wins** - empty line 144 overrides line 121
- **Solution:** Remove duplicate, keep only one entry at line 144 with credentials
- **Lesson:** Always check for duplicate keys in `.env` files

### React 19 Deprecation Warnings
- **Date:** 2025-11-26
- **Finding:** Console shows warnings about `element.ref` and `useDefaultComponent` prop
- **Impact:** **Non-blocking** - these are upstream Cal.com issues, not our code
- **Cause:** Cal.com hasn't fully updated to React 19 patterns yet
- **Action:** Safe to ignore during development; doesn't affect functionality

---

## Cal.com Architecture

*Notes about Cal.com structure, patterns, and extension points will go here as we explore.*

---

## Development Workflow

### First User Setup (Completed 2025-11-26)
- **User:** Ben Shapiro (ben@gocadre.ai, username: benshapyro)
- **Onboarding:** ✅ Completed successfully
- **Calendar:** Google Calendar connected (ben@gocadre.ai)
- **Video:** Google Meet connected
- **Event Types Created:**
  - Secret Meeting (15 min) - `/benshapyro/secret`
  - 30 Min Meeting (30 min) - `/benshapyro/30min`
  - 15 Min Meeting (15 min) - `/benshapyro/15min`
- **Booking Page:** http://localhost:3000/benshapyro

### Essential Commands
```bash
# Start development server
cd cal.com && yarn workspace @calcom/web dev
# Access at: http://localhost:3000

# Seed database with apps and test data
yarn db-seed

# Access database directly
/opt/homebrew/opt/postgresql@16/bin/psql calendso

# View Prisma Studio (database GUI)
cd cal.com && yarn db-studio
# Access at: http://localhost:5555
```

### Dev Server Notes
- **Startup time:** ~1-3 seconds after initial compilation
- **Hot reload:** Works well, no need to restart for most changes
- **Port:** 3000 (configurable in `.env` via `NEXT_PUBLIC_WEBAPP_URL`)
- **Turborepo:** Manages monorepo builds efficiently

---

## Production Deployment

### Railway Deployment (2025-11-27)

**Platform Choice:**
- **Selected:** Railway (over Vercel)
- **Reason:** All-in-one platform with app + PostgreSQL together
- **Trade-off:** Vercel might build faster for Next.js, but requires external database

**GitHub Repository:**
- **Repo:** https://github.com/benshapyro/cadre-cal
- **Remotes configured:**
  - `origin` → benshapyro/cadre-cal (our fork for Railway)
  - `upstream` → calcom/cal.com (for pulling updates)

**Railway Project Details:**
- **Project name:** perfect-strength
- **URL:** https://cal.cadreai.com (custom domain)
- **Services:** web (Cal.com), Postgres

### Critical: Railway Configuration for Cal.com

Cal.com's large monorepo requires specific Railway configuration. We created `railway.toml` in the repo root:

```toml
[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile"

[build.args]
DATABASE_URL = "${{Postgres.DATABASE_URL}}"
NEXTAUTH_SECRET = "${{NEXTAUTH_SECRET}}"
CALENDSO_ENCRYPTION_KEY = "${{CALENDSO_ENCRYPTION_KEY}}"
CALCOM_TELEMETRY_DISABLED = "1"

[deploy]
healthcheckPath = "/"
healthcheckTimeout = 120
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
preDeployCommand = "npx prisma migrate deploy --schema=packages/prisma/schema.prisma"
```

### Build Issues & Solutions

#### Issue 1: Prisma Type Error During Build
- **Error:** `Type 'null' is not assignable to type 'InputJsonValue'`
- **Cause:** `DATABASE_URL` not available during Docker build
- **Solution:** Pass `DATABASE_URL` as a build argument in `railway.toml`

#### Issue 2: Build Timeout
- **Error:** Build times out after ~7 minutes
- **Cause:** Cal.com is a large monorepo; Railway free tier has limited build resources
- **Solution:** Enable **Metal Build Environment** in Railway settings (Settings → Build)

#### Issue 3: Healthcheck Fails with "Service Unavailable"
- **Error:** `1/1 replicas never became healthy`
- **Cause 1:** Railway healthchecks on wrong port
- **Solution:** Add `PORT=3000` to Railway environment variables
- **Cause 2:** Database tables don't exist
- **Solution:** Add `preDeployCommand` to run migrations before app starts

#### Issue 4: Database Tables Missing
- **Error:** `The table 'public.users' does not exist`
- **Cause:** Migrations never ran on production database
- **Solution:** Add to `railway.toml`:
  ```toml
  preDeployCommand = "npx prisma migrate deploy --schema=packages/prisma/schema.prisma"
  ```

### Required Environment Variables for Railway

```bash
# Database (Railway provides via service reference)
DATABASE_URL=${{Postgres.DATABASE_URL}}
DATABASE_DIRECT_URL=${{Postgres.DATABASE_URL}}

# App URLs
NEXT_PUBLIC_WEBAPP_URL=https://cal.cadreai.com
NEXTAUTH_URL=https://cal.cadreai.com

# Secrets
NEXTAUTH_SECRET=<your-secret>  # generate with: openssl rand -base64 32
# IMPORTANT: Must be exactly 32 characters (latin1 encoding, 1 char = 1 byte)
# NOT base64, NOT hex - just 32 ASCII characters
CALENDSO_ENCRYPTION_KEY=<exactly-32-characters-here!!!!>

# Required for healthcheck
PORT=3000

# Misc
CALCOM_TELEMETRY_DISABLED=1
CRON_API_KEY=<any-string>
STRIPE_PRIVATE_KEY=sk_test_dummy_key_for_railway

# Google OAuth (add after GCP setup)
GOOGLE_API_CREDENTIALS={"web":{"client_id":"...","client_secret":"...","redirect_uris":["https://YOUR-URL/api/integrations/googlecalendar/callback"]}}
```

### Admin Security Warning

- **Issue:** "You are admin but do not have a password length of at least 15 characters or no 2FA yet"
- **Cause:** First user gets admin role; Cal.com requires admins to have strong security
- **Solution:** Either use password ≥15 characters OR enable 2FA in Settings → Security

### CALENDSO_ENCRYPTION_KEY Format (Critical!)

- **Issue:** 2FA setup fails with `ERR_CRYPTO_INVALID_KEYLEN` error
- **Cause:** Key must be exactly 32 characters (not base64, not hex)
- **Why:** Cal.com uses `Buffer.from(key, "latin1")` where each character = 1 byte
- **Wrong formats:**
  - Base64 (44 chars): `JvjxZm7+FyiUV9oEYib1jas7Fryjb4lHWG8fVnsvZKY=` ❌
  - Hex (64 chars): `3f8a2b1c4d5e6f7a8b9c0d1e2f3a4b5c...` ❌
- **Correct format (32 chars exactly):**
  - `CadreCalEncryptionKeyForProd25!` ✅
  - `abcdefghjnmkljhjklmnhjklkmnbhjui` ✅ (from Cal.com tests)
- **Note:** The `.env.example` comment says "use `openssl rand -base64 32`" but this is misleading - that generates 44 chars which won't work

### Git Lock File Issue (Local Development)

- **Issue:** `fatal: Unable to create '.git/index.lock': File exists`
- **Cause:** powerlevel10k shell theme constantly polls git status via `gitstatusd`
- **Workaround:** Prefix git commands with lock removal:
  ```bash
  rm -f .git/index.lock; git commit -m "message" && git push
  ```
- **Also helps:** `HUSKY=0` to disable pre-commit hooks during commit

### Production Google OAuth Setup

- **GCP Project:** "Cal Production" (separate from local "Cal Local")
- **Redirect URI:** `https://cal.cadreai.com/api/integrations/googlecalendar/callback`
- **Format for GOOGLE_API_CREDENTIALS:**
  ```json
  {"web":{"client_id":"...","client_secret":"...","redirect_uris":["https://...callback"]}}
  ```

---

## Phase 1: Group Polls Implementation

### Development Approach (2025-11-27)

#### Codebase Exploration Before Implementation
Launched 5 parallel Explore agents to understand Cal.com patterns:
1. **Availability System** - `AvailableSlotsService`, `BusyTimesService`, `getUserAvailability`
2. **Booking Creation** - `createBooking()`, `EventManager`, `BookingEmailSmsHandler`
3. **Teams System** - `Team`, `Membership`, `Host` models
4. **UI Components** - Radix UI + Tailwind CSS, `DatePicker`, `Dialog`, `Form`
5. **Public Pages** - `(booking-page-wrapper)` route group, `publicProcedure`

Key findings documented in `docs/ARCHITECTURE.md`.

#### tRPC Router Patterns Learned

Cal.com uses dynamic imports for handlers to enable code-splitting:
```typescript
// DON'T: Direct import
import { createHandler } from "./create.handler";
export const create = authedProcedure.mutation(createHandler);

// DO: Dynamic import
export const create = authedProcedure.mutation(async (opts) => {
  const { createHandler } = await import("./create.handler");
  return createHandler(opts);
});
```

Public procedures use `publicProcedure` from `"../../procedures/publicProcedure"`.

#### Prisma Schema Patterns

1. **IDs:** Cal.com uses `@id @default(autoincrement())` for most models (not UUID)
2. **Time fields:** Use `@db.Time` for time-only storage (PostgreSQL TIME type)
3. **Date fields:** Use `@db.Date` for date-only storage (PostgreSQL DATE type)
4. **Relations:** Must add both sides of relation (e.g., User.groupPollsCreated AND GroupPoll.createdBy)
5. **Indexes:** Add `@@index` for foreign keys and commonly queried fields

#### UI Component Patterns

1. **Skeleton Loading:** Use `SkeletonText` not `Skeleton` for simple loading states:
   ```typescript
   // Wrong - Skeleton requires as prop and children
   <Skeleton className="h-5 w-48" />

   // Correct - SkeletonText just needs className
   <SkeletonText className="h-5 w-48" />
   ```

2. **Form Components:** Import from `@calcom/ui/components/form`:
   - `Form` - Wrapper with react-hook-form integration
   - `TextField`, `TextAreaField`, `EmailField` - Input fields
   - `SelectField` - Dropdown with react-select
   - `DateRangePicker` - Date range selection

3. **Page Structure:**
   - Server Component in `app/` for auth and metadata
   - Client Component in `modules/` for interactive UI
   - Path alias: `~/module-name/*` maps to `modules/module-name/*`

#### Route Group Conventions

| Route Group | Purpose | Auth |
|-------------|---------|------|
| `(use-page-wrapper)` | Authenticated pages with full chrome | Required |
| `(main-nav)` | Pages with main navigation sidebar | Required |
| `(booking-page-wrapper)` | Public booking pages | Optional |
| `(settings-layout)` | Settings pages | Required |

#### Files Modified in Cal.com Core

Minimal changes to existing Cal.com files:
1. `packages/prisma/schema.prisma` - Added 4 new models, 2 enums, User relations
2. `packages/trpc/server/routers/viewer/_router.tsx` - Added groupPolls import
3. `packages/trpc/server/routers/publicViewer/_router.tsx` - Added poll endpoints

### Lessons Learned

1. **Read existing code first** - Cal.com has specific patterns; copying from similar features saves time
2. **Check component props** - UI components have specific requirements (e.g., SkeletonText vs Skeleton)
3. **Use TypeScript inference** - `RouterOutputs["viewer"]["groupPolls"]["list"]` for response types
4. **Handler return types** - Don't use `_count` if you're computing values; just return named fields

---

## Phase 2: Booking Integration (2025-11-28)

### Bug Fixes During Testing

#### Event Type Dropdown Empty
- **Symptom:** Event Type selector in poll creation showed "You need to create an event type first" despite having 10 event types
- **Root Cause:** Code expected `eventTypesData.eventTypeGroups` but `viewer.eventTypes.list` returns an array directly
- **Fix:** Changed data access in `group-polls-create-view.tsx`:
  ```typescript
  // Before (broken):
  const eventTypeOptions = (eventTypesData?.eventTypeGroups || [])
    .flatMap((group) => group.eventTypes)
    .map((et) => ({ value: et.id, label: `${et.title}...` }));

  // After (fixed):
  const eventTypeOptions = (eventTypesData || []).map((et) => ({
    value: et.id,
    label: `${et.title} (${et.length} min)`,
  }));
  ```

#### Prisma Client Stale After Schema Changes
- **Symptom:** Poll creation failed with "Unknown argument `eventTypeId`"
- **Root Cause:** Schema was updated but Prisma client wasn't regenerated
- **Fix:** Run `yarn workspace @calcom/prisma prisma generate` then restart dev server
- **Note:** Hot reload doesn't pick up Prisma client changes - must restart

#### Date Display Off-By-One (Known Issue)
- **Symptom:** UI shows "Sunday, November 30" but database has "2025-12-01" (Monday, December 1)
- **Root Cause:** Timezone handling in date display - likely UTC vs local timezone conversion
- **Status:** Not fixed yet - data is correct in DB, just display issue
- **Impact:** Minor - booking is created with correct date

### Booking Integration Architecture

The booking flow creates a Cal.com booking record:
1. User selects time slot from heat map
2. Confirmation dialog shows event type, time, and invitees
3. `book.handler.ts` creates booking via direct Prisma insert:
   - Creates `Booking` record with status `ACCEPTED`
   - Creates `Attendee` records for available participants
   - Sets metadata with `source: "group-poll"`, `pollId`, `pollTitle`
4. Updates `GroupPoll` record:
   - Sets `status` to `BOOKED`
   - Links `bookingId`
   - Stores `selectedDate`, `selectedStartTime`, `selectedEndTime`

**Note:** ~~Current implementation creates booking record but doesn't trigger Cal.com's full booking flow.~~ **UPDATED:** EventManager integration added in Phase 2B.

---

## Phase 2B: Bug Fixes & Calendar Sync (2025-11-29)

### Timezone Bug Fix

**Problem:** Dates displayed incorrectly (e.g., "Monday, November 30" instead of "Tuesday, December 1")

**Root Cause:** JavaScript's `new Date("YYYY-MM-DD")` interprets the date string as UTC midnight. In western timezones (e.g., PST = UTC-8), this displays as the previous day.

```typescript
// Wrong - interprets as UTC
new Date("2025-12-02")  // → Mon Dec 01 2025 16:00:00 GMT-0800 (Pacific)

// Correct - interprets as local midnight
const [year, month, day] = "2025-12-02".split("-").map(Number);
new Date(year, month - 1, day)  // → Tue Dec 02 2025 00:00:00 GMT-0800 (Pacific)
```

**Solution:** Parse YYYY-MM-DD strings manually to create local-timezone dates:

```typescript
function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day); // Local midnight
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
```

**Files Fixed:**
1. `apps/web/modules/group-polls/views/group-polls-detail-view.tsx` - `formatDate()`
2. `apps/web/modules/group-polls/components/HeatMap.tsx` - `formatDateHeading()`
3. `apps/web/modules/group-polls/views/poll-response-view.tsx` - `formatDate()`

### EventManager Integration for Calendar Sync

**Goal:** Create Google Calendar events when booking from a poll.

**Implementation:** Added to `packages/trpc/server/routers/viewer/groupPolls/book.handler.ts`:

1. **Fetch Credentials:**
   ```typescript
   const organizer = await prisma.user.findUnique({
     where: { id: ctx.user.id },
     select: {
       credentials: { select: credentialForCalendarServiceSelect },
       destinationCalendar: true,
       // ...
     },
   });
   ```

2. **Build CalendarEvent:**
   ```typescript
   const calendarEvent: CalendarEvent = {
     type: poll.eventType.title,
     title: booking.title,
     description: poll.description || "",
     startTime: startDateTime.toISOString(),
     endTime: endDateTime.toISOString(),
     organizer: organizerPerson,
     attendees: attendeesForCalendar,
     uid: booking.uid,
     destinationCalendar: organizer.destinationCalendar ? [organizer.destinationCalendar] : null,
   };
   ```

3. **Create Calendar Event:**
   ```typescript
   const credentialsWithDelegation = organizer.credentials.map((cred) => ({
     ...cred,
     delegatedTo: null,  // Required by CredentialForCalendarService type
   }));

   const eventManager = new EventManager({
     credentials: credentialsWithDelegation,
     destinationCalendar: organizer.destinationCalendar,
   });

   const calendarResults = await eventManager.create(calendarEvent);
   ```

4. **Store BookingReference:**
   ```typescript
   if (calendarResults?.referencesToCreate?.length) {
     await prisma.bookingReference.createMany({
       data: calendarResults.referencesToCreate.map((ref) => ({
         bookingId: booking.id,
         type: ref.type,
         uid: ref.uid || "",
         // ...
       })),
     });
   }
   ```

**Key Learnings:**
- `CalendarEvent.destinationCalendar` expects an array, not single object
- `CredentialForCalendarService` requires `delegatedTo` field (set to `null` for group polls)
- Wrap in try/catch - calendar sync is secondary to booking creation
- Check server logs for "EventManager" messages to debug calendar integration

---

## Phase 5: Public Poll Link & QR Code Sharing (2025-11-29)

### Public Poll Architecture

**Design Decision:** Single shareable URL where anyone can submit availability for any participant.

**UX Flow:**
1. Organizer clicks "Share Poll" button on poll detail page
2. Dialog shows QR code and shareable URL (`/poll/[shareSlug]`)
3. Anyone with the link can access the public poll page
4. User selects one or more participants from searchable dropdown
5. User selects availability time slots from heat map
6. User submits availability for all selected participants at once

**Key Design Choices:**
- **Multi-select dropdown**: Allow submitting for multiple participants (e.g., assistant scheduling for team)
- **Searchable**: Filter participants by name or email
- **"Responded" badge**: Shows which participants have already submitted
- **Pre-population**: When selecting a participant, loads their existing responses
- **Anonymous heat map**: Public view shows counts only (e.g., "3/5") not names for privacy

### Files Created

**tRPC Endpoints:**
```
packages/trpc/server/routers/publicViewer/getPollByShareSlug.handler.ts
packages/trpc/server/routers/publicViewer/submitMultiPollResponse.handler.ts
packages/trpc/server/routers/publicViewer/groupPollResponse.schema.ts (updated)
packages/trpc/server/routers/publicViewer/_router.tsx (updated)
```

**Pages & Components:**
```
apps/web/app/(booking-page-wrapper)/poll/[shareSlug]/page.tsx
apps/web/modules/group-polls/views/public-poll-view.tsx
apps/web/modules/group-polls/components/ShareDialog.tsx
apps/web/modules/group-polls/components/index.ts (updated)
apps/web/modules/group-polls/views/group-polls-detail-view.tsx (updated)
```

### QR Code Implementation

Used `react-qr-code` library (already in Cal.com dependencies):

```typescript
import QRCode from "react-qr-code";

<QRCode
  value={shareUrl}
  size={200}
  level="M"
  bgColor="#ffffff"
  fgColor="#000000"
/>
```

**Download QR as PNG:**
1. Serialize SVG to blob
2. Draw to canvas with padding
3. Export canvas as PNG blob
4. Create download link

```typescript
const svg = qrRef.current.querySelector("svg");
const svgData = new XMLSerializer().serializeToString(svg);
const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
const svgUrl = URL.createObjectURL(svgBlob);

const img = new Image();
img.onload = () => {
  ctx.drawImage(img, padding, padding, size, size);
  canvas.toBlob((blob) => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${pollTitle}-qr.png`;
    link.click();
  }, "image/png");
};
img.src = svgUrl;
```

### Multi-Participant Response Submission

**Schema for multi-participant submit:**
```typescript
export const ZSubmitMultiPollResponseSchema = z.object({
  shareSlug: z.string(),
  participantIds: z.array(z.number()).min(1, "Select at least one participant"),
  availability: z.array(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      startTime: z.string().regex(/^\d{2}:\d{2}$/),
      endTime: z.string().regex(/^\d{2}:\d{2}$/),
    })
  ),
});
```

**Handler logic:**
1. Find poll by shareSlug
2. Validate all participantIds belong to this poll
3. For each participant:
   - Delete existing responses (replace mode)
   - Create new responses for selected time slots
   - Mark participant as `hasResponded: true`
4. Return count of updated participants

### Cal.com UI Component Discovery

**Select component import:**
```typescript
// Correct import path for multi-select:
import { Select } from "@calcom/ui/components/form";

// NOT from "@calcom/ui/components/form/select" (doesn't exist)
```

**Multi-select with custom formatting:**
```typescript
<Select<ParticipantOption, true>
  isMulti
  isSearchable
  placeholder="Search and select participants..."
  options={participantOptions}
  value={selectedParticipants}
  onChange={handleParticipantChange}
  formatOptionLabel={(option) => (
    <div className="flex items-center justify-between">
      <span>{option.label}</span>
      {option.hasResponded && (
        <Badge variant="success" size="sm">Responded</Badge>
      )}
    </div>
  )}
/>
```

---

## Phase 1C: Code Quality & Production Hardening (2025-11-29)

### Timezone Strategy

**Key Principle:** UTC for storage, local time for display and Cal.com bookings.

```typescript
// Storage layer (timeUtils.ts) - UTC
parseTimeString("09:30")  // → Date with UTC hours/minutes
parseDateString("2025-12-01")  // → Date at UTC midnight
formatTime(date)  // → "HH:MM" from UTC
formatDateISO(date)  // → "YYYY-MM-DD" from UTC

// Display layer (dateFormatting.ts) - Local time
formatDateForDisplay("2025-12-01")  // → "Mon, Dec 1" in local timezone

// Booking creation (book.handler.ts) - Local time
combineDateAndTime("2025-12-01", "09:30")  // → Local date for Cal.com
```

**Why?** Cal.com's booking system expects local time. The poll storage uses UTC for consistency.

### Structured Logging Pattern

```typescript
import logger from "@calcom/lib/logger";
const log = logger.getSubLogger({ prefix: ["groupPolls", "handlerName"] });

// Usage
log.info("Operation completed", { pollId, userId, details });
log.warn("Partial failure", { context, error: error.message });
log.error("Operation failed", { fullContext });
```

### Race Condition Prevention

```typescript
// In book.handler.ts - Use Prisma transaction with double-check
const { booking, updatedPoll } = await prisma.$transaction(async (tx) => {
  // Re-check poll isn't already booked (prevents race condition)
  const freshPoll = await tx.groupPoll.findUnique({
    where: { id: pollId },
    select: { bookingId: true },
  });

  if (freshPoll?.bookingId) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "This poll was just booked by another request.",
    });
  }

  // Create booking and update poll atomically
  // ...
});
```

### Calendar Retry Logic

```typescript
const CALENDAR_RETRY_ATTEMPTS = 2;
const CALENDAR_RETRY_DELAY_MS = 1000;

async function withRetry<T>(
  operation: () => Promise<T>,
  context: { pollId: number; bookingId: number }
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= CALENDAR_RETRY_ATTEMPTS; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < CALENDAR_RETRY_ATTEMPTS) {
        log.warn("Calendar operation failed, retrying", {
          ...context, attempt, error: lastError.message
        });
        await new Promise(r => setTimeout(r, CALENDAR_RETRY_DELAY_MS));
      }
    }
  }
  throw lastError;
}
```

### Test Coverage

**Unit Tests (39 total):**
- `packages/features/group-polls/lib/__tests__/timeUtils.test.ts` - 24 tests
- `packages/features/group-polls/lib/__tests__/heatMapCalculation.test.ts` - 15 tests

**E2E Tests (7 total):**
- `apps/web/playwright/group-polls.e2e.ts`
- Poll CRUD, public response, booking flow

### ARIA Accessibility

```typescript
// HeatMapCell.tsx
const ariaLabel = isSelected
  ? `Time slot ${cell.startTime} to ${cell.endTime}, ${cell.responseCount} of ${cell.totalParticipants} available, selected`
  : `Time slot ${cell.startTime} to ${cell.endTime}, ${cell.responseCount} of ${cell.totalParticipants} available`;

<button
  aria-label={ariaLabel}
  aria-pressed={isSelected}
  data-testid="time-slot-button"
  // ...
>
```
