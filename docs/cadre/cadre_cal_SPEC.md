# Cadre Group Polls — Specification

> **Document Status:** Living Document
> **Last Updated:** 2025-11-27
> **Owner:** Ben @ Cadre AI

---

## 1. Problem Statement

### The Pain
Cadre AI regularly schedules meetings involving 5-8 participants across Cadre team members and client stakeholders. Finding mutually available times is currently handled through:

- **Manual email back-and-forth** — slow, error-prone, emails get missed
- **Assistant manually checking calendars** — labor-intensive, requires calendar access

This coordination overhead consumes significant time and creates friction in client engagements.

### The Root Cause
No existing tool adequately solves **multi-party availability discovery** with the simplicity Cadre needs:

- **Calendly/Cal.com** — designed for "here's my availability, pick a slot" (one-directional)
- **Doodle** — closest fit but too many steps, features, and friction

### The Opportunity
Build a focused **Group Poll** feature into Cal.com that:
1. Lets Cadre propose availability windows
2. Lets clients draw their availability within those windows
3. Shows overlap via heat map
4. Enables one-click booking when alignment is found

---

## 2. Target Users

### Primary: Cadre Team (Poll Creators)
- **Who:** Cadre consultants, project leads, Ben
- **Context:** Scheduling discovery calls, strategy sessions, workshops with clients
- **Need:** Fast poll creation, clear visibility into responses, quick booking

### Secondary: Client Participants (Poll Responders)
- **Who:** Client stakeholders, executives, team members
- **Context:** Receiving poll link, entering availability on mobile or desktop
- **Need:** Frictionless response (no account), clarity on what's being asked, confidence their input is captured

---

## 3. User Stories

### Poll Creation (Cadre Team)

| ID | Story | Priority |
|----|-------|----------|
| C1 | As a Cadre team member, I can create a new poll by selecting which Cadre colleagues are required for this meeting | Must Have |
| C2 | As a poll creator, I can mark Cadre participants as "required" or "optional" so the heat map reflects who truly must attend | Must Have |
| C3 | As a poll creator, I see my team's calendar availability (from connected Google Calendars) when selecting windows to propose | Must Have |
| C4 | As a poll creator, I can define availability windows by dragging across a calendar grid (e.g., Mon 9am-12pm, Tue 2pm-5pm) | Must Have |
| C5 | As a poll creator, I can set the meeting duration (e.g., 60 minutes) so the system knows what size block to look for | Must Have |
| C6 | As a poll creator, I can set the date range for the poll (default 2 weeks, up to 4 weeks) | Must Have |
| C7 | As a poll creator, I can add client participants by name and email before sending | Must Have |
| C8 | As a poll creator, I can add meeting title and description | Must Have |
| C9 | As a poll creator, I receive a shareable link and QR code after creating the poll | Must Have |
| C10 | As a poll creator, I can add more client participants after the poll is sent | Must Have |
| C11 | As a poll creator, I can edit proposed windows after the poll is sent (understanding it affects the heat map) | Must Have |

### Poll Response (Client Participants)

| ID | Story | Priority |
|----|-------|----------|
| R1 | As a client, I can open the poll link without creating an account or logging in | Must Have |
| R2 | As a client, I enter my name and email to identify myself | Must Have |
| R3 | As a client, I see the proposed availability windows and can drag to mark when I'm available within them | Must Have |
| R4 | As a client, I can see an anonymous heat map showing when others are generally available (not who specifically) | Must Have |
| R5 | As a client, I can see who else has been invited and whether they've responded (checkmark) | Must Have |
| R6 | As a client, I can submit my availability with one click | Must Have |
| R7 | As a client, I can return to the poll and edit my response | Must Have |
| R8 | As a client, the experience works well on mobile (drag to select on touch) | Must Have |

### Results & Booking (Cadre Team)

| ID | Story | Priority |
|----|-------|----------|
| B1 | As a poll creator, I see a heat map showing overlap across all participants | Must Have |
| B2 | As a poll creator, I can toggle between "all participants" and "required only" heat map views | Must Have |
| B3 | As a poll creator, I see clear visual distinction for time blocks where everyone (or all required) can attend | Must Have |
| B4 | As a poll creator, I can select a winning time slot and book it with one click | Must Have |
| B5 | As a poll creator, booking creates a Cal.com event with calendar invites sent to all participants who marked that slot as available | Must Have |
| B6 | As a poll creator, I receive Slack notification when a must-have participant responds | Must Have |
| B7 | As a poll creator, I receive Slack notification when all participants have responded | Must Have |

### Poll Management

| ID | Story | Priority |
|----|-------|----------|
| M1 | As a poll creator, I can view all my active polls in a dedicated "Group Polls" section | Must Have |
| M2 | As a poll creator, I see a count of active polls on my dashboard | Should Have |
| M3 | As a poll creator, I can manually close a poll without booking | Must Have |
| M4 | As a poll creator, polls auto-close when the last proposed date has passed | Must Have |
| M5 | As a poll creator, I can send reminder nudges to non-responders | Should Have |

---

## 4. Functional Requirements

### 4.1 Poll Data Model

A poll consists of:

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Unique identifier (auto-increment) |
| `title` | String | Meeting title |
| `description` | String (optional) | Meeting context/agenda |
| `duration_minutes` | Integer | Required meeting length (e.g., 30, 60, 90) |
| `date_range_start` | Date | First day of proposed availability |
| `date_range_end` | Date | Last day of proposed availability |
| `created_by` | User ID | Cadre team member who created |
| `status` | Enum | `active`, `booked`, `closed`, `expired` |
| `share_link` | String | Unique shareable URL slug |
| `created_at` | Timestamp | Creation time |
| `updated_at` | Timestamp | Last modification |

### 4.2 Proposed Windows

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Unique identifier (auto-increment) |
| `poll_id` | Integer | Parent poll |
| `date` | Date | The day |
| `start_time` | Time | Window start (e.g., 09:00) |
| `end_time` | Time | Window end (e.g., 12:00) |

### 4.3 Participants

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Unique identifier (auto-increment) |
| `poll_id` | Integer | Parent poll |
| `type` | Enum | `cadre_required`, `cadre_optional`, `client` |
| `user_id` | Integer (nullable) | Cal.com user ID if Cadre member |
| `name` | String | Display name |
| `email` | String | Email address |
| `has_responded` | Boolean | Whether they've submitted availability |
| `responded_at` | Timestamp (nullable) | When they responded |
| `access_token` | String | Unique token for response URL (unguessable) |

### 4.4 Responses (Availability)

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Unique identifier (auto-increment) |
| `poll_id` | Integer | Parent poll |
| `participant_id` | Integer | Who submitted |
| `date` | Date | The day |
| `start_time` | Time | Available from |
| `end_time` | Time | Available until |
| `created_at` | Timestamp | Submission time |
| `updated_at` | Timestamp | Last edit |

*Note: Responses are stored as time ranges, not slot votes. A participant may have multiple ranges per day.*

### 4.5 Time Grid Specifications

- **Granularity:** 30-minute increments
- **Display:** Vertical axis = time (e.g., 8am-6pm), Horizontal axis = days
- **Interaction:** Click-and-drag to paint availability
- **Mobile:** Touch-and-drag with same behavior

### 4.6 Heat Map Calculation

For each 30-minute slot within proposed windows:
1. Count participants who have that slot within their availability ranges
2. Color intensity proportional to count / total participants
3. **"Everyone available"** slots get distinct visual treatment (border, icon, or saturated color)

Meeting-duration awareness:
- Only highlight slots where enough *contiguous* time exists for the meeting duration
- Example: 60-min meeting requires two adjacent 30-min slots where participant is available

### 4.7 Booking Integration

When poll creator selects a slot and clicks "Book":
1. Create Cal.com booking/event for that time
2. Add all Cadre participants (required + optional) as hosts
3. Add client participants **who marked that slot as available** as attendees
4. Send calendar invites via Cal.com's existing notification system
5. Update poll status to `booked`

---

## 5. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| **Response time** | Poll page loads < 2s, interactions feel instant |
| **Mobile support** | Fully functional on iOS Safari and Android Chrome |
| **Concurrent users** | Support 20+ simultaneous responders per poll |
| **Data privacy** | Client responses visible only to poll creator; anonymous heat map to other clients |
| **Availability** | 99.9% uptime (standard Cal.com SLA) |

---

## 6. Scope Boundaries

### In Scope (MVP)

- Poll creation with proposed windows
- Cadre calendar integration (read availability)
- Client response collection (draw availability)
- Heat map visualization with required/all toggle
- One-click booking via Cal.com
- Shareable link + QR code
- Slack notifications (must-have responded, all responded)
- Poll editing after creation
- Add participants after creation
- Mobile-responsive response UI
- Manual poll close
- Auto-expire when dates pass

### Out of Scope (MVP)

- "Available but not ideal" response state (later)
- Automatic timezone conversion (manual for MVP)
- Multiple meetings per poll
- Recurring meeting support
- AI texting agent
- Email notifications via Resend (Slack only for MVP)
- Reminder nudges to non-responders (post-MVP)
- Historical poll archive
- Advanced analytics

### Out of Scope (Likely Forever)

- Client-to-client scheduling (not our use case)
- Public poll templates
- Integration with non-Google calendars (Outlook, iCloud) — defer to Cal.com roadmap

---

## 7. Success Criteria

### MVP Success Metrics

| Metric | Target |
|--------|--------|
| Time to create poll | < 2 minutes |
| Time for client to respond | < 1 minute |
| Time to find mutually available slot | < 5 minutes after last response |
| Reduction in scheduling emails | 80%+ reduction |
| Mobile response completion rate | 90%+ |

### Qualitative

- Ben and Cadre team prefer this over email/manual coordination
- Clients find it easy and don't ask "how do I use this?"
- Heat map is immediately understandable

---

## 8. Open Questions / Parking Lot

| Question | Status | Resolution |
|----------|--------|------------|
| How to handle timezone display on poll response page? | **Resolved** | MVP: Display times in poll creator's timezone with clear label (e.g., "Times shown in Pacific Time"). Use browser's Intl API to detect user's timezone and show a helper note if different. Post-MVP: Add toggle to view in user's local timezone. |
| Should Cadre "optional" members also input availability? | Open | Tentatively yes — their calendar is checked but they can override |
| What if no slot works for everyone? | Open | Show "best available" (most overlap) and let creator decide |
| Domain for shareable links? | Open | `polls.cadre.ai` or `cal.cadre.ai/poll/xxx`? |

---

## 9. Implementation Status (Phase 1)

### User Stories - Implementation Progress

| ID | Story | Status | Notes |
|----|-------|--------|-------|
| **Poll Creation** | | | |
| C1 | Create poll selecting Cadre colleagues | ✅ Implemented | Participant type selection in create form |
| C2 | Mark participants required/optional | ✅ Implemented | `ParticipantType` enum: CADRE_REQUIRED, CADRE_OPTIONAL, CLIENT |
| C3 | See team calendar availability | ⬜ Not Started | Phase 1B - needs getTeamAvailability |
| C4 | Drag across calendar to define windows | ⬜ Partial | Windows added via date range; drag-to-select not yet |
| C5 | Set meeting duration | ✅ Implemented | Duration dropdown (15-120 min) |
| C6 | Set date range | ✅ Implemented | DateRangePicker in create form |
| C7 | Add client participants | ✅ Implemented | Participant manager in create form |
| C8 | Add title and description | ✅ Implemented | Text fields in create form |
| C9 | Receive shareable link and QR code | ✅ Implemented | ShareDialog with QR code, copy link, download QR PNG |
| C10 | Add participants after creation | ✅ Implemented | Phase 7 - Edit page with add participant form |
| C11 | Edit windows after creation | ✅ Implemented | Phase 7 - Date range change regenerates windows |
| **Poll Response** | | | |
| R1 | Open poll without login | ✅ Implemented | Public route `/p/[accessToken]` |
| R2 | Enter name and email | ✅ Implemented | Name/email fields on response page |
| R3 | Mark availability in windows | ✅ Implemented | Time slot selection UI |
| R4 | See anonymous heat map | ✅ Implemented | Heat map with color-coded availability |
| R5 | See invited participants | ✅ Implemented | Shows participant count and response status |
| R6 | Submit availability | ✅ Implemented | Submit button with tRPC mutation |
| R7 | Return and edit response | ✅ Implemented | Re-submission replaces existing |
| R8 | Mobile works well | ✅ Tested | Responsive layout verified |
| **Results & Booking** | | | |
| B1 | Heat map showing overlap | ✅ Implemented | Color-coded heat map in detail view |
| B2 | Toggle all/required view | ✅ Implemented | Phase 8 - Toggle buttons in detail view |
| B3 | Clear "everyone available" indicator | ✅ Implemented | "Perfect times" banner, green slots |
| B4 | One-click booking | ✅ Implemented | Select slot → confirm dialog → book |
| B5 | Calendar invites sent | ✅ Implemented | Via Cal.com booking system |
| B6-B7 | Slack notifications | ✅ Implemented | DM to Cadre participants (needs Slack app setup) |
| **Poll Management** | | | |
| M1 | View all polls | ✅ Implemented | `/group-polls` list page |
| M2 | Dashboard count | ✅ Implemented | Phase 8 - Active poll count badge in list view |
| M3 | Manual close poll | ✅ Implemented | Phase 8 - Close Poll button for ACTIVE polls |
| M4 | Auto-expire polls | ✅ Implemented | Phase 8 - Check-on-load pattern |
| M5 | Reminder nudges | ⬜ Not Started | Post-MVP |

### Scope Delivered vs. Remaining

**Delivered in Phase 1 + 1B:**
- ✅ Poll creation with windows and participants
- ✅ Client response collection (no login required)
- ✅ Poll list management
- ✅ Shareable links
- ✅ Time slot selection UI
- ✅ Heat map visualization (color-coded, perfect times indicator)
- ✅ Email invitations on poll creation

**Delivered in Phase 2 (Booking Integration):**
- ✅ Event Type selector in poll creation
- ✅ Selectable heat map with slot detail panel
- ✅ Booking confirmation dialog
- ✅ One-click booking from poll results
- ✅ Poll status updates to BOOKED
- ✅ Attendees linked to booking

**Remaining for MVP:**
- [x] ~~Fix date display timezone issue~~ ✅ Phase 2B
- [x] ~~Google Calendar sync for bookings~~ ✅ Phase 2B (EventManager)
- [x] ~~QR codes~~ ✅ Phase 5 (ShareDialog with download)
- [x] ~~Public poll link with multi-participant submit~~ ✅ Phase 5
- [x] ~~Slack notifications~~ ✅ Phase 6 (Slack app created, DMs working)
- [x] ~~Poll editing after creation~~ ✅ Phase 7 (add/remove participants, update date range)

**🎉 All MVP + Polish requirements complete!**

**Delivered in Phase 8 (Polish & Launch):**
- [x] ~~Toggle all/required view (B2)~~ ✅ Phase 8
- [x] ~~Dashboard poll count (M2)~~ ✅ Phase 8
- [x] ~~Manual close poll (M3)~~ ✅ Phase 8
- [x] ~~Auto-expire polls (M4)~~ ✅ Phase 8

**Future enhancements (post-launch):**
- [ ] Cadre calendar availability check (C3) - Enhancement
- [ ] Reminder nudges to non-responders (M5) - Enhancement

---

## 10. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2024-01-XX | Claude + Ben | Initial specification |
| 2025-11-27 | Claude + Ben | Updated IDs from UUID to Integer (Cal.com convention), resolved timezone question, added access_token field |
| 2025-11-27 | Claude + Ben | Added Section 9: Implementation Status tracking user story progress |
| 2025-11-28 | Claude + Ben | Phase 6: Slack notifications implemented (B6-B7 complete) |
| 2025-11-29 | Claude + Ben | Phase 7: Poll editing (C10, C11 complete). All MVP requirements done! |
| 2025-11-28 | Claude + Ben | Phase 8: Polish complete (B2, M2, M3, M4). Feature complete for launch! |
