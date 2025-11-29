# Cadre Group Polls — Technical Design

> **Document Status:** Living Document
> **Last Updated:** 2025-11-27
> **Owner:** Ben @ Cadre AI

---

## 1. Architecture Overview

### Strategic Decision: Build INTO Cal.com

Group Polls will be implemented as a new feature module within a self-hosted Cal.com instance, not as a separate application.

**Rationale:**
- Post-MVP features (1:1 booking, round-robin, workflows, etc.) already exist in Cal.com
- Direct access to calendar sync, booking creation, notifications
- Single unified system for Cadre scheduling needs
- Avoids API integration overhead

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Cal.com (Self-Hosted)                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │               GROUP POLLS MODULE (New)                   │   │
│  │                                                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│  │  │ Poll Create │  │ Poll Respond│  │ Poll Results│     │   │
│  │  │    Page     │  │    Page     │  │    Page     │     │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │   │
│  │         │                │                │             │   │
│  │         ▼                ▼                ▼             │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │            tRPC API Routes (New)                │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  │         │                                │             │   │
│  │         ▼                                ▼             │   │
│  │  ┌──────────────┐              ┌──────────────────┐   │   │
│  │  │ Poll Tables  │              │ Existing Cal.com │   │   │
│  │  │   (New)      │              │ Tables (Users,   │   │   │
│  │  │              │              │ Bookings, etc.)  │   │   │
│  │  └──────────────┘              └──────────────────┘   │   │
│  │                                         │             │   │
│  └─────────────────────────────────────────│─────────────┘   │
│                                            │                 │
│  ┌─────────────────────────────────────────│─────────────┐   │
│  │         EXISTING CAL.COM MODULES        │             │   │
│  │                                         ▼             │   │
│  │  • Event Types          • Google Calendar Integration │   │
│  │  • Booking System       • Notification System         │   │
│  │  • User Management      • Slack Integration           │   │
│  │  • Workflows            • Webhooks                    │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                               │
└───────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Google Calendar │
                    │       API        │
                    └──────────────────┘
```

---

## 2. Cal.com Technical Stack

Understanding Cal.com's architecture for context:

| Layer | Technology | Notes |
|-------|------------|-------|
| **Monorepo** | Turborepo | Multiple packages in single repo |
| **Framework** | Next.js 15.5.4 (App Router) | Pages in `apps/web/app/` |
| **Language** | TypeScript | Strict mode |
| **Database** | PostgreSQL | Via Prisma ORM |
| **ORM** | Prisma | Schema in `packages/prisma/` |
| **API** | tRPC | Type-safe API routes |
| **Styling** | Tailwind CSS | Utility-first |
| **UI Components** | Custom + Radix | In `packages/ui/` |
| **Auth** | NextAuth.js | Session-based |
| **Calendar Sync** | Cal.com abstractions | Google Calendar, Outlook, etc. |

### Key Directories

```
cal.com/
├── apps/
│   └── web/                    # Main Next.js application
│       ├── app/                # App router pages
│       ├── pages/              # Legacy pages (being migrated)
│       └── public/             # Static assets
├── packages/
│   ├── prisma/                 # Database schema & migrations
│   ├── trpc/                   # tRPC routers and procedures
│   ├── ui/                     # Shared UI components
│   ├── lib/                    # Shared utilities
│   └── features/               # Feature-specific code
└── ...
```

---

## 3. Database Schema (New Tables)

### Prisma Schema Additions

```prisma
// packages/prisma/schema.prisma

model GroupPoll {
  id              Int               @id @default(autoincrement())
  title           String
  description     String?
  durationMinutes Int               @default(60)
  dateRangeStart  DateTime
  dateRangeEnd    DateTime
  status          GroupPollStatus   @default(ACTIVE)
  shareSlug       String            @unique
  createdById     Int
  createdBy       User              @relation(fields: [createdById], references: [id], onDelete: Cascade)
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  // Relations
  windows         GroupPollWindow[]
  participants    GroupPollParticipant[]

  @@index([createdById])
  @@index([shareSlug])
  @@index([status])
}

enum GroupPollStatus {
  ACTIVE
  BOOKED
  CLOSED
  EXPIRED
}

model GroupPollWindow {
  id        Int       @id @default(autoincrement())
  pollId    Int
  poll      GroupPoll @relation(fields: [pollId], references: [id], onDelete: Cascade)
  date      DateTime  @db.Date
  startTime DateTime  @db.Time
  endTime   DateTime  @db.Time

  @@index([pollId])
  @@unique([pollId, date, startTime, endTime])
}

enum ParticipantType {
  CADRE_REQUIRED
  CADRE_OPTIONAL
  CLIENT
}

model GroupPollParticipant {
  id           Int              @id @default(autoincrement())
  pollId       Int
  poll         GroupPoll        @relation(fields: [pollId], references: [id], onDelete: Cascade)
  type         ParticipantType
  userId       Int?             // Cal.com user ID if Cadre member
  user         User?            @relation(fields: [userId], references: [id])
  name         String
  email        String
  hasResponded Boolean          @default(false)
  respondedAt  DateTime?
  accessToken  String           @unique @default(cuid()) // For client response URL (cuid for unguessable tokens)
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt

  // Relations
  responses    GroupPollResponse[]

  @@index([pollId])
  @@index([email])
  @@index([accessToken])
}

model GroupPollResponse {
  id            Int                   @id @default(autoincrement())
  pollId        Int
  participantId Int
  participant   GroupPollParticipant  @relation(fields: [participantId], references: [id], onDelete: Cascade)
  date          DateTime              @db.Date
  startTime     DateTime              @db.Time
  endTime       DateTime              @db.Time
  createdAt     DateTime              @default(now())
  updatedAt     DateTime              @updatedAt

  @@index([pollId])
  @@index([participantId])
}
```

### Migration Strategy

1. Create new migration file: `packages/prisma/migrations/YYYYMMDD_add_group_polls/`
2. Run `prisma migrate dev` in development
3. Apply to production via deployment pipeline

---

## 4. API Design (tRPC Routes)

### New Router: `groupPolls`

Location: `packages/trpc/server/routers/viewer/groupPolls/`

```typescript
// packages/trpc/server/routers/viewer/groupPolls/_router.ts

import { router } from "../../../trpc";
import { createPoll } from "./createPoll.handler";
import { updatePoll } from "./updatePoll.handler";
import { getPoll } from "./getPoll.handler";
import { getMyPolls } from "./getMyPolls.handler";
import { addParticipant } from "./addParticipant.handler";
import { closePoll } from "./closePoll.handler";
import { bookFromPoll } from "./bookFromPoll.handler";
import { getTeamAvailability } from "./getTeamAvailability.handler";

export const groupPollsRouter = router({
  // Authenticated routes (Cadre team)
  create: createPoll,
  update: updatePoll,
  get: getPoll,
  getMyPolls: getMyPolls,
  addParticipant: addParticipant,
  close: closePoll,
  book: bookFromPoll,
  getTeamAvailability: getTeamAvailability,
});
```

### Public Router (for client responses)

```typescript
// packages/trpc/server/routers/publicViewer/groupPollResponse/_router.ts

import { router } from "../../../trpc";
import { getPollByToken } from "./getPollByToken.handler";
import { submitResponse } from "./submitResponse.handler";
import { updateResponse } from "./updateResponse.handler";

export const groupPollResponseRouter = router({
  // Public routes (no auth required)
  getByToken: getPollByToken,       // Get poll details for response page
  submit: submitResponse,           // Submit availability
  update: updateResponse,           // Edit existing response
});
```

### Key Procedure Definitions

```typescript
// createPoll.handler.ts
export const createPoll = authedProcedure
  .input(z.object({
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    durationMinutes: z.number().int().min(15).max(480),
    dateRangeStart: z.date(),
    dateRangeEnd: z.date(),
    windows: z.array(z.object({
      date: z.date(),
      startTime: z.string(), // "09:00"
      endTime: z.string(),   // "12:00"
    })),
    participants: z.array(z.object({
      type: z.enum(["CADRE_REQUIRED", "CADRE_OPTIONAL", "CLIENT"]),
      userId: z.number().optional(),
      name: z.string(),
      email: z.string().email(),
    })),
  }))
  .mutation(async ({ ctx, input }) => {
    // Implementation
  });

// getPollByToken.handler.ts (public)
export const getPollByToken = publicProcedure
  .input(z.object({
    accessToken: z.string(),
  }))
  .query(async ({ input }) => {
    // Returns poll details + anonymous heat map
    // Does NOT include participant names (only "invited" vs "responded")
  });

// submitResponse.handler.ts (public)
export const submitResponse = publicProcedure
  .input(z.object({
    accessToken: z.string(),
    name: z.string(),
    email: z.string().email(),
    availability: z.array(z.object({
      date: z.date(),
      startTime: z.string(),
      endTime: z.string(),
    })),
  }))
  .mutation(async ({ input }) => {
    // Save response, trigger Slack notification if applicable
  });
```

---

## 5. UI Components

### New Pages

| Page | Route | Auth | Purpose |
|------|-------|------|---------|
| Poll List | `/group-polls` | Required | View all my polls |
| Create Poll | `/group-polls/new` | Required | Create new poll |
| Poll Detail | `/group-polls/[id]` | Required | View results, manage, book |
| Poll Response | `/p/[accessToken]` | Public | Client enters availability |

### Key Components to Build

```
packages/features/group-polls/
├── components/
│   ├── PollCreateForm.tsx          # Multi-step poll creation
│   ├── WindowSelector.tsx          # Drag-to-select time windows
│   ├── ParticipantManager.tsx      # Add/manage participants
│   ├── TeamAvailabilityGrid.tsx    # Show team's calendar availability
│   ├── AvailabilityInput.tsx       # Client-facing drag-to-select
│   ├── HeatMap.tsx                 # Results visualization
│   ├── HeatMapToggle.tsx           # All vs Required toggle
│   ├── PollCard.tsx                # Summary card for list view
│   ├── ShareDialog.tsx             # Link + QR code
│   └── BookingConfirmDialog.tsx    # Confirm slot selection
├── lib/
│   ├── heatMapCalculation.ts       # Overlap calculation logic
│   ├── slotFinder.ts               # Find valid meeting slots
│   └── qrCode.ts                   # QR code generation
└── hooks/
    ├── usePoll.ts                  # Poll data fetching
    ├── useTeamAvailability.ts      # Fetch team calendars
    └── useHeatMap.ts               # Heat map state management
```

### Time Grid Component Design

```typescript
// WindowSelector.tsx - Used by poll creator

interface TimeSlot {
  date: Date;
  time: string; // "09:00", "09:30", etc.
  isSelected: boolean;
  isAvailable: boolean; // From team calendar check
}

interface WindowSelectorProps {
  dateRange: { start: Date; end: Date };
  teamUserIds: number[];
  selectedWindows: TimeWindow[];
  onWindowsChange: (windows: TimeWindow[]) => void;
}

// Visual design:
// - Grid with days as columns, 30-min slots as rows
// - Slots where team is unavailable are grayed out
// - Click-and-drag to select proposed windows
// - Selected windows highlighted in Cadre brand color
```

```typescript
// AvailabilityInput.tsx - Used by client responders

interface AvailabilityInputProps {
  windows: TimeWindow[];           // Proposed windows to respond within
  existingResponses?: TimeRange[]; // For editing
  anonymousHeatMap: HeatMapData;   // Show others' availability
  onSubmit: (availability: TimeRange[]) => void;
}

// Visual design:
// - Only shows time slots within proposed windows
// - Background color indicates heat map (others' availability)
// - Client drags to paint their own availability on top
// - Clear visual distinction between "available" and "not marked"
```

### Heat Map Visualization

```typescript
// HeatMap.tsx

interface HeatMapProps {
  poll: GroupPoll;
  responses: GroupPollResponse[];
  participants: GroupPollParticipant[];
  mode: "all" | "required"; // Toggle
  meetingDuration: number;
  onSlotSelect: (slot: TimeSlot) => void;
}

// Color scale:
// - 0% available: Gray/empty
// - 25% available: Light blue
// - 50% available: Medium blue  
// - 75% available: Dark blue
// - 100% available: Green with border/icon indicator

// Meeting-duration awareness:
// - Only highlight slots where contiguous time >= duration
// - "100% available" only if ALL required can attend for full duration
```

---

## 6. Calendar Integration

### Reading Team Availability

Cal.com already abstracts calendar providers. We'll use existing utilities:

```typescript
// lib/getTeamAvailability.ts

import { getBusyTimes } from "@calcom/core/getBusyTimes";

export async function getTeamAvailability(
  userIds: number[],
  dateRange: { start: Date; end: Date }
): Promise<AvailabilityByUser> {
  
  const results = await Promise.all(
    userIds.map(async (userId) => {
      const busyTimes = await getBusyTimes({
        userId,
        dateFrom: dateRange.start,
        dateTo: dateRange.end,
        // ... other params
      });
      
      return {
        userId,
        busyTimes,
      };
    })
  );
  
  return results;
}
```

### Creating Bookings

When poll creator selects a winning slot:

```typescript
// lib/bookFromPoll.ts

import { createBooking } from "@calcom/core/booking";

export async function bookFromPoll(
  poll: GroupPoll,
  selectedSlot: TimeSlot,
  attendeeParticipantIds: string[]
): Promise<Booking> {
  
  // Get participants who are available for this slot
  const attendees = await getParticipantsForSlot(poll.id, selectedSlot);
  
  // Create booking using Cal.com's booking system
  const booking = await createBooking({
    eventTypeId: poll.eventTypeId, // May need to create a generic event type
    start: selectedSlot.start,
    end: selectedSlot.end,
    attendees: attendees.map(p => ({
      name: p.name,
      email: p.email,
    })),
    // ... other booking params
  });
  
  // Update poll status
  await prisma.groupPoll.update({
    where: { id: poll.id },
    data: { status: "BOOKED" },
  });
  
  return booking;
}
```

---

## 7. Notifications

### Slack Integration

Cal.com has existing Slack integration. We'll extend it for poll events.

```typescript
// lib/notifications/pollNotifications.ts

import { sendSlackMessage } from "@calcom/app-store/slack/lib/sendMessage";

export async function notifyPollResponse(
  poll: GroupPoll,
  respondent: GroupPollParticipant,
  isMustHave: boolean,
  allResponded: boolean
) {
  const cadreParticipants = await getCadreParticipants(poll.id);
  
  // Determine which notification to send
  if (allResponded) {
    await sendSlackMessage({
      channel: getSlackChannelForPoll(poll), // Could be group DM
      text: `✅ All participants have responded to poll "${poll.title}"`,
      blocks: buildAllRespondedBlocks(poll),
    });
  } else if (isMustHave) {
    await sendSlackMessage({
      channel: getSlackChannelForPoll(poll),
      text: `📋 ${respondent.name} (required) responded to poll "${poll.title}"`,
      blocks: buildMustHaveRespondedBlocks(poll, respondent),
    });
  }
}
```

### Notification Triggers

| Event | Trigger | Recipients |
|-------|---------|------------|
| Must-have participant responds | On response submit | All Cadre members on poll (Slack DM) |
| All participants responded | On last response | All Cadre members on poll (Slack DM) |
| Poll booked | On booking creation | All participants (via Cal.com email) |

---

## 8. QR Code Generation

```typescript
// lib/qrCode.ts

import QRCode from "qrcode";

export async function generatePollQRCode(
  shareUrl: string,
  options?: { size?: number; color?: string }
): Promise<string> {
  const { size = 200, color = "#0066CC" } = options ?? {};
  
  const qrDataUrl = await QRCode.toDataURL(shareUrl, {
    width: size,
    margin: 2,
    color: {
      dark: color,
      light: "#FFFFFF",
    },
  });
  
  return qrDataUrl;
}
```

---

## 9. Security Considerations

### Access Control

| Resource | Who Can Access | Mechanism |
|----------|---------------|-----------|
| Create poll | Authenticated Cal.com users | Session auth |
| View poll results | Poll creator only | `createdById` check |
| Edit poll | Poll creator only | `createdById` check |
| Respond to poll | Anyone with access token | Unique token per participant |
| View other responses | Only as anonymous heat map | No PII exposed |

### Data Privacy

- Client participant emails stored but not exposed to other clients
- Heat map shows aggregate data only (counts, not names)
- Participant list shows names but not response details to other clients
- Access tokens are unique per participant (can't guess others' links)

### Input Validation

All inputs validated via Zod schemas in tRPC procedures:
- Date ranges must be valid and in future
- Time windows must be within date range
- Email addresses validated
- Participant names sanitized

---

## 10. Deployment Architecture

### Self-Hosted Cal.com

```
┌─────────────────────────────────────────────────┐
│              Cloud Provider (Railway/Render)     │
│                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    │
│  │   Cal.com App   │    │   PostgreSQL    │    │
│  │   (Next.js)     │◄──►│   Database      │    │
│  │                 │    │                 │    │
│  └────────┬────────┘    └─────────────────┘    │
│           │                                     │
│           │ HTTPS                               │
└───────────┼─────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────┐
│              External Services                   │
│                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────────────┐ │
│  │ Google  │  │  Slack  │  │  (Future: Resend│ │
│  │Calendar │  │   API   │  │   for email)    │ │
│  └─────────┘  └─────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Environment Variables (Additions)

```bash
# .env additions for Group Polls

# Slack Bot (for notifications)
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...

# QR Code branding
QR_CODE_BRAND_COLOR=#0066CC

# Poll settings
POLL_DEFAULT_DURATION_DAYS=14
POLL_MAX_DURATION_DAYS=28
```

---

## 11. Testing Strategy

### Unit Tests

- Heat map calculation logic
- Slot validation (meeting fits within availability)
- Access token generation/validation
- Time window overlap detection

### Integration Tests

- Poll creation flow (API)
- Response submission flow (API)
- Booking creation from poll
- Slack notification delivery

### E2E Tests

- Full poll lifecycle (create → share → respond → book)
- Mobile response flow
- Heat map interaction

---

## 12. Migration Path from Cal.com Updates

### Strategy: Isolated Changes

Keep Group Polls code in dedicated locations:
- `/packages/features/group-polls/` — all feature code
- `/packages/prisma/schema.prisma` — new models only (no edits to existing)
- `/packages/trpc/server/routers/viewer/groupPolls/` — dedicated router
- `/apps/web/app/group-polls/` — dedicated pages

### When Updating Cal.com

1. Pull latest Cal.com release
2. Run `git diff` on:
   - `schema.prisma` (merge new models)
   - `trpc/server/routers/viewer/_router.ts` (re-add groupPolls import)
3. Run migrations
4. Test Group Polls features

**Low-conflict areas:** New tables, new routes, new pages
**Watch areas:** If Cal.com changes tRPC setup or Prisma conventions

---

## 13. Open Technical Questions

| Question | Options | Recommendation |
|----------|---------|----------------|
| Where to store poll share links? | Subdomain (`polls.cadre.ai`) vs path (`cal.cadre.ai/p/xxx`) | Path-based for MVP (simpler) |
| How to handle poll event type? | Create hidden event type per poll vs generic "Group Meeting" type | Generic type for MVP |
| QR code generation | Server-side vs client-side | Client-side (reduces server load, QRCode.js) |
| Heat map rendering | Canvas vs SVG vs DOM grid | DOM grid with Tailwind (simplest, good enough perf) |

---

## 14. Implementation Notes (Phase 1)

### Schema Differences from Design
The implemented schema closely follows the design with these refinements:

1. **Time Storage:** Used `@db.Time` for startTime/endTime (PostgreSQL TIME type)
2. **Date Storage:** Used `@db.Date` for date fields (PostgreSQL DATE type)
3. **Access Token:** Using `cuid()` default for unguessable participant tokens
4. **User Relations:** Added explicit relations on User model for polls and participations

### API Implementation Differences

1. **Handler Pattern:** Used Cal.com's dynamic import pattern for handlers:
   ```typescript
   create: authedProcedure.input(schema).mutation(async (opts) => {
     const { createHandler } = await import("./create.handler");
     return createHandler(opts);
   })
   ```

2. **Public Router Location:** Added to existing `publicViewer` router instead of separate `groupPollResponse` router

3. **Share Slug vs Share Link:** Used `shareSlug` (nanoid) stored in DB; full URL constructed at runtime

### UI Implementation Patterns

1. **Route Groups:**
   - Authenticated pages in `(use-page-wrapper)/(main-nav)/group-polls/`
   - Public response page in `(booking-page-wrapper)/p/[accessToken]/`

2. **Module Structure:** View components in `apps/web/modules/group-polls/views/`

3. **Path Alias:** Using `~/group-polls/*` which maps to `modules/group-polls/*`

4. **Component Reuse:** Using Cal.com's existing components:
   - `@calcom/ui/components/form` - Form, TextField, Select, etc.
   - `@calcom/ui/components/button` - Button
   - `@calcom/ui/components/badge` - Status badges
   - `@calcom/ui/components/skeleton` - Loading states

### Lessons Learned During Implementation

1. **tRPC Endpoint Registration:** New routers must be added to the `ENDPOINTS` array in `packages/trpc/server/shared.ts` for proper routing. Without this, API calls return 404.

2. **Date/Time Serialization:**
   - Prisma `@db.Time` columns return DateTime objects with 1970-01-01 dates - extract HH:mm for display
   - Frontend sends date strings (YYYY-MM-DD), so use `z.string().regex()` validation instead of `z.date()`
   - Use `Date.UTC()` for consistent UTC handling to avoid timezone issues

3. **API Route Handlers:** Cal.com requires explicit route handlers in `apps/web/app/api/trpc/[trpc]/route.ts` for endpoint routing

### Manual Testing Completed (Phase 1B + Phase 2)
Full manual browser testing of the Group Polls flow:
- Create poll → View poll list → Share link → Public response page → Submit availability → View results
- All core flows verified working
- **Phase 2 Booking Flow (2025-11-28):** Create poll with event type → Submit responses → Select slot from heat map → Confirm booking → Poll status changes to BOOKED → Booking record created with attendees

### Automated Testing (Phase 1B)
- ✅ Unit tests for heat map calculation (15 passing)
- ✅ E2E tests (Playwright - 6 passing, 1 skipped)
  - Poll creation, list view, detail view, deletion, share link copy

### What's Implemented
- ✅ Heat map visualization (HeatMapCell, HeatMapLegend, HeatMap components)
- ✅ Booking from poll (`book.handler.ts` - creates Cal.com booking)
- ✅ Email invitations (GroupPollInviteEmail template)
- ✅ Event Type integration (selector in create form, linked to booking)

### What's Not Yet Implemented
- Team calendar availability fetch (getTeamAvailability) - shows proposed windows, not live busy times
- Slack notifications (must-have responded, all responded)
- QR code generation
- Poll editing after creation
- Google Calendar sync for created bookings (booking creates record, but doesn't sync to Google Calendar)

---

## 15. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2024-01-XX | Claude + Ben | Initial technical design |
| 2025-11-27 | Claude + Ben | Updated to Next.js 15.5.4, changed IDs from cuid to autoincrement (matching Cal.com conventions) |
| 2025-11-27 | Claude + Ben | Added Section 14: Implementation Notes documenting Phase 1 build decisions |
| 2025-11-27 | Claude + Ben | Added lessons learned (ENDPOINTS array, date serialization), testing status |
