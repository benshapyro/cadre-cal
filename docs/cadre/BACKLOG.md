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
- **Status**: 🔍 Investigating
- **Priority**: P1 (High) - Blocks admin from enabling 2FA
- **Description**: When trying to enable 2FA, entering the correct password results in "Password is incorrect" error, even though the same password works correctly in the change password flow
- **Steps to Reproduce**:
  1. Login to cal.cadreai.com as admin user
  2. Go to Settings → Security → Two-Factor Authentication
  3. Toggle 2FA on
  4. Enter current password in the modal
  5. Click Continue
- **Expected**: Password accepted, QR code displayed for authenticator setup
- **Actual**: "Password is incorrect" error displayed
- **Verification**: Password confirmed valid in change password flow (error: "New password matches old password" when trying to reuse it)
- **Root Cause Investigation**:
  - **2FA setup flow**: `apps/web/app/api/auth/two-factor/totp/setup/route.ts`
    - Uses `parseRequestData(req)` to get body.password
    - Uses `getServerSession({ req: buildLegacyRequest(...) })` for auth
    - Verifies: `verifyPassword(body.password, user.password.hash)`
  - **Change password flow**: `packages/trpc/server/routers/viewer/auth/changePassword.handler.ts`
    - Uses tRPC mutation with session from context
    - Verifies: `verifyPassword(oldPassword, currentPassword)`
  - **Both use identical** `verifyPassword()` function (bcrypt.compare)
  - **Possible causes**:
    1. Session/user mismatch between App Router API route and tRPC
    2. Password encoding/escaping issue in request body
    3. Special characters in password handled differently
    4. `buildLegacyRequest` may not correctly pass all session info
- **Debug Strategy**:
  1. Add logging to 2FA setup route to inspect body.password and user.password.hash
  2. Compare session.user.id in both flows
  3. Test with a simple password (no special characters)
- **Workaround**: None currently - user cannot enable 2FA
- **Files Involved**:
  - `apps/web/app/api/auth/two-factor/totp/setup/route.ts` (lines 32-58)
  - `apps/web/components/settings/EnableTwoFactorModal.tsx`
  - `apps/web/components/settings/TwoFactorAuthAPI.ts`
  - `packages/features/auth/lib/verifyPassword.ts`

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

(No enhancements reported yet)

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

(No UX improvements reported yet)

---

## Completed Items

Items moved here after being fixed/implemented.

---

## Statistics
- **Total Open**: 1
- **Bugs**: 3 (1 fixed, 1 analyzed - not a bug, 1 investigating)
- **Enhancements**: 0
- **UX**: 0
- **Last Updated**: 2025-11-30
