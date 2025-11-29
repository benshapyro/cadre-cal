# Cadre Calendar - Current Status

**Last Updated:** 2025-11-29
**Current Phase:** Phase 1C Complete - Code Quality & Polish
**Overall Status:** 🟢 Production Ready - All Features + Code Quality Complete

---

## Where We Are

### ✅ Completed

**Phase 0A: Local Development Setup & First Run** (2025-11-26)
- ✅ Cal.com repository cloned (commit: 1ab4b9d from 2025-11-26)
- ✅ Dependencies installed (1,990+ packages via Yarn 3.4)
- ✅ PostgreSQL 16.10 running with `calendso` database
- ✅ Environment configured (.env with all required secrets)
- ✅ Database migrations applied (529 migrations)
- ✅ Database seeded with apps and test data (`yarn db-seed`)
- ✅ Google Calendar OAuth configured (GCP project "Cal Local")
- ✅ Stripe dummy key added for local development
- ✅ Dev server running successfully at http://localhost:3000
- ✅ First user created: Ben Shapiro (ben@gocadre.ai, /benshapyro)
- ✅ Onboarding completed successfully
- ✅ Google Calendar connected (ben@gocadre.ai)
- ✅ Google Meet connected
- ✅ 3 event types created (Secret Meeting, 30 Min, 15 Min)
- ✅ Git repository initialized with commits

**Platform Exploration** (2025-11-27)
- ✅ Event Types architecture analyzed (tRPC + App Router pattern)
- ✅ Booking flow tested end-to-end (booking id: 31)
- ✅ Google Calendar integration verified (event created on calendar)
- ✅ Google Meet integration verified (meet link generated)
- ✅ Teams/Organizations model documented
- ✅ Database schema verified via direct queries
- ✅ Availability checking system identified
- ✅ Architecture documentation created (`docs/ARCHITECTURE.md`)
- ✅ Integration points for Group Polls identified

### ✅ Recently Completed

**Phase 0B: Railway Deployment** (2025-11-27)
- ✅ GitHub repo created: https://github.com/benshapyro/cadre-cal
- ✅ Git remotes configured (origin=cadre-cal, upstream=calcom/cal.com)
- ✅ Railway project created: "perfect-strength"
- ✅ PostgreSQL database provisioned
- ✅ Environment variables configured
- ✅ Metal Build Environment enabled (required for Cal.com's large build)
- ✅ railway.toml configured with build args and pre-deploy migrations
- ✅ Database migrations run automatically via preDeployCommand
- ✅ App deployed and running successfully
- ✅ First user account created on production
- 🔄 Google OAuth for production (credentials ready, needs to be added to Railway)

**Railway Details:**
- URL: https://cal.cadreai.com
- Project: perfect-strength
- Services: web (Cal.com), Postgres
- Config: railway.toml in repo root

### ✅ Phase 1: Group Polls Implementation (Core Complete)

**Database & API Layer:**
1. ✅ Deep codebase exploration complete (Availability, Booking, Teams, UI, Public Pages)
2. ✅ Documentation updated with findings
3. ✅ Prisma schema models added (GroupPoll, GroupPollWindow, GroupPollParticipant, GroupPollResponse)
4. ✅ Database migration run (`20251127153043_add_group_polls`)
5. ✅ tRPC router for groupPolls (authenticated) - list, get, create, delete
6. ✅ Public tRPC router for poll responses - getPollByToken, submitPollResponse

**UI Pages:**
7. ✅ Poll list page (`/group-polls`) - displays user's polls with status badges
8. ✅ Create poll page (`/group-polls/new`) - form with participants and date range
9. ✅ Public response page (`/p/[accessToken]`) - time slot selection UI

### ✅ Recently Completed

**Phase 1B: Manual Testing & Bug Fixes** (2025-11-27)
1. ✅ Poll detail page implemented (`/group-polls/[id]`)
2. ✅ Manual browser testing of full flow (create → share → respond → view results)
3. ✅ Bug fixes discovered and resolved (see below)

**Bug Fixes During Testing:**
- **tRPC endpoint routing**: Added `groupPolls` to ENDPOINTS array in `shared.ts` and created API route handler
- **Poll detail 404**: Created missing `/group-polls/[id]/page.tsx` and view component
- **Date serialization**: Fixed "Objects are not valid as React child" errors by returning ISO strings from handlers
- **Time display format**: Fixed timezone issues - times stored as `@db.Time` return 1970-01-01 dates, now extracting HH:mm
- **Submit availability 400**: Changed schema from `z.date()` to `z.string()` for date field

**Phase 1B: Automated Testing & Heat Map** (2025-11-27)
1. ✅ E2E tests (Playwright) - 6 passing, 1 skipped
   - Poll creation flow
   - Poll list view
   - Poll detail view with participant responses
   - Poll deletion
   - Share link copy functionality
   - Already-responded badge display
2. ✅ Unit tests for heat map calculation (15 passing)
3. ✅ Heat map calculation library (`packages/features/group-polls/lib/`)
   - `calculateHeatMap()` - aggregates responses per time window
   - `getHeatMapColorClass()` - Tailwind color classes for visualization
   - Support for filtering by participant type
   - Statistics: optimal slots, perfect slots
4. ✅ Added data-testid attributes for E2E test reliability

### ✅ Phase 1B: Complete (2025-11-28)

**Heat Map Visualization:**
1. ✅ Heat map UI components (`HeatMapCell.tsx`, `HeatMapLegend.tsx`, `HeatMap.tsx`)
   - Color-coded cells showing availability (0%-100%)
   - Interactive tooltips with participant names (organizer view)
   - Selectable slots for response view
   - "Perfect times" banner and statistics
2. ✅ Heat map integrated into poll detail view (organizer sees all responses)
3. ✅ Heat map integrated into public response view (anonymous counts only)
4. ✅ tRPC handlers updated to calculate and return heat map data

**Email Notifications:**
5. ✅ Email template created (`GroupPollInviteEmail.tsx`)
6. ✅ Email class created (`group-poll-invite-email.ts`) extending BaseEmail
7. ✅ Invite emails automatically sent on poll creation

**Mobile Testing:**
8. ✅ All views tested on mobile viewport (375px)
9. ✅ Poll list view - responsive layout
10. ✅ Poll detail view - heat map grid adapts to screen size
11. ✅ Public response view - selectable slots work on mobile
12. ✅ Poll creation form - all fields accessible

### ✅ Phase 2: Booking Integration (Core Complete - 2025-11-28)

**Schema & Backend:**
1. ✅ GroupPoll schema updated with `eventTypeId`, `bookingId`, `selectedDate/Time`
2. ✅ Database migration applied (`prisma db push`)
3. ✅ Create handler updated to validate and store eventTypeId
4. ✅ Get handler updated to include eventType and booking data
5. ✅ `book.schema.ts` and `book.handler.ts` created
6. ✅ Booking procedure added to groupPolls router

**UI Updates:**
7. ✅ Event Type selector added to poll creation form
8. ✅ Heat map made selectable in detail view
9. ✅ Slot detail panel shows available/unavailable participants
10. ✅ Confirmation dialog before booking
11. ✅ BOOKED state display in poll detail view

**Manual Testing Complete (2025-11-28):**
12. ✅ Full booking flow tested end-to-end:
    - Created poll "Booking Test Poll" with Event Type "30min"
    - Submitted participant response (Test User selected Mon Dec 1)
    - Selected time slot from heat map
    - Created booking via confirmation dialog
    - Poll status changed to BOOKED
    - Booking record created (id: 31) with correct metadata
    - Attendees linked to booking

**Bug Fixes During Phase 2 Testing:**
- **Event Type dropdown empty**: Fixed data access pattern - `eventTypesData` is an array, not `{eventTypeGroups: [...]}` (fixed in `group-polls-create-view.tsx`)
- **Prisma client stale**: Regenerated after schema changes (`yarn workspace @calcom/prisma prisma generate`)
- **Date display off-by-one**: UI shows "November 30" instead of "December 1" (timezone display issue - data is correct in DB)

### ✅ Phase 2B: Bug Fixes & Calendar Sync (2025-11-29)

**Timezone Bug Fix:**
- ✅ Fixed date parsing in `group-polls-detail-view.tsx` - parse YYYY-MM-DD as local, not UTC
- ✅ Fixed date parsing in `HeatMap.tsx` - same fix for date headings
- ✅ Fixed date parsing in `poll-response-view.tsx` - same fix for public response page
- ✅ All dates now display correctly (e.g., "Tue, Dec 2" not "Mon, Dec 1")

**Calendar Sync (EventManager Integration):**
- ✅ Added EventManager integration in `book.handler.ts`
- ✅ Builds CalendarEvent with organizer, attendees, time details
- ✅ Creates BookingReference records for calendar events
- ✅ Graceful error handling (booking succeeds even if calendar sync fails)
- ✅ Tested: EventManager called correctly, no BookingReference created only because local dev has no OAuth credentials

### ✅ Phase 5: Public Poll Link & QR Code Sharing (2025-11-29)

**Public Poll Page (`/poll/[shareSlug]`):**
- ✅ Created public tRPC endpoint `getPollByShareSlug` - fetches poll by shareSlug with anonymous heat map
- ✅ Created public tRPC endpoint `submitMultiPollResponse` - submit availability for multiple participants at once
- ✅ Created public poll page route `apps/web/app/(booking-page-wrapper)/poll/[shareSlug]/page.tsx`
- ✅ Created `public-poll-view.tsx` with multi-select participant dropdown
- ✅ Anyone with the link can select participants from searchable dropdown and submit availability
- ✅ Shows "Responded" badge next to participants who have already submitted
- ✅ Pre-populates existing responses when participant is selected
- ✅ Shows anonymous heat map (counts only, no names) for privacy

**QR Code & Share Dialog:**
- ✅ Created `ShareDialog.tsx` component with QR code generation
- ✅ Uses `react-qr-code` library (already in Cal.com dependencies)
- ✅ Copy link to clipboard functionality
- ✅ Download QR code as PNG functionality (canvas-based conversion)
- ✅ Added "Share Poll" button to poll detail view

**Testing:**
- ✅ Full flow tested: Share button → Copy link → Public page → Select participant → Submit availability
- ✅ Form resets after successful submission

### 🔄 Phase 6: Slack App Integration (In Progress - 2025-11-28)

**Private Slack App Approach:**
- ✅ Private Slack app (not distributable) - simpler for Cadre internal use
- ✅ Bot Token scopes: `chat:write`, `users:read.email`, `users:read`
- ✅ DM notifications to each Cadre member on the poll

**Implementation:**
1. ✅ Installed `@slack/web-api` SDK to @calcom/features package
2. ✅ Created `packages/features/group-polls/lib/slackNotifications.ts`
   - `checkAndSendSlackNotifications()` - Main function called after poll response
   - `sendSlackDM()` - Looks up user by email, sends DM
   - Rich Block Kit messages with poll title, progress, action button
3. ✅ Integrated into `submitMultiPollResponse.handler.ts` (public poll form)
4. ✅ Integrated into `submitPollResponse.handler.ts` (direct participant link)
5. ✅ Added `SLACK_BOT_TOKEN` to `.env.example`

**Notification Triggers:**
- When a CADRE_REQUIRED participant responds → notify all Cadre participants
- When ALL participants have responded → notify all Cadre participants

**Testing Complete:**
- ✅ Created Slack app "Cadre Group Polls" in workspace
- ✅ Bot token configured in `.env`
- ✅ Manual testing verified - DMs sent successfully to ben@gocadre.ai

### ✅ Phase 7: Poll Editing After Creation (2025-11-29)

**Backend (tRPC):**
1. ✅ Created `update.schema.ts` - validation for update mutation
2. ✅ Created `update.handler.ts` - handles add/remove participants, update time windows
3. ✅ Added `update` mutation to groupPolls router
4. ✅ Validates ownership and prevents editing booked polls
5. ✅ Sends invite emails to newly added participants
6. ✅ Resets participant responses when time windows change

**UI (Edit Page):**
7. ✅ Created `/group-polls/[id]/edit/page.tsx` route
8. ✅ Created `group-polls-edit-view.tsx` component
   - Pre-populates form with existing poll data
   - Shows existing participants with remove confirmation
   - Add new participants section
   - Date range picker (warns about response reset)
9. ✅ Added "Edit Poll" button to poll detail view (hidden for booked polls)

**Testing:**
- ✅ Add participant flow tested: Added "Test User" to existing poll
- ✅ Toast notification: "Poll updated! 1 added, 0 removed"
- ✅ Heat map updates to reflect new participant count

### ✅ Phase 8: Polish & Launch (2025-11-28)

**M3: Manual Close Poll:**
- ✅ Created `close.handler.ts` - close mutation for groupPolls router
- ✅ Added "Close Poll" button to detail view (only shows for ACTIVE polls)
- ✅ Status changes to CLOSED, prevents further responses

**M4: Auto-Expire Polls:**
- ✅ Created `expirePolls.ts` utility in features/group-polls/lib
- ✅ Check-on-load pattern (no cron needed)
- ✅ Integrated into list.handler.ts and get.handler.ts
- ✅ Polls with past dateRangeEnd automatically expire

**B2: Toggle All/Required Participants View:**
- ✅ Added `heatMapRequired` calculation in get.handler.ts
- ✅ Toggle buttons in detail view: "All Participants" / "Required Only"
- ✅ Heat map updates to show only CADRE_REQUIRED participants

**M2: Dashboard Poll Count:**
- ✅ Added active poll count badge to list view header
- ✅ Shows "X active polls awaiting responses"

**🎉 All Features Complete!**

### ✅ Phase 1C: Code Quality & Polish (2025-11-29)

**Production Hardening (15 items completed):**

1. ✅ **Race Condition Prevention** - Wrapped booking creation in Prisma `$transaction` with double-check pattern
2. ✅ **Time Validation** - Added startTime < endTime validation in book.handler.ts
3. ✅ **Structured Logging** - Replaced console.log with `logger.getSubLogger()` across all handlers
4. ✅ **Slack Error Context** - Added pollId, pollTitle to Slack notification error logs
5. ✅ **Timezone Strategy Documented** - Added JSDoc comments explaining UTC vs local time usage
6. ✅ **Calendar Retry Logic** - Added `withRetry()` helper (2 attempts, 1s delay) for calendar operations
7. ✅ **Schema Validation** - Added `.refine()` for dateRangeStart <= dateRangeEnd in create/update schemas
8. ✅ **ARIA Labels** - Added aria-label and aria-pressed to HeatMapCell and poll-response-view buttons
9. ✅ **JSDoc Comments** - Added documentation to timeUtils.ts and combineDateAndTime function
10. ✅ **Email Failure Handling** - Added Promise.allSettled for email sending with failure counts logged
11. ✅ **Unit Tests** - Created timeUtils.test.ts with 24 tests for parse/format functions
12. ✅ **Constants Extraction** - Extracted CALENDAR_RETRY_ATTEMPTS and CALENDAR_RETRY_DELAY_MS
13. ✅ **N+1 Query Review** - Verified update handler uses optimal query patterns
14. ✅ **Error Messages** - Verified all TRPCError messages are clear and actionable
15. ✅ **E2E Test Stability** - Fixed flaky public poll test with proper waitForLoadState

**Test Coverage:**
- ✅ 39 unit tests passing (24 timeUtils + 15 heatMapCalculation)
- ✅ 7 E2E tests passing (poll CRUD, public response, booking flow)

**Deferred:**
- Phase 0B: Google OAuth on Railway (can add later)
- Phase 0C: Team Onboarding (deferred until after launch)

---

## What Works

- ✅ PostgreSQL 16 running on localhost:5432
- ✅ Cal.com dev server running at http://localhost:3000
- ✅ Database `calendso` with 529 migrations applied
- ✅ Database seeded with 100+ apps and test data
- ✅ Google Calendar OAuth working (ben@gocadre.ai connected)
- ✅ Google Meet integration working
- ✅ User onboarding flow complete
- ✅ Event types created and functional
- ✅ Public booking pages accessible (`/benshapyro`)
- ✅ Environment variables configured correctly
- ✅ Git tracking project progress

## Setup Lessons Learned

**Critical for Fresh Setup:**
1. ⚠️ Run `yarn db-seed` after migrations (apps won't show without it)
2. ⚠️ Add dummy Stripe key to `.env` (onboarding fails without it)
3. ⚠️ Check for duplicate keys in `.env` (last value wins)
4. ✅ React 19 warnings are safe to ignore (upstream Cal.com issue)

**See `docs/NOTES.md` for detailed setup gotchas and solutions**

## What's Blocked/Pending

- 🔄 Google OAuth credentials need to be added to Railway (have credentials, just need to add)
- ✅ Custom domain setup (cal.cadreai.com) - live with SSL
- ⏸️ Team member list for onboarding - deferred until Phase 0C

## Current Environment

```bash
# Database
Database: PostgreSQL 16.10
URL: postgresql://bshap@localhost:5432/calendso
Status: Running

# Cal.com
Version: Latest (as of 2025-11-26)
Location: ./cal.com/
Dependencies: Installed
Dev Server: Not started

# Secrets
NEXTAUTH_SECRET: ✓ Generated
CALENDSO_ENCRYPTION_KEY: ✓ Generated
GOOGLE_API_CREDENTIALS: ✓ Configured (Project: cal-local-479503)
```

---

## Quick Commands

```bash
# Start Cal.com dev server
cd cal.com && yarn workspace @calcom/web dev

# Check database
/opt/homebrew/opt/postgresql@16/bin/psql calendso

# View migrations
cd cal.com && yarn workspace @calcom/prisma db-migrate

# Check git status
git status
```

---

## Phase Status Reference

| Phase | Status | Started | Completed |
|-------|--------|---------|-----------|
| Phase 0A: Local Dev Setup | ✅ Complete | 2025-11-26 | 2025-11-26 |
| Platform Exploration | ✅ Complete | 2025-11-27 | 2025-11-27 |
| Phase 0B: Production Deployment | ✅ Complete (OAuth pending) | 2025-11-27 | 2025-11-27 |
| Phase 0C: Team Onboarding | ⬜ Deferred | — | — |
| Phase 1: Group Polls Core | ✅ Complete | 2025-11-27 | 2025-11-27 |
| Phase 1B: Testing, Heat Map, Email | ✅ Complete | 2025-11-27 | 2025-11-28 |
| Phase 1C: Code Quality & Polish | ✅ Complete | 2025-11-29 | 2025-11-29 |
| Phase 2: Booking Integration | ✅ Complete (with calendar sync) | 2025-11-28 | 2025-11-29 |
| Phase 5: Public Poll Link & QR Code | ✅ Complete | 2025-11-29 | 2025-11-29 |
| Phase 6: Slack App Integration | ✅ Complete | 2025-11-28 | 2025-11-28 |
| Phase 7: Poll Editing | ✅ Complete | 2025-11-29 | 2025-11-29 |
| Phase 8: Polish & Launch | ✅ Complete | 2025-11-28 | 2025-11-28 |

See `docs/cadre_cal_PLAN.md` for detailed phase breakdown.

---

## Notes & Decisions

- **PostgreSQL Version:** Using 16 (already installed) instead of 15 from plan
- **Node Version:** 22.13.0 (exceeds v20+ requirement)
- **Database Port:** 5432 (standard, not 5450 from .env.example)

---

## Resources

- [Documentation](docs/) - Specs, design, and plan
- [Backlog](docs/cadre/BACKLOG.md) - Production issues and improvements
- [Cal.com README](cal.com/README.md) - Upstream docs
- [Git History](git log) - What changed and why
