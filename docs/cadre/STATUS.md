# Cadre Calendar - Current Status

**Last Updated:** 2025-11-27
**Current Phase:** Phase 1: Group Polls Implementation (Core Complete)
**Overall Status:** 🟢 On Track

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
- URL: https://web-production-7adc5.up.railway.app
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

### 📋 Next Up

**Phase 1B: Remaining Items**
1. ⬜ Automated E2E tests (Playwright test scripts)
2. ⬜ Heat map visualization of responses
3. ⬜ Email notifications for participants
4. ⬜ Mobile testing

**Deferred:**
- Phase 0B: Google OAuth on Railway (can add later)
- Phase 0C: Team Onboarding (deferred until Group Polls MVP)

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
- ⏸️ Custom domain setup (cal.cadre.ai) - can add later via Railway settings
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
| Phase 1B: Testing & Polish | 🟡 In Progress | 2025-11-27 | — |
| Phase 2: Heat Map & Results | ⬜ Not Started | — | — |
| Phase 3: Booking Integration | ⬜ Not Started | — | — |
| Phase 4: Notifications & QR | ⬜ Not Started | — | — |
| Phase 5: Polish & Launch | ⬜ Not Started | — | — |

See `docs/cadre_cal_PLAN.md` for detailed phase breakdown.

---

## Notes & Decisions

- **PostgreSQL Version:** Using 16 (already installed) instead of 15 from plan
- **Node Version:** 22.13.0 (exceeds v20+ requirement)
- **Database Port:** 5432 (standard, not 5450 from .env.example)

---

## Resources

- [Documentation](docs/) - Specs, design, and plan
- [Cal.com README](cal.com/README.md) - Upstream docs
- [Git History](git log) - What changed and why
