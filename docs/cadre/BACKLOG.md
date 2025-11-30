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
- **Status**: Investigating
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
- **Status**: Fix deployed, awaiting test verification

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
- **Bugs**: 1
- **Enhancements**: 0
- **UX**: 0
- **Last Updated**: 2025-11-29
