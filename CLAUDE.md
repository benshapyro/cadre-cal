# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

This is **Cadre Calendar**, a fork of Cal.com with a **Group Polls** scheduling feature for Cadre AI. The Group Polls feature enables multi-party availability discovery through a poll-based interface with heat map visualization.

### Repository

- **Fork**: github.com/benshapyro/cadre-cal
- **Upstream**: github.com/calcom/cal.com (for contributing back)

---

## Repository Structure

```
cadre-cal/                         # Cal.com fork with Group Polls
├── apps/
│   └── web/                       # Main Next.js app (localhost:3000)
│       ├── app/                   # App Router pages
│       │   ├── (use-page-wrapper)/(main-nav)/group-polls/  # Auth'd pages
│       │   └── (booking-page-wrapper)/p/                   # Public response
│       └── modules/group-polls/   # View components
├── packages/
│   ├── prisma/                    # Database schema & migrations
│   ├── trpc/                      # tRPC API layer
│   │   └── server/routers/
│   │       ├── viewer/groupPolls/ # Authenticated API
│   │       └── publicViewer/      # Public API (poll responses)
│   ├── features/                  # Feature modules
│   └── ui/                        # Shared UI components
├── docs/
│   └── cadre/                     # Cadre project documentation
│       ├── STATUS.md              # Current state (CHECK FIRST)
│       ├── cadre_cal_SPEC.md      # Requirements
│       ├── cadre_cal_DESIGN.md    # Technical architecture
│       ├── cadre_cal_PLAN.md      # Implementation roadmap
│       ├── ARCHITECTURE.md        # Cal.com patterns learned
│       └── NOTES.md               # Development discoveries
└── turbo.json                     # Turborepo configuration
```

**CRITICAL**: Always read `docs/cadre/STATUS.md` before starting work.

---

## Technology Stack

- **Framework**: Next.js 15 (App Router), React 18
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL 16 via Prisma ORM
- **API**: tRPC (type-safe RPC)
- **Styling**: Tailwind CSS
- **UI**: Radix UI primitives + custom components
- **Auth**: NextAuth.js (session-based)

---

## Development Commands

All commands run from repository root.

### Local Development

```bash
# Start main web app (localhost:3000)
yarn dev
# or specifically:
yarn workspace @calcom/web dev

# Build for production
yarn build
```

### Database Operations

```bash
# Run migrations
yarn workspace @calcom/prisma db-migrate

# Open Prisma Studio (database GUI)
yarn db-studio

# Generate Prisma client after schema changes
yarn workspace @calcom/prisma prisma generate

# Seed database
yarn db-seed
```

### Code Quality

```bash
yarn lint          # Lint all packages
yarn lint:fix      # Fix linting issues
yarn type-check    # Type check
yarn format        # Format code
```

### Testing

```bash
yarn test          # Run unit tests (Vitest)
yarn e2e           # Run E2E tests (Playwright)
```

---

## Group Polls Implementation

### Current Status

**Phase**: 1B In Progress (Manual Testing & Bug Fixes Complete)
**Next**: Automated E2E tests, heat map visualization, email notifications

### Where Code Lives

| Component | Location |
|-----------|----------|
| Database Schema | `packages/prisma/schema.prisma` |
| Authenticated API | `packages/trpc/server/routers/viewer/groupPolls/` |
| Public API | `packages/trpc/server/routers/publicViewer/` |
| Auth'd Pages | `apps/web/app/(use-page-wrapper)/(main-nav)/group-polls/` |
| Public Pages | `apps/web/app/(booking-page-wrapper)/p/[accessToken]/` |
| View Components | `apps/web/modules/group-polls/views/` |

### Key Files Created

```
packages/prisma/schema.prisma          # 4 new models: GroupPoll, GroupPollWindow, etc.
packages/trpc/react/shared.ts          # ENDPOINTS array (must add new routers here!)
packages/trpc/server/routers/viewer/groupPolls/_router.ts
packages/trpc/server/routers/publicViewer/_router.tsx
apps/web/modules/group-polls/views/
```

---

## Environment & Database

### Local Environment

- **Database**: `postgresql://bshap@localhost:5432/calendso`
- **Web App**: http://localhost:3000
- **PostgreSQL**: 16.10 (running via Homebrew)

### Required Environment Variables

Already configured in `.env`:
- `DATABASE_URL` - PostgreSQL connection
- `NEXTAUTH_SECRET` - Auth secret
- `CALENDSO_ENCRYPTION_KEY` - Encryption key

---

## Git Workflow

### Remotes

```bash
origin    → github.com/benshapyro/cadre-cal (your fork)
upstream  → github.com/calcom/cal.com (for syncing/contributing)
```

### Daily Work

```bash
# Commit your changes
git add .
git commit -m "feat(group-polls): description"

# Push to your fork
git push origin main
```

### Syncing with Upstream Cal.com

```bash
git fetch upstream
git merge upstream/main
# Resolve any conflicts in schema.prisma, _router.tsx files
yarn install
yarn workspace @calcom/prisma db-migrate
```

### Contributing to Cal.com

```bash
# Create feature branch
git checkout -b feat/group-polls

# Cherry-pick or rebase your commits
# Open PR from benshapyro/cadre-cal to calcom/cal.com
```

---

## Important Lessons Learned

### tRPC Routing

New routers MUST be added to `ENDPOINTS` array in `packages/trpc/react/shared.ts`:
```typescript
const ENDPOINTS = [
  "viewer",
  "publicViewer",
  "groupPolls",  // Add this!
] as const;
```

### Date/Time Serialization

- Prisma `@db.Time` returns DateTime with 1970-01-01 - extract HH:mm for display
- Frontend sends date strings, use `z.string().regex()` not `z.date()`
- Use `Date.UTC()` for consistent timezone handling

---

## Quick Reference

### Start Development
```bash
yarn workspace @calcom/web dev
# Visit http://localhost:3000
```

### Test Database
```bash
/opt/homebrew/opt/postgresql@16/bin/psql calendso
```

### Key Resources

- **Cadre Docs**: `docs/cadre/`
- **Cal.com Docs**: https://cal.com/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **tRPC Docs**: https://trpc.io
