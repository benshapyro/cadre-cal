# Cadre Group Polls — Implementation Plan

> **Document Status:** Living Document
> **Last Updated:** 2025-11-27
> **Owner:** Ben @ Cadre AI

---

## 1. Timeline Overview

**Total Estimated Duration:** 8-9 weeks

```
Week 1        Week 2        Week 3        Week 4        Week 5        Week 6        Week 7        Week 8        Week 9
|-------------|-------------|-------------|-------------|-------------|-------------|-------------|-------------|-------------|
|  Phase 0    |        Phase 1            |        Phase 2            |    Phase 3    |  Phase 4    |  Phase 5    |  Phase 6    |
|  Setup &    |     Poll Creation         |    Response Collection    |   Heat Map    |  Booking    |  Notifs &   |  Polish &   |
|  Team Live  |         UI                |         UI                |    & Results  |  Integration|  QR Codes   |  Launch     |
```

---

## 2. Phase Breakdown

### Phase 0: Setup, Deployment & Team Goes Live (Week 1)

**Goal:** Get Cal.com deployed to production, onboard Cadre team, and start using standard features immediately. Learn the codebase through real usage.

#### 0A: Local Development Setup

| Task | Est. Hours | Output |
|------|------------|--------|
| Clone Cal.com repo, install dependencies | 2h | Working local dev |
| Set up local PostgreSQL database | 1h | Database running |
| Configure Google Calendar OAuth app | 2h | Calendar sync working |
| Trace existing feature end-to-end (e.g., Event Type creation) | 4h | Understanding of patterns |
| Identify extension points for Group Polls | 4h | Technical notes |

#### 0B: Production Deployment

| Task | Est. Hours | Output |
|------|------------|--------|
| Set up deployment target (Railway or similar) | 3h | Production environment |
| Configure production database | 1h | PostgreSQL provisioned |
| Set up domain/DNS (cal.cadre.ai or similar) | 1h | Custom domain working |
| Configure Cadre branding (colors, logo) | 2h | Branded instance |
| SSL and security review | 1h | HTTPS configured |

#### 0C: Team Onboarding & Go Live

| Task | Est. Hours | Output |
|------|------------|--------|
| Create Cadre team user accounts | 1h | All team members have accounts |
| Connect team members' Google Calendars | 2h | Calendar sync active for all |
| Set up standard event types (discovery call, strategy session, etc.) | 2h | Booking pages ready |
| Configure team availability settings | 1h | Working hours set |
| Test end-to-end booking flow with real calendar | 1h | Verified working |
| Brief team on using Cal.com | 1h | Team knows how to use it |

**Deliverables:**
- [ ] Local Cal.com instance running with Google Calendar connected
- [ ] Production deployment live at custom domain
- [ ] All Cadre team members onboarded with connected calendars
- [ ] Standard event types configured and usable
- [ ] Team actively using Cal.com for scheduling
- [ ] Technical notes on Cal.com patterns
- [ ] Development branch created for Group Polls work

**Go/No-Go Criteria:**
- Production Cal.com is live and team is using it
- At least one real booking made through the system
- Understand tRPC + Prisma patterns
- Ready to begin Group Polls development

---

### Phase 1: Poll Creation UI (Weeks 2-3)

**Goal:** Cadre team can create polls with proposed windows and participants.

#### Week 2: Database & Core Creation

| Task | Est. Hours | Output |
|------|------------|--------|
| Add Prisma schema for Group Poll models | 3h | Migration file |
| Run migration, verify tables created | 1h | Schema in DB |
| Create tRPC router skeleton for groupPolls | 3h | Router registered |
| Implement `createPoll` procedure | 4h | Polls can be created |
| Implement `getMyPolls` procedure | 2h | List polls |
| Implement `getPoll` procedure | 2h | Single poll details |
| Build basic Poll List page (`/group-polls`) | 4h | Page renders |
| Build basic Create Poll page shell (`/group-polls/new`) | 3h | Page renders |

#### Week 3: Window Selection & Participants

| Task | Est. Hours | Output |
|------|------------|--------|
| Build TeamAvailabilityGrid component | 6h | Shows team calendar availability |
| Implement `getTeamAvailability` procedure (uses existing Cal.com utils) | 4h | API returns busy times |
| Build WindowSelector component (drag to select) | 8h | Interactive grid |
| Build ParticipantManager component | 4h | Add/remove participants |
| Wire up Create Poll form end-to-end | 4h | Polls created with windows + participants |
| Generate share slug and build ShareDialog | 3h | Link + copy button |

**Deliverables:**
- [ ] Can create a poll via UI
- [ ] Poll includes proposed windows
- [ ] Poll includes participants (Cadre + clients)
- [ ] Share link generated
- [ ] Polls listed on `/group-polls`

**Go/No-Go Criteria:**
- Create poll end-to-end works
- Team availability displays correctly
- Data persists correctly to database

---

### Phase 2: Response Collection UI (Weeks 4-5)

**Goal:** Clients can access poll link and submit availability.

#### Week 4: Public Response Page Core

| Task | Est. Hours | Output |
|------|------------|--------|
| Build public response page (`/p/[accessToken]`) | 4h | Page shell |
| Implement `getPollByToken` public procedure | 3h | Fetch poll data |
| Build AvailabilityInput component (view mode) | 4h | Shows proposed windows |
| Implement drag-to-select availability (desktop) | 6h | Paint availability |
| Implement `submitResponse` procedure | 4h | Save responses |
| Wire up submit flow | 3h | Responses saved |

#### Week 5: Mobile, Editing, Polish

| Task | Est. Hours | Output |
|------|------------|--------|
| Touch-friendly drag-to-select (mobile) | 6h | Works on phone |
| Show anonymous heat map on response page | 4h | Others' availability visible |
| Show participant list with responded checkmarks | 3h | Progress visible |
| Implement `updateResponse` procedure | 3h | Edit existing |
| Build response editing flow | 3h | Return and edit |
| Mobile testing and refinements | 4h | Smooth mobile UX |

**Deliverables:**
- [ ] Clients can open poll link (no login)
- [ ] Clients see proposed windows
- [ ] Clients can drag to mark availability
- [ ] Clients see anonymous heat map
- [ ] Clients can see who's invited and who's responded
- [ ] Responses save correctly
- [ ] Edit response works
- [ ] Mobile experience is good

**Go/No-Go Criteria:**
- Full response flow works on desktop and mobile
- Multiple clients can respond to same poll
- Data integrity maintained

---

### Phase 3: Heat Map & Results (Week 6)

**Goal:** Poll creator sees clear visualization of availability overlap.

| Task | Est. Hours | Output |
|------|------------|--------|
| Build HeatMap component | 6h | Renders grid with colors |
| Implement heat map calculation logic | 4h | Overlap percentages |
| Implement meeting-duration-aware slot finding | 4h | Only valid slots highlighted |
| Build "everyone available" visual treatment | 2h | Clear indicator |
| Build HeatMapToggle (all vs required) | 3h | Toggle works |
| Wire up Poll Detail page with heat map | 3h | Results page complete |
| Add poll status indicators | 2h | Active, responses count, etc. |

**Deliverables:**
- [ ] Heat map renders correctly
- [ ] Color intensity reflects overlap
- [ ] "Everyone available" slots clearly marked
- [ ] Toggle between all/required participants
- [ ] Only slots fitting meeting duration are bookable
- [ ] Results page fully functional

**Go/No-Go Criteria:**
- Heat map accurately reflects response data
- Can identify best time slots visually
- Toggle works correctly

---

### Phase 4: Booking Integration (Week 7)

**Goal:** One-click booking from poll results creates Cal.com event.

| Task | Est. Hours | Output |
|------|------------|--------|
| Build slot selection UI on heat map | 3h | Click to select slot |
| Build BookingConfirmDialog | 3h | Confirm before booking |
| Implement `bookFromPoll` procedure | 6h | Creates Cal.com booking |
| Handle attendee filtering (only those available) | 3h | Correct attendees added |
| Update poll status to BOOKED | 2h | Status updates |
| Calendar invite verification | 3h | Invites sent correctly |
| Error handling and edge cases | 4h | Robust flow |

**Deliverables:**
- [ ] Can select winning time slot
- [ ] Confirmation dialog shows who will be invited
- [ ] Booking created in Cal.com
- [ ] Calendar invites sent to correct attendees
- [ ] Poll marked as booked
- [ ] Cannot book already-booked poll

**Go/No-Go Criteria:**
- Full loop: poll → responses → book → calendar events
- Correct attendees receive invites
- No double-booking possible

---

### Phase 5: Notifications & QR Codes (Week 7-8)

**Goal:** Slack notifications and QR code sharing.

| Task | Est. Hours | Output |
|------|------------|--------|
| Set up Slack app/bot for Cadre workspace | 2h | Bot created |
| Configure Cal.com Slack integration | 2h | Integration connected |
| Implement poll notification triggers | 4h | Events fire correctly |
| Build Slack message templates | 3h | Nice formatting |
| Test notification delivery | 2h | Messages arrive |
| Implement QR code generation | 2h | QR codes work |
| Add QR code to ShareDialog | 2h | Visible and downloadable |
| Mobile QR scanning test | 1h | Scan → response page |

**Deliverables:**
- [ ] Slack notification when must-have responds
- [ ] Slack notification when all respond
- [ ] Notifications go to all Cadre members on poll
- [ ] QR code displays in share dialog
- [ ] QR code scans correctly

**Go/No-Go Criteria:**
- Notifications arrive reliably
- QR codes work

---

### Phase 6: Polish, Edge Cases & Launch (Week 8-9)

**Goal:** Production-ready quality, documentation, launch.

#### Week 8: Polish & Edge Cases

| Task | Est. Hours | Output |
|------|------------|--------|
| Poll editing after creation (add windows, participants) | 6h | Edit flow works |
| Implement `updatePoll` procedure | 3h | Saves changes |
| Auto-expire polls past end date | 2h | Cron or check-on-load |
| Manual close poll functionality | 2h | Close button works |
| Empty states and error messages | 3h | Good UX for edge cases |
| Loading states throughout | 2h | Smooth perceived perf |
| "No available times" handling | 2h | Helpful message |
| Dashboard poll count widget | 3h | Shows active polls |

#### Week 9: Testing & Launch

| Task | Est. Hours | Output |
|------|------------|--------|
| End-to-end testing (full flows) | 6h | Test report |
| Cross-browser testing | 3h | Chrome, Safari, Firefox |
| Mobile device testing | 3h | iOS Safari, Android Chrome |
| Performance check | 2h | No major issues |
| Write user documentation / guide | 4h | How-to doc |
| Deploy to production | 2h | Live |
| Monitor first real usage | 2h | Watch for issues |
| Bug fixes buffer | 4h | Address launch issues |

**Deliverables:**
- [ ] Edit poll works
- [ ] Auto-expire works
- [ ] Manual close works
- [ ] Dashboard shows poll count
- [ ] Full test pass
- [ ] Mobile verified
- [ ] Documentation written
- [ ] Production deployment
- [ ] First real poll created

---

## 3. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Cal.com codebase more complex than expected | Medium | High | Phase 0 includes familiarization buffer |
| Mobile drag-to-select difficult to implement | Medium | Medium | Can fall back to tap-to-toggle for MVP |
| Slack integration requires enterprise plan | Low | Medium | Can use webhooks + custom bot as fallback |
| Google Calendar rate limits during availability fetch | Low | Low | Cache aggressively, batch requests |
| Heat map performance with many participants | Low | Low | Paginate or virtualize if needed |
| Cal.com major update during development | Low | Medium | Lock to specific commit, merge carefully |

---

## 4. Resource Requirements

### Development
- Primary developer (you/contractor): 8-9 weeks
- Assumes ~20-25 hours/week available for this project

### Infrastructure
- Railway or similar: ~$20-50/month for staging + production
- PostgreSQL: Included or ~$15/month
- Domain: Use existing Cadre domain

### Third-Party Services
- Google Cloud project (for Calendar API): Free tier sufficient
- Slack app: Free (standard Slack workspace)

### Total Estimated Cost (MVP)
- Infrastructure: ~$50-100/month ongoing
- Development time: 8-9 weeks of effort

---

## 5. Dependencies & Prerequisites

### Before Phase 0
- [ ] Google Cloud project created with Calendar API enabled
- [ ] OAuth consent screen configured
- [ ] Railway/Render account set up
- [ ] Slack workspace admin access (for app creation)
- [ ] Cadre brand assets (logo, colors)

### Before Phase 5
- [ ] Slack app approved in workspace
- [ ] Domain/subdomain decided for poll links

### Before Phase 6 Launch
- [ ] Internal team trained on feature
- [ ] At least one test poll run with real client

---

## 6. Post-MVP Roadmap

After successful MVP launch, prioritize based on usage feedback:

### Near-Term (1-2 months post-launch)

| Feature | Effort | Value |
|---------|--------|-------|
| "Available but not ideal" response option | 1 week | Medium |
| Reminder nudges for non-responders | 3 days | High |
| Automatic timezone handling | 1 week | High |
| Email notifications via Resend | 3 days | Medium |

### Medium-Term (3-6 months)

| Feature | Effort | Value |
|---------|--------|-------|
| Multiple meetings per poll | 2 weeks | Medium |
| Poll templates (save common setups) | 1 week | Medium |
| Analytics (time to response, booking rates) | 1 week | Low |
| Outlook/iCloud calendar support | Defer to Cal.com | Medium |

### Long-Term

| Feature | Effort | Value |
|---------|--------|-------|
| AI texting agent for availability | 4-6 weeks | High |
| Recurring meeting scheduling | 2 weeks | Medium |
| Public API for integrations | 2 weeks | Low |

---

## 7. Definition of Done (Per Phase)

Each phase is complete when:

1. **All tasks checked off** in phase deliverables
2. **Go/No-Go criteria met**
3. **No critical bugs** in implemented features
4. **Code reviewed** (self-review or peer)
5. **Staging deployment** updated and tested
6. **Documentation updated** (SPEC, DESIGN if needed)

---

## 8. Communication & Check-ins

### Recommended Cadence

- **Daily:** Brief notes on progress/blockers (async)
- **Weekly:** Review against plan, adjust if needed
- **Phase boundaries:** Formal go/no-go decision

### Artifacts to Maintain

- [ ] This PLAN.md — update task status weekly
- [ ] SPEC.md — update if requirements change
- [ ] DESIGN.md — update if technical approach changes
- [ ] GitHub issues/PRs — track granular work

---

## 9. Phase Status Tracker

| Phase | Status | Started | Completed | Notes |
|-------|--------|---------|-----------|-------|
| Phase 0A: Local Dev Setup | ✅ Complete | 2025-11-26 | 2025-11-26 | PostgreSQL 16, all deps installed, migrations complete |
| Platform Exploration | ✅ Complete | 2025-11-27 | 2025-11-27 | Event Types, Booking Flow, Teams, Availability System documented in ARCHITECTURE.md |
| Phase 0B: Production Deployment | ✅ Complete | 2025-11-27 | 2025-11-27 | Railway deployed, Google OAuth pending. See NOTES.md for deployment details |
| Phase 0C: Team Onboarding | ⏸️ Deferred | — | — | Deferred until Group Polls MVP tested |
| Phase 1: Poll Creation Core | ✅ Complete | 2025-11-27 | 2025-11-27 | DB schema, tRPC routers, UI pages all implemented |
| Phase 1B: Testing & Polish | 🟡 In Progress | 2025-11-27 | — | Manual testing done, detail page done, bugs fixed. Automated E2E tests pending |
| Phase 2: Response Collection | ✅ Merged | — | — | Merged into Phase 1 - public response page done |
| Phase 3: Heat Map | ⬜ Not Started | — | — | |
| Phase 4: Booking | ⬜ Not Started | — | — | |
| Phase 5: Notifications & QR | ⬜ Not Started | — | — | |
| Phase 6: Polish & Launch | ⬜ Not Started | — | — | |

---

## 10. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2024-01-XX | Claude + Ben | Initial implementation plan |
| 2025-11-26 | Claude + Ben | Expanded Phase 0 to include production deployment and team onboarding |
| 2025-11-26 | Claude + Ben | Marked Phase 0A complete in status tracker |
| 2025-11-27 | Claude + Ben | Added Platform Exploration milestone to status tracker |
| 2025-11-27 | Claude + Ben | Marked Phase 0B (Railway deployment) complete. Added deployment notes to NOTES.md |
| 2025-11-27 | Claude + Ben | **Phase 1 Core Complete!** Implemented: Prisma schema (4 models), tRPC routers (6 endpoints), 3 UI pages |
| 2025-11-27 | Claude + Ben | **Phase 1B Started:** Poll detail page, manual browser testing, bug fixes (tRPC routing, date serialization, time display, submit schema) |

---

## 11. Phase 1 Implementation Summary

### What Was Built (2025-11-27)

**Database Layer:**
- Migration: `20251127153043_add_group_polls`
- Models: `GroupPoll`, `GroupPollWindow`, `GroupPollParticipant`, `GroupPollResponse`
- Enums: `GroupPollStatus`, `ParticipantType`

**tRPC API Layer:**
- Authenticated router: `packages/trpc/server/routers/viewer/groupPolls/`
  - `list` - Get user's polls
  - `get` - Get single poll with details
  - `create` - Create poll with windows/participants
  - `delete` - Delete a poll
- Public router: `packages/trpc/server/routers/publicViewer/`
  - `getPollByToken` - Fetch poll for response page
  - `submitPollResponse` - Submit availability

**UI Pages:**
- `/group-polls` - Poll list page with status badges
- `/group-polls/new` - Create poll form (title, duration, date range, participants)
- `/p/[accessToken]` - Public response page with time slot selection

**Key Files Created:**
```
packages/prisma/migrations/20251127153043_add_group_polls/
packages/trpc/server/routers/viewer/groupPolls/_router.ts
packages/trpc/server/routers/viewer/groupPolls/create.schema.ts
packages/trpc/server/routers/viewer/groupPolls/create.handler.ts
packages/trpc/server/routers/viewer/groupPolls/get.schema.ts
packages/trpc/server/routers/viewer/groupPolls/get.handler.ts
packages/trpc/server/routers/viewer/groupPolls/list.handler.ts
packages/trpc/server/routers/viewer/groupPolls/delete.handler.ts
packages/trpc/server/routers/publicViewer/groupPollResponse.schema.ts
packages/trpc/server/routers/publicViewer/getPollByToken.handler.ts
packages/trpc/server/routers/publicViewer/submitPollResponse.handler.ts
apps/web/app/(use-page-wrapper)/(main-nav)/group-polls/page.tsx
apps/web/app/(use-page-wrapper)/(main-nav)/group-polls/loading.tsx
apps/web/app/(use-page-wrapper)/(main-nav)/group-polls/skeleton.tsx
apps/web/app/(use-page-wrapper)/(main-nav)/group-polls/new/page.tsx
apps/web/app/(booking-page-wrapper)/p/[accessToken]/page.tsx
apps/web/modules/group-polls/views/group-polls-list-view.tsx
apps/web/modules/group-polls/views/group-polls-create-view.tsx
apps/web/modules/group-polls/views/poll-response-view.tsx

# Added during Phase 1B testing (2025-11-27):
apps/web/app/(use-page-wrapper)/(main-nav)/group-polls/[id]/page.tsx
apps/web/modules/group-polls/views/group-polls-detail-view.tsx
apps/web/pages/api/trpc/groupPolls/[trpc].ts
packages/trpc/react/shared.ts  # Modified: added "groupPolls" to ENDPOINTS
```

### What's Next (Phase 1B Remaining)
- [x] Poll detail/results page (`/group-polls/[id]`) - **Done 2025-11-27**
- [x] Manual browser testing of complete flow - **Done 2025-11-27**
- [x] Bug fixes (tRPC routing, date serialization, time display, submit schema) - **Done 2025-11-27**
- [ ] Automated E2E tests (Playwright test scripts)
- [ ] Heat map visualization
- [ ] Email notifications to participants
- [ ] Mobile testing
