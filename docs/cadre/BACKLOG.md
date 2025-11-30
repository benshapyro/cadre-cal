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
- **Status**: Open - Fix Required
- **Priority**: P2 (Medium) - Cosmetic but limits integrations
- **Description**: Production App Store page shows "Cal Video" repeated for all apps, while local shows 28+ apps (Zoom, Google Calendar, Zoho, etc.)
- **Steps to Reproduce**:
  1. Go to cal.cadreai.com/apps
  2. Observe all tiles show "Cal Video"
  3. Compare to local which shows full app catalog
- **Expected**: Full app catalog displayed (Zoom, Google Calendar, Slack, etc.)
- **Actual**: Only "Cal Video" shown for every app tile
- **Root Cause Analysis**:
  - Apps are stored in the database `App` table
  - The `scripts/seed-app-store.ts` script populates this table from `appStoreMetadata`
  - **Local**: `yarn db-seed` runs the seed script, creating 100+ app entries
  - **Production**: Only migrations ran, seed script never executed
  - Cal Video is the default fallback when no app data exists
- **Fix Required**:
  1. Run seed script on production: `yarn seed-app-store`
  2. Or via Railway CLI: `railway run yarn seed-app-store`
  3. Consider adding to deployment workflow after migrations
- **Note**: Apps requiring API credentials (Zoom, Google, etc.) will appear but won't work until credentials configured in `.env.appStore`

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

---

## Completed Items

Items moved here after being fixed/implemented.

---

## Statistics
- **Total Open**: 2
- **Bugs**: 4 (1 fixed, 1 analyzed - not a bug, 2 fix pending production)
- **Enhancements**: 1 (done)
- **UX**: 1 (done)
- **Last Updated**: 2025-11-30
