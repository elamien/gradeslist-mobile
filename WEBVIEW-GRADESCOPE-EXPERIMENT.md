# WebView Gradescope Auth Experiment

## Branch Access Strategy
**Problem**: How to document across branches?
- **Main branch**: Permanent docs, but can't edit during experiment
- **Experiment branch**: Can edit live, but lost if branch deleted

**Solution**: Hybrid approach
1. Create initial doc in main (this file)
2. Copy to experiment branch for live editing
3. Copy final results back to main

## Current Authentication Analysis

### How Gradescope Auth Works Now
**From code analysis (`integrations/gradescope/client.ts`, `app/(tabs)/profile.tsx`, `store/useAppStore.ts`):**

1. **User enters credentials once** in Profile screen
2. **Credentials stored** in `expo-secure-store` 
3. **Every API call** sends username/password to Vercel serverless functions
4. **Server-side scraping** happens on each request:
   - Login to get session cookies
   - Make authenticated request
   - Return scraped data
5. **No persistent session** - credentials required every time

### Security Issues with Current Approach
- 🚨 **Credentials sent on every request** (network exposure)
- 🚨 **Server-side password handling** (logs, memory)
- 🚨 **No session reuse** (inefficient, suspicious to Gradescope)

## WebView Authentication Experiment

### Motivation
**Current**: Password sent on every API call to server
**Goal**: Session-based auth via WebView (more secure, more efficient)

### Hypothesis
1. **WebView shows Gradescope login** (user types directly into Gradescope)
2. **Extract session cookies** after successful login
3. **Use cookies for API calls** instead of username/password
4. **Store cookies securely** for reuse

### Expected Technical Challenges

#### 1. Cookie Extraction from WebView
- **React Native WebView** → native app boundary
- **Security restrictions** on cookie access
- **Possible solutions**: `react-native-webview` with `onNavigationStateChange`

#### 2. Cross-Domain Security
- **Gradescope CORS policies** may block mobile requests
- **Cookie security flags** (`httpOnly`, `secure`, `sameSite`)
- **Possible solutions**: Proxy through our Vercel functions

#### 3. Session Persistence
- **Cookie expiration** handling
- **Refresh token** mechanism (if exists)
- **Logout/revocation** handling

#### 4. React Native Environment Limitations
- **No Node.js modules** (cheerio issues we've seen)
- **Limited cookie handling** compared to browser
- **WebView isolation** from main app context

### Previous Attempts Context
Per user: "im pretty sure you (claude) in the past have tried other methods, stuff like a websheet of the gradescope site comes up, and you log in there (which is secure) but then like cookie not cookie toke not token and like how do you pull that down from the websheet into the actual app"

**Historical challenges**:
- Cookie extraction difficulties
- Token vs cookie confusion
- WebView ↔ React Native data flow

### Experiment Plan

#### Phase 1: Basic WebView Integration
1. **Create simple WebView** pointing to Gradescope login
2. **Test login flow** (can user log in successfully?)
3. **Inspect available data** after login

#### Phase 2: Cookie/Session Extraction
1. **Attempt cookie extraction** via WebView events
2. **Test different extraction methods**:
   - `onNavigationStateChange`
   - `injectedJavaScript`
   - `onMessage` bridge
3. **Document what data is accessible**

#### Phase 3: API Integration
1. **Test extracted cookies** with Gradescope API endpoints
2. **Compare with current username/password approach**
3. **Measure session longevity**

#### Phase 4: Error Handling & Edge Cases
1. **Session expiration** handling
2. **Login failure** scenarios  
3. **Cookie refresh** mechanisms

### Success Criteria
✅ **Functional**: User can log in via WebView and access Gradescope data
✅ **Secure**: No passwords stored/transmitted after initial login
✅ **Efficient**: Session reuse reduces API calls
✅ **Maintainable**: Clear error handling and refresh logic

### Failure Criteria (Documentation Goals)
Even if experiment fails, document:
- **Specific technical blockers** encountered
- **Gradescope security measures** that prevent approach
- **React Native limitations** discovered
- **Alternative approaches** to consider

### Why This Experiment Matters
**Current approach is not scalable**:
- Password in every request = security risk
- Server-side scraping = rate limiting concerns  
- No session reuse = inefficient

**Even if WebView fails**, we'll understand:
- What Gradescope allows/blocks
- Technical constraints for future approaches
- Whether to invest in alternative auth methods

## Experiment Log
*[To be filled during experiment phase]*

### Branch: `experiment/webview-gradescope-auth`
- Created: [Date]
- Status: Planning

### Technical Findings
*[Live updates during experiment]*

### Code Changes Made
*[Track experiment implementations]*

### Blockers Encountered  
*[Document failed attempts and reasons]*

## Final Recommendation
*[TBD based on experiment results]*

### If Successful
- Implementation roadmap
- Security considerations
- Migration strategy from current approach

### If Failed
- Technical reasons for failure
- Alternative approaches to pursue
- Lessons learned for future auth improvements

---

**Next Steps**: Create experiment branch and begin Phase 1 implementation.
