# Cadre Calendar Backlog

Production issues and improvements for cal.cadreai.com.

## Workflow
1. **Report**: User provides description + screenshots/logs
2. **Analyze**: Claude investigates codebase, identifies root cause
3. **Document**: Add to appropriate section with analysis
4. **Review**: Periodically prioritize and plan sprints
5. **Track**: Update status as items are worked/completed

---

## Bugs

### Template
<!--
### [BUG-XXX] Title
- **Reported**: YYYY-MM-DD
- **Status**: Open | Investigating | In Progress | Fixed
- **Priority**: P0 (Critical) | P1 (High) | P2 (Medium) | P3 (Low)
- **Description**: What happened
- **Steps to Reproduce**: 1. 2. 3.
- **Expected**: What should happen
- **Actual**: What actually happened
- **Root Cause**: (filled after analysis)
- **Fix**: (commit/PR link when fixed)
-->

### [BUG-001] Password reset email not received
- **Reported**: 2025-11-29
- **Status**: ✅ Fixed
- **Priority**: P1 (High)
- **Description**: User requested password reset, UI shows "Reset link sent" but email never arrives
- **Steps to Reproduce**:
  1. Go to cal.cadreai.com
  2. Click "Forgot password"
  3. Enter ben@gocadre.ai
  4. Click submit
- **Expected**: Email arrives with reset link
- **Actual**: "Reset link sent" page shown but no email received
- **Root Cause Investigation**:
  - **Finding 1**: Cal.com email priority order in `serverConfig.ts`:
    1. `RESEND_API_KEY` → uses hardcoded Resend SMTP (port 465)
    2. `EMAIL_SERVER` → connection string
    3. `EMAIL_SERVER_HOST` → manual SMTP config
    4. Fallback → sendmail
  - **Finding 2**: When `RESEND_API_KEY` is set, ALL `EMAIL_SERVER_*` vars are IGNORED
  - **Finding 3**: User set both in Railway, but EMAIL_SERVER_* config (port 587) is being ignored
  - **Email flow**: forgot-password/route.ts → passwordResetRequest.ts → auth-email-service.ts → BaseEmail → nodemailer
- **Config Added to Railway** (2025-11-29):
  - `RESEND_API_KEY` = set ✓
  - `EMAIL_FROM` = `notifications@cadreai.com` ✓
  - `EMAIL_FROM_NAME` = `Cadre Calendar` ✓
  - `EMAIL_SERVER_*` = set but IGNORED (redundant with RESEND_API_KEY)
- **Root Cause Analysis** (2025-11-29):
  1. **Initial Finding**: Resend shows "no sent emails yet" despite correct config
  2. **Database Investigation** (all passed):
     - ✅ User exists: `ben@gocadre.ai` (id=1, emailVerified: 2025-11-27)
     - ✅ Email kill switch OFF: `Feature.emails.enabled = false`
     - ✅ Password reset requests created in `ResetPasswordRequest` table
  3. **Domain Verification**: Fixed `EMAIL_FROM` to use `notifications@cal.cadreai.com` (verified domain)
  4. **ACTUAL ROOT CAUSE: Railway blocks SMTP ports**
     - Port 465 (SSL): `ETIMEDOUT` - connection timeout
     - Port 587 (STARTTLS): Also blocked - hangs indefinitely
     - Railway blocks outbound SMTP to prevent spam abuse
- **Fix Implemented** (2025-11-30):
  - Changed from nodemailer SMTP to **Resend HTTP API**
  - Uses `fetch("https://api.resend.com/emails")` instead of SMTP
  - HTTP/HTTPS (port 443) is not blocked by Railway
  - Code: `packages/emails/templates/_base-email.ts`
  - Commits: `8d79e28` - Resend HTTP API implementation
- **Status**: ✅ Fixed and verified (2025-11-30)
- **Resolution**: Email received, password reset successful

### [BUG-002] Admin password/2FA warning shown despite valid password
- **Reported**: 2025-11-30
- **Status**: ✅ Analyzed - Not a bug (expected behavior)
- **Priority**: P3 (Low) - User action required
- **Description**: After login, orange banner shows "You are admin but you do not have a password length of at least 15 characters or no 2FA yet" even though password is 15+ characters with numbers and mixed case
- **Steps to Reproduce**:
  1. Login to cal.cadreai.com as admin user
  2. See orange banner warning about password/2FA
- **Expected**: No warning if password meets 15+ character requirement
- **Actual**: Warning shown despite password being 15+ characters
- **Root Cause Analysis**:
  - Code: `packages/features/auth/lib/next-auth-options.ts:262`
  - Logic: `isPasswordValid(credentials.password, false, true) && user.twoFactorEnabled`
  - Cal.com requires **BOTH** conditions for admin access (not OR):
    1. Password 15+ chars with uppercase, lowercase, number
    2. **AND** 2FA enabled
  - Banner message is misleading - says "or" but code uses "AND"
- **Fix**: Enable 2FA at `/settings/security/two-factor-auth`
- **Status**: Not a bug - expected Cal.com behavior for admin security

### [BUG-003] 2FA enable shows "Password is incorrect" when password is valid
- **Reported**: 2025-11-30
- **Status**: ✅ Root Cause Found - Fix Required in Production
- **Priority**: P1 (High) - Blocks admin from enabling 2FA
- **Description**: When trying to enable 2FA, entering the correct password results in "Password is incorrect" error, even though the same password works correctly in the change password flow
- **Steps to Reproduce**:
  1. Login to cal.cadreai.com as admin user
  2. Go to Settings → Security → Two-Factor Authentication
  3. Toggle 2FA on
  4. Enter current password in the modal
  5. Click Continue
- **Expected**: Password accepted, QR code displayed for authenticator setup
- **Actual**: "Password is incorrect" error displayed (production) / "Something went wrong" (local)
- **ROOT CAUSE FOUND** (2025-11-30):
  - **The `CALENDSO_ENCRYPTION_KEY` environment variable has the wrong format**
  - Cal.com's `symmetricEncrypt()` in `packages/lib/crypto.ts` requires exactly **32 characters**
  - The key was set in **base64 format** (44 characters): `dHwP4iw1bu4XOZh+kmRI72RI2wHFoXlGHQQ7X6n2ICs=`
  - This causes `Invalid key length` error when encrypting the TOTP secret during 2FA setup
  - The crypto function reads the key as `latin1` (raw bytes), NOT base64-decoded
  - **Code path**: 2FA setup → `symmetricEncrypt(secret, CALENDSO_ENCRYPTION_KEY)` → fails
- **Debug Findings**:
  - Password verification PASSES: `[2FA Setup] Password verification result: true`
  - Error occurs AFTER password check during encryption: `Error [HttpError]: Invalid key length`
  - The error is caught and displayed as generic "Something went wrong" or mapped to "Password is incorrect"
- **Fix Required**:
  1. Generate a new 32-character key: `openssl rand -hex 16`
  2. Update `CALENDSO_ENCRYPTION_KEY` in Railway to the new 32-char key
  3. Redeploy
  - ⚠️ Safe to change since 2FA was never successfully enabled (no encrypted data to lose)
- **Local Fix Applied**: Updated `.env` with `CALENDSO_ENCRYPTION_KEY=b5cd569214accf3ef330c4b5c3be6d16`
- **Verified**: 2FA enable works locally after fix
- **Files Involved**:
  - `packages/lib/crypto.ts` - `symmetricEncrypt()` requires 32-byte key
  - `apps/web/app/api/auth/two-factor/totp/setup/route.ts` - calls symmetricEncrypt

### [BUG-004] App Store shows only "Cal Video" in production
- **Reported**: 2025-11-30
- **Status**: ✅ Fixed (2025-11-30)
- **Priority**: P2 (Medium) - Cosmetic but limits integrations
- **Description**: Production App Store page shows "Cal Video" repeated for all apps, while local shows 28+ apps (Zoom, Google Calendar, Zoho, etc.)
- **Root Cause**: `scripts/seed-app-store.ts` never ran on production - only migrations did
- **Fix Applied**: Ran seed script locally with public DATABASE_URL:
  ```bash
  DATABASE_URL="postgresql://...@switchyard.proxy.rlwy.net:32712/railway" \
  DATABASE_DIRECT_URL="postgresql://...@switchyard.proxy.rlwy.net:32712/railway" \
  npx ts-node --transpile-only scripts/seed-app-store.ts
  ```
- **Result**: 102 apps now in production database
- **Note**: Apps requiring API credentials (Zoom, Google, etc.) appear but won't work until credentials configured

### [BUG-005] 2FA login requires double authentication
- **Reported**: 2025-11-30
- **Status**: ✅ Fix Applied - Pending Verification
- **Priority**: P1 (High) - Poor UX, authentication flow broken
- **Description**: After entering email/password and 2FA code, user is redirected back to login screen and must repeat the entire process
- **Steps to Reproduce**:
  1. Go to cal.cadreai.com (or production URL)
  2. Enter email and password
  3. Click Sign In
  4. Enter 2FA authenticator code
  5. Click Verify (or submit)
- **Expected**: User is logged in and redirected to dashboard/event-types
- **Actual**: User is sent back to login screen, must enter email/password and 2FA code again. Second attempt succeeds.
- **Root Cause**: Same as BUG-006 - `NEXT_PUBLIC_WEBAPP_URL` not baked in at build time, causing URL mismatch in NextAuth callbacks
- **Fix Applied**: See BUG-006

### [BUG-006] Production routing to railway.app instead of custom domain
- **Reported**: 2025-11-30
- **Status**: ✅ Fix Applied - Pending Verification
- **Priority**: P1 (High) - Security/UX issue, domain mismatch
- **Description**: After logging in, users are routed to `web-production-7adc5.up.railway.app` instead of `cal.cadreai.com`
- **Steps to Reproduce**:
  1. Go to cal.cadreai.com
  2. Log in successfully
  3. Observe URL in browser
- **Expected**: URL shows `cal.cadreai.com/event-types`
- **Actual**: URL shows `web-production-7adc5.up.railway.app/event-types`
- **Root Cause Found** (2025-11-30):
  - `NEXT_PUBLIC_*` vars must be in `railway.toml [build.args]`, not just Railway web UI
  - Railway web UI vars are runtime-only; `NEXT_PUBLIC_*` vars are baked in at build time
  - Cal.com's `WEBAPP_URL` in `packages/lib/constants.ts` falls back to `RAILWAY_STATIC_URL` (auto-injected by Railway)
  - When `NEXT_PUBLIC_WEBAPP_URL` isn't properly baked in, the fallback returns `*.railway.app`
- **Fix Applied** (2025-11-30):
  1. Added to `railway.toml [build.args]`:
     - `NEXT_PUBLIC_WEBAPP_URL = "https://cal.cadreai.com"`
     - `NEXT_PUBLIC_WEBSITE_URL = "https://cal.cadreai.com"`
     - `NEXT_PUBLIC_LICENSE_CONSENT = "agree"`
  2. Set `RAILWAY_STATIC_URL = (empty)` in Railway web UI to prevent fallback
  3. Bumped `CACHEBUST` to force Docker rebuild
- **Commits**: `75349f9a40` - Add license consent and website URL as build args

### [BUG-007] GroupPoll create fails - eventTypeId column missing in production
- **Reported**: 2025-12-02
- **Status**: Open
- **Priority**: P1 (Critical) - Core feature completely broken in production
- **Description**: Creating a Group Poll fails with Prisma error "The column `eventTypeId` does not exist in the current database"
- **Steps to Reproduce**:
  1. Go to cal.cadreai.com/group-polls/new
  2. Fill in poll details (title, event type, dates, participants)
  3. Click "Create Poll"
- **Expected**: Poll is created successfully
- **Actual**: Error: `Invalid prisma.groupPoll.create() invocation: The column eventTypeId does not exist in the current database`
- **Root Cause**:
  - Schema (`packages/prisma/schema.prisma`) has `eventTypeId` (line 2939) and `bookingId` (line 2943) on GroupPoll model
  - Migration `20251127153043_add_group_polls` does NOT include these columns
  - Schema was updated after migration was created, but no follow-up migration was generated
  - Production DB is missing these columns entirely
- **Affected Files**:
  - `packages/prisma/schema.prisma:2939-2943` - Has columns that don't exist in DB
  - `packages/prisma/migrations/` - Missing migration for new columns
- **Proposed Fix**:
  1. Generate new migration: `yarn prisma migrate dev --name add_group_poll_event_booking`
  2. Commit migration file
  3. Push to trigger Railway deploy (runs `prisma migrate deploy`)

---

## Enhancements

### Template
<!--
### [ENH-XXX] Title
- **Reported**: YYYY-MM-DD
- **Status**: Open | Planned | In Progress | Done
- **Priority**: P1-P3
- **Description**: What should be improved
- **User Impact**: Who benefits and how
- **Proposed Solution**: (filled after analysis)
- **Implementation**: (commit/PR link when done)
-->

### [ENH-001] Show pending poll count badge in sidebar
- **Reported**: 2025-11-30
- **Status**: ✅ Done
- **Priority**: P3 (Low)
- **Description**: Show badge with count of pending/active polls needing attention in sidebar navigation
- **User Impact**: Poll organizers can quickly see if they have polls awaiting responses or ready to finalize
- **Proposed Solution**:
  - Create `GroupPollsBadge` component similar to `UnconfirmedBookingBadge`
  - Query count of polls with status `OPEN` (active polls awaiting responses)
  - Display count in red badge next to "Group Polls" nav item
  - Reference: `packages/features/bookings/components/UnconfirmedBookingBadge.tsx`
- **Implementation**:
  1. Create `packages/features/group-polls/components/GroupPollsBadge.tsx`
  2. Add tRPC endpoint `viewer.groupPolls.pendingCount`
  3. Add badge to nav item:
     ```typescript
     {
       name: "group_polls",
       href: "/group-polls",
       icon: "vote",
       badge: <GroupPollsBadge />,
     }
     ```
- **Depends on**: UX-001 (sidebar nav item)

### [ENH-002] Add required/optional distinction for Client participants
- **Reported**: 2025-11-30
- **Status**: Open - Future
- **Priority**: P3 (Low) - Future enhancement
- **Description**: Currently only Cadre members can be marked required/optional. Clients should have the same distinction.
- **Current State**: `ParticipantType` enum has: `CADRE_REQUIRED`, `CADRE_OPTIONAL`, `CLIENT`
- **User Impact**: More flexible scheduling - some external participants may be optional
- **Recommended Approach**: Separate `type` from `isRequired` (not more enum values)
  ```prisma
  enum ParticipantType {
    CADRE
    CLIENT
  }

  model GroupPollParticipant {
    type       ParticipantType
    isRequired Boolean @default(true)
  }
  ```
- **Why this approach**:
  - Cleaner schema, no combinatorial explosion
  - Simpler UI: dropdown for type + checkbox for required
  - Easier queries: `WHERE isRequired = true` vs `WHERE type IN (...)`
  - Extensible: adding new types (e.g., `VENDOR`) doesn't require `_REQUIRED`/`_OPTIONAL` variants
- **UI Change**: `[Name] [Email] [Type ▼] [☑ Required] [🗑]`
- **Scope**: Medium-Large - affects multiple areas:
  - Schema: Refactor enum + add `isRequired` boolean + migration
  - UI: Update create/edit forms with checkbox
  - Logic: Finalization algorithm uses `isRequired` field
  - Heat map: Visual distinction for required vs optional availability
  - Notifications: Different messaging for required vs optional participants
- **Migration**: Transform existing `CADRE_REQUIRED` → `CADRE + true`, `CADRE_OPTIONAL` → `CADRE + false`, `CLIENT` → `CLIENT + true`
- **Notes**: Deferring for now; current simplicity works for MVP

---

## UX Improvements

### Template
<!--
### [UX-XXX] Title
- **Reported**: YYYY-MM-DD
- **Status**: Open | Planned | In Progress | Done
- **Priority**: P1-P3
- **Description**: UX issue or improvement opportunity
- **Current Behavior**: How it works now
- **Proposed Behavior**: How it should work
- **Implementation**: (commit/PR link when done)
-->

### [UX-001] Add Group Polls to sidebar navigation
- **Reported**: 2025-11-30
- **Status**: ✅ Done
- **Priority**: P2 (Medium)
- **Description**: Group Polls feature is only accessible via direct URL (`/group-polls`), not discoverable in sidebar
- **Current Behavior**: Users must know the URL to access Group Polls
- **Proposed Behavior**: Add "Group Polls" item to sidebar after "Availability" with `handshake` icon
- **Analysis**:
  - Navigation defined in `packages/features/shell/navigation/Navigation.tsx`
  - Translation needed in `apps/web/public/static/locales/en/common.json`
  - Recommended position: After Availability (position 4) - natural scheduling workflow
  - Icon options: `vote` (best), `clipboard-check`, `messages-square`
- **Implementation**:
  1. Add `"group_polls": "Group Polls"` to translation file
  2. Add nav item to `getNavigationItems()` array after availability:
     ```typescript
     {
       name: "group_polls",
       href: "/group-polls",
       icon: "vote",
     }
     ```

### [UX-002] Trash icon misaligned on first participant row
- **Reported**: 2025-11-30
- **Status**: Open
- **Priority**: P3 (Low) - Cosmetic polish
- **Description**: On group-polls/new, the trash icon on the first participant row sits higher than the input fields because it's vertically centered with the full row height (labels + inputs) instead of aligning with just the inputs
- **Current Behavior**: First row uses `flex items-center`, but labels add height, pushing trash icon above input level
- **Proposed Behavior**: Trash icon should align with input fields on all rows
- **Affected Components**:
  - `apps/web/modules/group-polls/views/group-polls-create-view.tsx:214`
  - `apps/web/modules/group-polls/views/group-polls-edit-view.tsx` (same pattern)
- **Implementation Notes**:
  - Option A: Change `items-center` → `items-end` on row container
  - Option B: Add `self-end` to the trash button specifically

---

## Completed Items

Items moved here after being fixed/implemented.

---

## Statistics
- **Total Open**: 6
- **Bugs**: 7 (2 fixed, 1 analyzed - not a bug, 2 fix pending verification, 1 new P1 open)
- **Enhancements**: 2 (1 done, 1 open)
- **UX**: 2 (1 done, 1 open)
- **Last Updated**: 2025-12-02
