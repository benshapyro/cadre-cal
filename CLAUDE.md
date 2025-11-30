# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Cadre Calendar** - Cal.com fork with Group Polls for multi-party scheduling.

Read `docs/cadre/STATUS.md` before starting work.

## Commands

```bash
# Dev server
yarn workspace @calcom/web dev

# Database
yarn workspace @calcom/prisma db-migrate
yarn workspace @calcom/prisma prisma generate   # After schema changes, then restart dev server!
yarn db-seed

# Testing
yarn test                                       # All unit tests
yarn test packages/features/group-polls         # Single package
yarn e2e                                        # All E2E tests
yarn playwright test group-polls.e2e.ts         # Single E2E file

# Code quality
yarn lint && yarn type-check
```

## Key Locations

| Component | Location |
|-----------|----------|
| Database Schema | `packages/prisma/schema.prisma` |
| Authenticated API | `packages/trpc/server/routers/viewer/groupPolls/` |
| Public API | `packages/trpc/server/routers/publicViewer/` |
| Auth'd Pages | `apps/web/app/(use-page-wrapper)/(main-nav)/group-polls/` |
| Public Pages | `apps/web/app/(booking-page-wrapper)/poll/[shareSlug]/` |
| View Components | `apps/web/modules/group-polls/views/` |
| Feature Code | `packages/features/group-polls/` |

## Critical Gotchas

### tRPC ENDPOINTS Array
New routers MUST be added to `packages/trpc/react/shared.ts`:
```typescript
const ENDPOINTS = ["viewer", "publicViewer", "groupPolls"] as const;
```

### Prisma Client Regeneration
After changing `schema.prisma`, run `prisma generate` AND restart dev server. Hot reload won't pick up client changes.

### Date Parsing Bug
```typescript
// WRONG - parses as UTC, displays as previous day in western timezones
new Date("2025-12-02")  // Shows Dec 1 in PST!

// CORRECT - parse as local time
const [y, m, d] = "2025-12-02".split("-").map(Number);
new Date(y, m - 1, d)
```

### Date/Time Fields
- Prisma `@db.Time` returns DateTime with 1970-01-01 date - extract HH:mm
- Use `z.string().regex()` not `z.date()` for frontend date inputs

## Git

```bash
# Remotes: origin (your fork) | upstream (calcom/cal.com)
git commit -m "feat(group-polls): description"

# Sync upstream
git fetch upstream && git merge upstream/main
yarn install && yarn workspace @calcom/prisma db-migrate
```

## Documentation

- `docs/cadre/STATUS.md` - Current state
- `docs/cadre/ARCHITECTURE.md` - Cal.com patterns
- `docs/cadre/NOTES.md` - Development discoveries
