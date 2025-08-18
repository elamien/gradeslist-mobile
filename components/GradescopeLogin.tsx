import React, { useRef, useEffect } from 'react';
import { WebView } from 'react-native-webview';
import { View, StyleSheet } from 'react-native';
import CookieManager from '@react-native-cookies/cookies';
import { verifyCookieLogin, COOKIE_LOGIN_ENABLED, FORCE_FRESH_LOGIN } from '../services/cookieGradescopeService';
import { useAppStore } from '../store/useAppStore';

// Development flag - set to true to log cookie values locally
const DEV_LOG_COOKIE_VALUES = true;

const GRADESCOPE_LOGIN_URL = 'https://www.gradescope.com/login';
const GRADESCOPE_DASHBOARD_URL = 'https://www.gradescope.com/account';

interface GradescopeLoginProps {
  onLoginSuccess: (loginData: any) => void;
  onLoginFailure: () => void;
}

export const GradescopeLogin: React.FC<GradescopeLoginProps> = ({ onLoginSuccess, onLoginFailure }) => {
  const webviewRef = useRef<WebView>(null);
  const loginAttempted = useRef(false);
  const captureInFlightRef = useRef(false);
  const { forceFreshLoginNext } = useAppStore();

  // Clear cookies and data if FORCE_FRESH_LOGIN is enabled or forceFreshLoginNext flag is set
  useEffect(() => {
    const clearDataIfNeeded = async () => {
      const shouldForceFreshLogin = FORCE_FRESH_LOGIN || forceFreshLoginNext;
      
      if (shouldForceFreshLogin) {
        if (forceFreshLoginNext) {
          console.log('[CookieLogin] domain purge complete; using persistent store');
        } else {
          console.log('[CookieLogin] FORCE_FRESH_LOGIN enabled - clearing gradescope.com data');
        }
        try {
          // Clear ALL cookies for gradescope.com (both www and root domain)
          console.log('[CookieLogin] Clearing all gradescope.com cookies...');
          await CookieManager.clearAll();
          console.log('[CookieLogin] ✓ Cleared ALL cookies');
          
          // Clear specific gradescope cookies as backup
          await CookieManager.clearByName('https://www.gradescope.com', '_gradescope_session');
          await CookieManager.clearByName('https://www.gradescope.com', 'signed_token');
          await CookieManager.clearByName('https://www.gradescope.com', 'remember_me');
          await CookieManager.clearByName('https://gradescope.com', '_gradescope_session');
          await CookieManager.clearByName('https://gradescope.com', 'signed_token');
          await CookieManager.clearByName('https://gradescope.com', 'remember_me');
          console.log('[CookieLogin] ✓ Cleared specific gradescope.com cookies');
          
          // Also clear localStorage via injected script when WebView loads
          const clearStorageScript = `
            try {
              localStorage.clear();
              sessionStorage.clear();
              console.log('Cleared localStorage and sessionStorage');
            } catch (e) {
              console.log('Error clearing storage:', e);
            }
          `;
          
          // Force logout + clear storage when WebView loads
          setTimeout(() => {
            const forceLogoutScript = `
              try {
                // Force logout by clearing all auth data
                localStorage.clear();
                sessionStorage.clear();
                document.cookie.split(";").forEach(function(c) { 
                  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
                });
                
                // Navigate to logout URL to ensure clean state
                if (window.location.pathname !== '/login') {
                  window.location.href = 'https://www.gradescope.com/logout';
                  setTimeout(() => {
                    window.location.href = 'https://www.gradescope.com/login';
                  }, 1000);
                }
                console.log('Force logout and clear completed');
              } catch (e) {
                console.log('Error during force logout:', e);
              }
            `;
            webviewRef.current?.injectJavaScript(forceLogoutScript);
          }, 1000);
          
        } catch (error) {
          console.warn('[CookieLogin] Warning: Could not clear some cookies:', error);
        }
      } else {
        console.log('[CookieLogin] Using default cookie store (FORCE_FRESH_LOGIN disabled, forceFreshLoginNext: false)');
      }
    };
    
    clearDataIfNeeded();
  }, []);

  // Helper function to build cookie header in proper order
  const buildCookieHeader = (cookies: Record<string, { value: string }>) => {
    const order = ['_gradescope_session','signed_token','remember_me','apt.sid','apt.uid','_ga'];
    const parts: string[] = [];
    for (const k of order) if (cookies[k]?.value) parts.push(`${k}=${cookies[k].value}`);
    for (const [k,v] of Object.entries(cookies)) {
      if (!order.includes(k) && v?.value) parts.push(`${k}=${v.value}`);
    }
    return parts.join('; ');
  };

  // Helper function to use cookies for verification
  const useCookiesForVerification = async (cookiesObj: Record<string, { value: string }>) => {
    console.log('[CookieLogin] ENTERING useCookiesForVerification() function');
    const header = buildCookieHeader(cookiesObj);
    const names = Object.keys(cookiesObj);
    console.log('[CookieLogin] final cookie names:', names);
    if (DEV_LOG_COOKIE_VALUES) console.log('[CookieLogin] 🚨 Debug: final cookie values:', cookiesObj);

    // Verify cookies work with production parsing code
    console.log('[CookieService] Starting cookie verification...');
    console.log('[CookieService] POST /connect/gradescope/webview-session (cookie-only)');
    const verification = await verifyCookieLogin(header);
    
    if (verification.success) {
      console.log('[CookieLogin] ✅ Cookie verification successful!');
      console.log(`[CookieLogin] Found ${verification.coursesCount} courses, ${verification.assignmentsCount} assignments`);
      console.log('[CookieLogin] ✅ Platform connected via cookie authentication');
      
      try {
        // Reset fresh login flag after successful verification
        if (forceFreshLoginNext) {
          console.log('[CookieLogin] Resetting forceFreshLoginNext flag after successful login');
          useAppStore.setState({ forceFreshLoginNext: false });
        }
        
        console.log('[CookieLogin] Calling onLoginSuccess to close modal and update UI...');
        console.log('[CookieLogin] onLoginSuccess callback type:', typeof onLoginSuccess);
        
        const loginData = { 
          loginVerified: true, 
          dashboardUrl: 'https://www.gradescope.com/account',
          cookieLogin: true,
          cookieHeader: verification.cookieHeader,
          coursesCount: verification.coursesCount,
          assignmentsCount: verification.assignmentsCount,
          courses: verification.courses
        };
        
        console.log('[CookieLogin] About to call onLoginSuccess with data:', JSON.stringify(loginData, null, 2));
        onLoginSuccess(loginData);
        console.log('[CookieLogin] onLoginSuccess call completed successfully');
        
      } catch (successError) {
        console.error('[CookieLogin] ERROR in success handling:', successError);
        console.error('[CookieLogin] Error stack:', successError.stack);
        // Still call success even if there's an error in our handling
        try {
          onLoginSuccess({ 
            loginVerified: true, 
            dashboardUrl: 'https://www.gradescope.com/account',
            cookieLogin: true,
            cookieHeader: verification.cookieHeader,
            coursesCount: verification.coursesCount,
            assignmentsCount: verification.assignmentsCount,
            courses: verification.courses
          });
        } catch (fallbackError) {
          console.error('[CookieLogin] FALLBACK onLoginSuccess also failed:', fallbackError);
        }
      }
    } else {
      console.error('[CookieLogin] ❌ Cookie verification failed:', verification.error);
      onLoginFailure();
    }
  };

  // Stabilization loop to wait for both _gradescope_session and signed_token
  const waitForCriticalCookies = async (maxAttempts = 8, delayMs = 300) => {
    let last = {};
    for (let i = 1; i <= maxAttempts; i++) {
      try {
        const all = await CookieManager.get('https://www.gradescope.com');
        last = all;
        const names = Object.keys(all);
        console.log('[CookieLogin] stabilize iteration', i, JSON.stringify(names));
        const hasSession = !!all['_gradescope_session'];
        const hasSigned = !!all['signed_token'];
        if (hasSession && hasSigned) return all;
        if (i < maxAttempts) await new Promise(resolve => setTimeout(resolve, delayMs));
      } catch (error) {
        console.warn(`[CookieLogin] Error in stabilization iteration ${i}:`, error.message);
      }
    }
    return last; // return last seen, even if incomplete (caller will decide)
  };

  // Attempt cookie capture with stabilization loop
  const attemptCookieCapture = async (currentUrl: string) => {
    console.log(`[CookieLogin] capture trigger url=${currentUrl}`);
    console.log(`[CookieLogin] nav url=/account; DOM logged-in: true`);
    
    if (!webviewRef.current) {
      console.warn('[CookieLogin] WebView ref not available');
      return;
    }

    // Wait for critical cookies to stabilize
    console.log('[CookieLogin] Starting stabilization loop...');
    const stabilizedCookies = await waitForCriticalCookies(8, 300);
    
    const names = Object.keys(stabilizedCookies);
    console.log('[CookieLogin] stabilized cookie names:', names);
    console.log('[CookieLogin] calling useCookiesForVerification(...) with stabilized cookies');
    
    const hasSession = !!stabilizedCookies['_gradescope_session'];
    const hasSigned = !!stabilizedCookies['signed_token'];
    
    if (!hasSession || !hasSigned) {
      console.warn('[CookieLogin] Critical cookie(s) missing after stabilization. Reloading once and retrying...');
      webviewRef.current?.injectJavaScript(`window.location.href='https://www.gradescope.com/'; true;`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      const retried = await waitForCriticalCookies(4, 500);
      // Prefer retried only if it improves:
      const pick = (!!retried['_gradescope_session'] && !!retried['signed_token']) ? retried : stabilizedCookies;
      console.log('[CookieLogin] calling useCookiesForVerification(...) with retry cookies');
      await useCookiesForVerification(pick);
      return;
    }
    await useCookiesForVerification(stabilizedCookies);
  };

  // Single-run guard for account DOM logged-in detection
  async function onAccountDomLoggedIn() {
    if (captureInFlightRef.current) return;
    captureInFlightRef.current = true;
    console.log('[CookieLogin] starting attemptCookieCapture()');
    try {
      await attemptCookieCapture('https://www.gradescope.com/account');  // must be awaited!
    } finally {
      captureInFlightRef.current = false;
    }
  }

  const handleNavigationStateChange = (navState: any) => {
    const { url, loading } = navState;
    
    console.log('Navigation state changed:', { url, loading });

    // Check if we're already logged in and on the dashboard
    if (url.startsWith(GRADESCOPE_DASHBOARD_URL) && !loading && !loginAttempted.current) {
      console.log('User reached dashboard, checking login status');
      loginAttempted.current = true;
      
      if (COOKIE_LOGIN_ENABLED) {
        // Use setTimeout to ensure DOM is fully loaded and avoid race conditions
        console.log('[CookieLogin] Scheduling cookie capture after DOM stabilization...');
        setTimeout(() => {
          onAccountDomLoggedIn();
        }, 500); // 500ms debounce to ensure page is fully loaded
      } else {
        // ORIGINAL: Traditional login check
        const script = `
          (function() {
            // More comprehensive check for login status
            const selectors = [
              '[data-react-class="AccountShow"]',
              '.account-nav',
              '.user-menu',
              '.navbar .dropdown',
              '[class*="user"]',
              '[class*="account"]',
              '.nav-item',
              'button[class*="user"]',
              'a[href*="logout"]',
              'a[href*="/account"]',
              '.header .dropdown',
              '.navigation .user'
            ];
            
            let foundElement = false;
            for (const selector of selectors) {
              if (document.querySelector(selector)) {
                foundElement = true;
                break;
              }
            }
            
            // Also check for common logged-in page indicators
            const pageText = document.body.textContent || document.body.innerText || '';
            const hasLoggedInText = pageText.includes('Account') ||
                                  pageText.includes('Dashboard') ||
                                  pageText.includes('Courses') ||
                                  pageText.includes('Profile') ||
                                  pageText.includes('Settings');
            
            // Check if we're on the account page and it's not showing a login form
            const onAccountPage = window.location.pathname === '/account';
            const hasLoginForm = document.querySelector('input[type="password"]') !== null ||
                                pageText.includes('Log In') ||
                                pageText.includes('Sign In');
            
            const isLoggedIn = foundElement || 
                             (hasLoggedInText && !hasLoginForm) || 
                             (onAccountPage && !hasLoginForm);
            
            // Debug info
            console.log('Login check debug:', {
              foundElement,
              hasLoggedInText,
              onAccountPage,
              hasLoginForm,
              isLoggedIn,
              url: window.location.href,
              pageTextSample: pageText.substring(0, 200)
            });
            
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'loginCheck',
              isLoggedIn: isLoggedIn,
              url: window.location.href,
              debug: {
                foundElement,
                hasLoggedInText,
                onAccountPage,
                hasLoginForm
              }
            }));
          })();
        `;
        
        webviewRef.current?.injectJavaScript(script);
      }
    }
    
    // Check if we're on the login page but get a "must be logged out" message
    if (url.includes('/login') && !loading) {
      console.log('On login page, checking if already logged in');
      
      // Check if the page says we must be logged out (meaning we're already logged in)
      const checkAlreadyLoggedInScript = `
        (function() {
          const pageText = document.body.textContent || document.body.innerText || '';
          const mustBeLoggedOut = pageText.includes('must be logged out') || 
                                pageText.includes('already logged in') ||
                                pageText.includes('log out first');
          
          if (mustBeLoggedOut) {
            // Navigate to dashboard since we're already logged in
            window.location.href = '${GRADESCOPE_DASHBOARD_URL}';
          }
        })();
      `;
      
      webviewRef.current?.injectJavaScript(checkAlreadyLoggedInScript);
    }
    
    // If we're redirected to the home page (/) it usually means we're logged in
    if (url === 'https://www.gradescope.com/' && !loading && !loginAttempted.current) {
      console.log('Redirected to home page, assuming logged in - navigating to dashboard');
      webviewRef.current?.injectJavaScript(`window.location.href = '${GRADESCOPE_DASHBOARD_URL}';`);
    }
  };

  const handleMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('Received data from WebView:', data);

      // Cookie login is now handled directly in attemptCookieCapture, so we can skip this
      if (COOKIE_LOGIN_ENABLED && data.type === 'nativeCookieLogin') {
        // This is handled in attemptCookieCapture now - just ignore
        return;
      } else if (COOKIE_LOGIN_ENABLED && data.type === 'cookieLoginError') {
        console.error('[CookieLogin] Error during cookie extraction:', data.error);
        onLoginFailure();

      } else if (data.type === 'loginCheck') {
        // ORIGINAL: Traditional login check
        console.log('Login check result:', data);
        if (data.debug) {
          console.log('Login check debug info:', data.debug);
        }
        
        if (data.isLoggedIn) {
          console.log('Login verification successful');
          onLoginSuccess({ loginVerified: true, dashboardUrl: data.url });
        } else {
          console.warn('Login verification failed - user not detected as logged in');
          onLoginFailure();
        }
      }
    } catch (error) {
      // Fallback for non-JSON messages
      console.log('Received non-JSON message:', event.nativeEvent.data);
      onLoginFailure();
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        source={{ uri: GRADESCOPE_LOGIN_URL }}
        onNavigationStateChange={handleNavigationStateChange}
        onMessage={handleMessage}
        incognito={false} // Always use persistent store - domain data cleared manually
        javaScriptEnabled={true}
        domStorageEnabled={true}
        sharedCookiesEnabled={true} // Always enable shared cookies for CookieManager access
        thirdPartyCookiesEnabled={true} // Enable third-party cookies for full compatibility
        userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" // Safari-like UA for backend verification
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
