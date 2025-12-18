# Dashboard Authentication & Session Management Issues

**Component:** Dashboard  
**Priority:** Critical  
**Created:** UAT Findings

## Quick Summary

6 critical issues affecting dashboard authentication, session management, and user experience:

1. ❌ Session not persistent across browsers
2. ❌ Feedback messages disappear too quickly
3. ❌ No logout functionality
4. ❌ No password reset
5. ❌ No welcome message/user identification
6. ❌ No auth request origin indication

---

## Issue Details

### 1. Session Not Persistent Across Browsers

**Impact:** Critical - Users must re-authenticate after redirect

**Root Cause:**
- Dashboard uses Supabase auth
- Auth-gateway sets separate session cookies
- Two auth systems not synchronized
- Dashboard doesn't check auth-gateway cookies

**Fix Required:**
- Sync Supabase session with auth-gateway cookies
- Validate `lanonasis_session` cookie on dashboard load
- Ensure cookie domain matches across subdomains

---

### 2. Feedback Message Disappears Too Quickly

**Impact:** High - Poor UX, users can't read success messages

**Current Behavior:**
- Messages appear for < 1 second
- Auto-redirect happens immediately
- No way to dismiss or read message

**Fix Required:**
- Increase display time to 5+ seconds
- Make messages dismissible
- Add persistent toast/notification system

---

### 3. No Logout Functionality

**Impact:** Critical - Security & UX issue

**Current State:**
- Logout endpoint exists: `/web/logout`
- No UI element to trigger logout
- Users must manually clear cookies

**Fix Required:**
- Add logout button to header/user menu
- Connect to existing `/web/logout` endpoint
- Clear all session cookies
- Redirect to login page

**Files:**
- `onasis-core/services/auth-gateway/src/routes/web.routes.ts:270-285` (endpoint exists)
- `lanonasis-maas/dashboard/src/components/layout/Header.tsx` (needs logout button)
- `lanonasis-maas/dashboard/src/hooks/useAuth.tsx:302` (signOut function exists)

---

### 4. No Password Reset

**Impact:** High - Users cannot recover accounts

**Current State:**
- `resetPassword` function exists in `useAuth.tsx`
- No UI to access it
- No "Forgot Password" link

**Fix Required:**
- Add "Forgot Password" link to login form
- Create password reset page
- Integrate with existing function
- Add email template

**Files:**
- `lanonasis-maas/dashboard/src/hooks/useAuth.tsx:459-472` (function exists)
- `lanonasis-maas/dashboard/src/components/auth/AuthForm.tsx` (needs UI)
- `lanonasis-maas/dashboard/src/pages/Auth.tsx` (needs route)

---

### 5. No Welcome Message/User Identification

**Impact:** Medium - Poor UX, unclear authentication state

**Current State:**
- User data available in `useAuth` hook
- Not displayed in UI
- No welcome message
- No user profile indicator

**Fix Required:**
- Display welcome message on dashboard load
- Show user name/email in header
- Add user avatar/profile picture
- Show authentication status

**Files:**
- `lanonasis-maas/dashboard/src/pages/Dashboard.tsx`
- `lanonasis-maas/dashboard/src/components/layout/Header.tsx`
- `lanonasis-maas/dashboard/src/hooks/useAuth.tsx` (user data available)

---

### 6. No Auth Request Origin Indication

**Impact:** Medium - Security & transparency issue

**Current State:**
- OAuth authorize page has client info but may not display properly
- Login redirect doesn't show client context
- Users don't know what they're authorizing

**Fix Required:**
- Display client name in OAuth authorize page
- Show requested scopes
- Add client info to login redirect
- Show connection confirmation after auth

**Files:**
- `lanonasis-maas/dashboard/src/pages/OAuthAuthorize.tsx` (has client info)
- `onasis-core/services/auth-gateway/src/routes/web.routes.ts` (needs client context)
- `onasis-core/services/auth-gateway/src/routes/oauth.routes.ts` (OAuth authorize)

---

## Technical Architecture Issue

### Dual Authentication Systems

**Problem:**
- **Auth Gateway:** Sets `lanonasis_session` cookies
- **Dashboard:** Uses Supabase auth sessions
- **Result:** Two separate auth systems, not synchronized

**Solution Options:**

1. **Option A: Unified Auth (Recommended)**
   - Dashboard checks auth-gateway cookies
   - Sync Supabase session with auth-gateway
   - Single source of truth

2. **Option B: Dashboard Uses Auth-Gateway**
   - Remove Supabase auth from dashboard
   - Use auth-gateway exclusively
   - Validate cookies on all requests

3. **Option C: Bridge Both Systems**
   - On login, create both Supabase and auth-gateway sessions
   - On logout, clear both
   - Validate both on dashboard load

---

## Implementation Priority

### Phase 1: Critical Fixes (Week 1)
1. ✅ Fix session persistence
2. ✅ Add logout functionality
3. ✅ Improve feedback messages

### Phase 2: Essential Features (Week 2)
4. ✅ Add password reset
5. ✅ Add welcome message/user identification

### Phase 3: Enhancements (Week 3)
6. ✅ Show auth request origin
7. ✅ Add "Connected Applications" section

---

## Files to Modify

### Auth Gateway
- `onasis-core/services/auth-gateway/src/routes/web.routes.ts`
  - Improve redirect with feedback message
  - Add client context to login
  - Ensure cookies are set correctly

### Dashboard
- `lanonasis-maas/dashboard/src/hooks/useAuth.tsx`
  - Check auth-gateway cookies
  - Sync with Supabase session
  - Expose logout/reset password in UI

- `lanonasis-maas/dashboard/src/components/layout/Header.tsx`
  - Add logout button
  - Add user profile/avatar
  - Show user name/email

- `lanonasis-maas/dashboard/src/components/auth/AuthForm.tsx`
  - Add "Forgot Password" link
  - Add password reset form

- `lanonasis-maas/dashboard/src/pages/Dashboard.tsx`
  - Add welcome message
  - Show user identification

- `lanonasis-maas/dashboard/src/pages/OAuthAuthorize.tsx`
  - Improve client info display
  - Show scopes clearly
  - Add connection confirmation

---

## Testing Checklist

### Session Persistence
- [ ] Sign in, open dashboard in new tab - should stay authenticated
- [ ] Sign in, close browser, reopen - should stay authenticated
- [ ] Sign in on one browser, check another - should work (if same domain)

### Logout
- [ ] Click logout button - should clear session
- [ ] After logout, try accessing dashboard - should redirect to login
- [ ] After logout, cookies should be cleared

### Password Reset
- [ ] Click "Forgot Password" - should show reset form
- [ ] Submit email - should receive reset email
- [ ] Click reset link - should allow password change
- [ ] After reset, should be able to login with new password

### Welcome Message
- [ ] After login, should see welcome message
- [ ] Should show user name/email
- [ ] Should show user avatar/profile

### Auth Origin
- [ ] OAuth flow should show client name
- [ ] Should show requested scopes
- [ ] After auth, should confirm connection

---

## Execution

To create the GitHub issue:

```bash
cd /opt/lanonasis/lanonasis-maas/IDE-EXTENSIONS
./create-dashboard-auth-issue.sh
```

**Prerequisites:**
```bash
# Install GitHub CLI
sudo apt install gh
gh auth login

# Verify access
gh repo view lanonasis/lanonasis-maas
```

---

## Related Issues

- VS Code Extension UAT Issues (session management related)
- OAuth2 PKCE Implementation
- Session Cookie Implementation

---

## Notes

- All issues are fixable with existing codebase
- Some functions already exist (logout, reset password) but need UI
- Session persistence is the most critical issue
- Dual auth system needs architectural decision

