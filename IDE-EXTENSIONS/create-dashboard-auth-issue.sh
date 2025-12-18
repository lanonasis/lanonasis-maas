#!/bin/bash
# Create GitHub issue for Dashboard Authentication & Session Management
# Usage: ./create-dashboard-auth-issue.sh

REPO="lanonasis/lanonasis-maas"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) not found. Install with: sudo apt install gh"
    echo "Then authenticate with: gh auth login"
    exit 1
fi

echo "Creating Dashboard Authentication & Session Management issue in $REPO..."
echo ""

# Issue: Dashboard Authentication & Session Management
gh issue create \
  --repo "$REPO" \
  --title "[Critical] Dashboard Authentication: Session Persistence, UX, and Missing Features" \
  --label "bug,critical,dashboard,authentication,ux" \
  --body "**Component:** Dashboard Authentication & Session Management
**Priority:** Critical
**Affected Areas:** Dashboard, Auth Gateway, User Experience

## Overview

Multiple critical issues with dashboard authentication flow affecting session persistence, user experience, and essential functionality.

---

## Issues Identified

### 1. ❌ Session Not Persistent Across Browsers

**Problem:**
After successful sign-in, when redirected to dashboard, users are required to sign in again. Session cookies are not being properly validated or persisted.

**Steps to Reproduce:**
1. Sign in at \`auth.lanonasis.com/web/login\`
2. Get redirected to dashboard
3. Open dashboard in another browser/tab
4. Observe: Required to sign in again

**Expected Behavior:**
- Session should persist across browser tabs/windows
- Session cookies should be validated on dashboard load
- Users should remain authenticated across \`.lanonasis.com\` subdomains

**Actual Behavior:**
- Session appears to be lost after redirect
- Dashboard requires re-authentication
- Cookies may not be properly set or validated

**Related Files:**
- \`onasis-core/services/auth-gateway/src/routes/web.routes.ts\` (lines 229-259)
- \`lanonasis-maas/dashboard/src/hooks/useAuth.tsx\`
- \`lanonasis-maas/dashboard/src/components/auth/ProtectedRoute.tsx\`

---

### 2. ❌ Feedback Message Disappears Too Quickly

**Problem:**
When browser redirect works (with existing session cookies), the success/feedback message disappears before users can read it. The page redirects too quickly.

**Steps to Reproduce:**
1. Have existing session cookies
2. Authenticate via OAuth or login
3. Get redirected to dashboard
4. Observe: Success message appears briefly then disappears/redirects

**Expected Behavior:**
- Success message should be visible for at least 3-5 seconds
- Message should be dismissible by user
- Should show clear feedback: \"Welcome back, [User]!\" or \"Successfully signed in\"

**Actual Behavior:**
- Message appears for < 1 second
- Auto-redirect happens too quickly
- Users cannot read the feedback

**Related Files:**
- \`lanonasis-maas/dashboard/src/hooks/useAuth.tsx\` (lines 85-95)
- \`onasis-core/server/auth-callback-handler.js\` (lines 98-101)
- \`onasis-core/netlify/functions/dashboard-callback.js\`

---

### 3. ❌ No Logout Functionality

**Problem:**
Users cannot log out from the dashboard. No logout button or option available in the UI.

**Steps to Reproduce:**
1. Sign in to dashboard
2. Look for logout option
3. Observe: No logout button/option available

**Expected Behavior:**
- Logout button in user menu or header
- Logout should clear session cookies
- Logout should redirect to login page
- Logout endpoint exists at \`/web/logout\` but not accessible from UI

**Actual Behavior:**
- No logout UI element
- Users must manually clear cookies
- Cannot switch between accounts

**Related Files:**
- \`onasis-core/services/auth-gateway/src/routes/web.routes.ts\` (lines 270-285) - Logout endpoint exists
- \`lanonasis-maas/dashboard/src/components/layout/Header.tsx\` - Missing logout button
- \`lanonasis-maas/dashboard/src/hooks/useAuth.tsx\` (line 302) - signOut function exists but not exposed in UI

---

### 4. ❌ No Password Reset Functionality

**Problem:**
Users cannot reset their password from the dashboard. No \"Forgot Password\" or \"Reset Password\" option available.

**Steps to Reproduce:**
1. Go to login page
2. Look for \"Forgot Password\" or \"Reset Password\" link
3. Observe: No such option available

**Expected Behavior:**
- \"Forgot Password\" link on login page
- Password reset form/page
- Email with reset link
- Reset password functionality

**Actual Behavior:**
- No password reset option in UI
- \`resetPassword\` function exists in \`useAuth.tsx\` but not accessible

**Related Files:**
- \`lanonasis-maas/dashboard/src/hooks/useAuth.tsx\` (lines 459-472) - resetPassword function exists
- \`lanonasis-maas/dashboard/src/components/auth/AuthForm.tsx\` - Missing forgot password UI
- \`lanonasis-maas/dashboard/src/pages/Auth.tsx\` - Missing password reset route handling

---

### 5. ❌ No Welcome Message or User Identification

**Problem:**
After successful authentication, there is no welcome message identifying who is logged in. Users don't know if they're authenticated or which account they're using.

**Steps to Reproduce:**
1. Sign in to dashboard
2. Land on dashboard page
3. Observe: No welcome message, no user identification

**Expected Behavior:**
- Welcome message: \"Welcome back, [User Name/Email]!\"
- User profile/avatar in header
- Clear indication of authentication status
- User information displayed prominently

**Actual Behavior:**
- No welcome message
- No user identification
- Unclear if user is authenticated

**Related Files:**
- \`lanonasis-maas/dashboard/src/pages/Dashboard.tsx\`
- \`lanonasis-maas/dashboard/src/components/layout/Header.tsx\`
- \`lanonasis-maas/dashboard/src/hooks/useAuth.tsx\` - User data available but not displayed

---

### 6. ❌ No Auth Request Origin Indication

**Problem:**
When authentication is triggered from a client application (e.g., CLI, IDE extension), there is no indication of where the auth request came from. Users cannot confirm if they triggered the session to connect to a specific client.

**Steps to Reproduce:**
1. Trigger OAuth flow from CLI or IDE extension
2. Get redirected to auth page
3. Complete authentication
4. Observe: No indication of which client requested authentication

**Expected Behavior:**
- Display client name/application requesting access
- Show: \"[Application Name] is requesting access to your account\"
- Show requested scopes/permissions
- Allow user to confirm or deny
- After auth, show: \"Successfully connected [Application Name]\"

**Actual Behavior:**
- No client identification
- No scope indication
- Users don't know what they're authorizing
- No confirmation of which client was connected

**Related Files:**
- \`lanonasis-maas/dashboard/src/pages/OAuthAuthorize.tsx\` - Has client info but may not be displayed properly
- \`onasis-core/services/auth-gateway/src/routes/web.routes.ts\` - Login doesn't show client context
- \`onasis-core/services/auth-gateway/src/routes/oauth.routes.ts\` - OAuth authorize should show client info

---

## Technical Details

### Session Cookie Configuration

Current implementation sets cookies but may have issues:

\`\`\`typescript
// From web.routes.ts:233-253
res.cookie('lanonasis_session', tokens.access_token, {
    domain: cookieDomain,  // '.lanonasis.com'
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
})
\`\`\`

**Potential Issues:**
- Dashboard may not be checking these cookies
- Cookie domain may not match dashboard domain
- Session validation may be failing

### Dashboard Session Check

Dashboard uses Supabase auth, not auth-gateway cookies:

\`\`\`typescript
// From useAuth.tsx
const { data: { session } } = await supabase.auth.getSession()
\`\`\`

**Problem:** Two separate auth systems (Supabase vs auth-gateway cookies) causing session mismatch.

---

## Proposed Solutions

### 1. Fix Session Persistence
- [ ] Ensure dashboard checks \`lanonasis_session\` cookie
- [ ] Validate session with auth-gateway on dashboard load
- [ ] Sync Supabase session with auth-gateway session
- [ ] Test cross-browser/tab session persistence

### 2. Improve Feedback Messages
- [ ] Increase message display time to 5 seconds minimum
- [ ] Make messages dismissible
- [ ] Add persistent notification/toast system
- [ ] Show user-friendly success messages

### 3. Add Logout Functionality
- [ ] Add logout button to header/user menu
- [ ] Call \`/web/logout\` endpoint
- [ ] Clear all session cookies
- [ ] Redirect to login page
- [ ] Show logout confirmation

### 4. Add Password Reset
- [ ] Add \"Forgot Password\" link to login form
- [ ] Create password reset page
- [ ] Integrate with existing \`resetPassword\` function
- [ ] Add email template for reset links
- [ ] Handle reset password callback

### 5. Add Welcome Message & User Identification
- [ ] Display welcome message on dashboard load
- [ ] Show user name/email in header
- [ ] Add user avatar/profile picture
- [ ] Show authentication status indicator
- [ ] Add user profile dropdown menu

### 6. Show Auth Request Origin
- [ ] Display client name in OAuth authorize page
- [ ] Show requested scopes
- [ ] Add client info to login redirect
- [ ] Show connection confirmation after auth
- [ ] Add \"Connected Applications\" section in dashboard

---

## Acceptance Criteria

- [ ] Sessions persist across browser tabs/windows
- [ ] Success messages are visible for at least 5 seconds
- [ ] Logout button available and functional
- [ ] Password reset flow complete and working
- [ ] Welcome message shows user name/email
- [ ] Auth requests show client name and scopes
- [ ] All features work across \`.lanonasis.com\` subdomains

---

## Related Issues

- May be related to: VS Code Extension UAT issues (session management)
- Related to: OAuth2 PKCE implementation
- Related to: Session cookie implementation

---

## Environment

- **Auth Gateway:** \`auth.lanonasis.com\`
- **Dashboard:** \`dashboard.lanonasis.com\`
- **Cookie Domain:** \`.lanonasis.com\`
- **Session Duration:** 7 days

---

## Additional Context

This is a critical UX and security issue affecting all dashboard users. The lack of logout functionality is a security concern, and the session persistence issues create a poor user experience.

**Priority:** Fix session persistence and logout first, then add missing features."

echo ""
echo "✅ Dashboard authentication issue created successfully!"
echo ""
echo "View issue at: https://github.com/$REPO/issues"

