import React, { useRef, useEffect } from 'react';
import { WebView } from 'react-native-webview';
import { View, StyleSheet } from 'react-native';
import CookieManager from '@react-native-cookies/cookies';
import { verifyCookieLogin, COOKIE_LOGIN_ENABLED, FORCE_FRESH_LOGIN } from '../services/cookieGradescopeService';

const GRADESCOPE_LOGIN_URL = 'https://www.gradescope.com/login';
const GRADESCOPE_DASHBOARD_URL = 'https://www.gradescope.com/account';

interface GradescopeLoginProps {
  onLoginSuccess: (loginData: any) => void;
  onLoginFailure: () => void;
}

export const GradescopeLogin: React.FC<GradescopeLoginProps> = ({ onLoginSuccess, onLoginFailure }) => {
  const webviewRef = useRef<WebView>(null);
  const loginAttempted = useRef(false);

  // Clear cookies and data if FORCE_FRESH_LOGIN is enabled
  useEffect(() => {
    const clearDataIfNeeded = async () => {
      if (FORCE_FRESH_LOGIN) {
        console.log('[CookieLogin] FORCE_FRESH_LOGIN enabled - clearing gradescope.com data');
        try {
          // Clear all cookies for gradescope.com
          await CookieManager.clearByName('https://www.gradescope.com', '_gradescope_session');
          await CookieManager.clearByName('https://www.gradescope.com', 'signed_token');
          await CookieManager.clearByName('https://www.gradescope.com', 'remember_me');
          await CookieManager.clearByName('https://www.gradescope.com', '_ga');
          await CookieManager.clearByName('https://www.gradescope.com', 'apt.uid');
          console.log('[CookieLogin] ✓ Cleared gradescope.com cookies');
          
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
          
          // We'll inject this when the WebView loads
          setTimeout(() => {
            webviewRef.current?.injectJavaScript(clearStorageScript);
          }, 1000);
          
        } catch (error) {
          console.warn('[CookieLogin] Warning: Could not clear some cookies:', error);
        }
      } else {
        console.log('[CookieLogin] Using default cookie store (FORCE_FRESH_LOGIN disabled)');
      }
    };
    
    clearDataIfNeeded();
  }, []);

  // Attempt cookie capture with proper timing and native cookie access
  const attemptCookieCapture = async (currentUrl: string) => {
    console.log(`[CookieLogin] capture trigger url=${currentUrl}`);
    
    if (!webviewRef.current) {
      console.warn('[CookieLogin] WebView ref not available');
      return;
    }

    // First, ensure we can access native cookies BEFORE checking DOM
    console.log('[CookieLogin] 📥 Checking native cookies before DOM verification...');
    try {
      const allCookies = await CookieManager.get('https://www.gradescope.com');
      const cookieNames = Object.keys(allCookies);
      console.log('[CookieLogin] native cookie names:', cookieNames);
      console.log('[CookieLogin] 🚨 Debug: native cookie dump:', allCookies); // Debug values
      
      // Check if we have critical session cookies
      const hasSessionCookie = cookieNames.includes('_gradescope_session');
      const hasSignedToken = cookieNames.includes('signed_token');
      
      if (!hasSessionCookie) {
        console.warn('[CookieLogin] ⚠️  No _gradescope_session in native cookies - login may not be complete');
        if (!FORCE_FRESH_LOGIN) {
          console.log('[CookieLogin] 💡 Consider setting FORCE_FRESH_LOGIN=true');
        }
      }
      
    } catch (error) {
      console.error('[CookieLogin] ❌ Native cookie check failed:', error);
    }

    // Now check DOM state with current URL context
    const loginCheckScript = `
      (function() {
        try {
          // Wait for DOM to be fully ready
          if (document.readyState !== 'complete') {
            setTimeout(arguments.callee, 100);
            return;
          }
          
          const pageText = document.body.textContent || document.body.innerText || '';
          const hasLoginForm = document.querySelector('input[type="password"]') !== null ||
                              pageText.includes('Log In') ||
                              pageText.includes('Sign In');
          const onAccountPage = window.location.pathname === '/account';
          const actualUrl = window.location.href;
          const isLoggedIn = !hasLoginForm && onAccountPage;
          
          console.log('[CookieLogin] DOM check:', {
            onAccountPage,
            hasLoginForm,
            isLoggedIn,
            actualUrl,
            currentUrl: "${currentUrl}",
            readyState: document.readyState
          });
          
          // Use the CURRENT navigation URL, not the potentially stale window.location
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'nativeCookieLogin',
            isLoggedIn: isLoggedIn,
            url: "${currentUrl}", // Use the navState URL for consistency
            domUrl: actualUrl,    // Include actual DOM URL for debugging
            hasLoginForm: hasLoginForm,
            onAccountPage: onAccountPage
          }));
        } catch (error) {
          console.error('[CookieLogin] DOM check error:', error);
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'cookieLoginError',
            error: error.message
          }));
        }
      })();
    `;

    webviewRef.current.injectJavaScript(loginCheckScript);
  };

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
          attemptCookieCapture(url);
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

      if (COOKIE_LOGIN_ENABLED && data.type === 'nativeCookieLogin') {
        console.log('[CookieLogin] Processing native cookie login...');
        console.log('[CookieLogin] DOM state:', { 
          isLoggedIn: data.isLoggedIn, 
          url: data.url,
          domUrl: data.domUrl,
          onAccountPage: data.onAccountPage,
          hasLoginForm: data.hasLoginForm
        });
        
        if (!data.isLoggedIn) {
          console.warn('[CookieLogin] WebView indicates not logged in');
          console.log('[CookieLogin] 🔍 Debug details:', {
            navUrl: data.url,
            actualDomUrl: data.domUrl,
            onAccountPage: data.onAccountPage,
            hasLoginForm: data.hasLoginForm
          });
          
          // Diagnostic: If we landed on /account without login but no session cookies, suggest fresh login
          if (data.url.includes('/account') || (data.domUrl && data.domUrl.includes('/account'))) {
            console.log('[CookieLogin] 🔍 Diagnostic: On /account page but DOM indicates not authenticated');
            if (!FORCE_FRESH_LOGIN) {
              console.log('[CookieLogin] 💡 Suggestion: Enable FORCE_FRESH_LOGIN to clear existing cookies');
            }
          }
          
          onLoginFailure();
          return;
        }

        // DOM confirms we're logged in - now extract cookies natively (including HttpOnly cookies)
        console.log('[CookieLogin] ✅ DOM confirms login - extracting native cookies...');
        try {
          const nativeCookies = await CookieManager.get('https://www.gradescope.com');
          
          // Log cookie names for debugging (never values)
          const cookieNames = Object.keys(nativeCookies);
          console.log('[CookieLogin] Final cookie names found:', cookieNames);
          
          // Check if we have the critical session cookies
          const hasSessionCookie = cookieNames.includes('_gradescope_session');
          const hasSignedToken = cookieNames.includes('signed_token');
          
          if (!hasSessionCookie) {
            console.error('[CookieLogin] ❌ CRITICAL: Missing _gradescope_session cookie even though DOM shows logged in');
            console.log('[CookieLogin] This indicates WebView and CookieManager are using different stores');
            if (!FORCE_FRESH_LOGIN) {
              console.log('[CookieLogin] 💡 Try: Enable FORCE_FRESH_LOGIN=true to force fresh login');
            }
            onLoginFailure();
            return;
          }
          
          if (!hasSignedToken) {
            console.warn('[CookieLogin] ⚠️  Missing signed_token cookie (may still work)');
          }
          
          // Build cookie header string from native cookies
          const cookieHeader = Object.entries(nativeCookies)
            .map(([name, cookie]) => `${name}=${cookie.value}`)
            .join('; ');
          
          console.log('[CookieLogin] ✅ Native cookie extraction successful');
          console.log(`[CookieLogin] Found ${cookieNames.length} cookies including critical session cookies`);

          // Verify cookies work with production parsing code
          console.log('[CookieLogin] Verifying cookies with production API...');
          const verification = await verifyCookieLogin(cookieHeader);
          
          if (verification.success) {
            console.log('[CookieLogin] ✅ Cookie verification successful!');
            console.log(`[CookieLogin] Found ${verification.coursesCount} courses, ${verification.assignmentsCount} assignments`);
            
            onLoginSuccess({ 
              loginVerified: true, 
              dashboardUrl: data.url,
              cookieLogin: true,
              cookieHeader: verification.cookieHeader,
              coursesCount: verification.coursesCount,
              assignmentsCount: verification.assignmentsCount,
              courses: verification.courses
            });
          } else {
            console.error('[CookieLogin] ❌ Cookie verification failed:', verification.error);
            onLoginFailure();
          }
          
        } catch (error) {
          console.error('[CookieLogin] ❌ Native cookie extraction failed:', error);
          onLoginFailure();
        }

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
        incognito={false} // Always use persistent store for debugging (CookieManager compatibility)
        javaScriptEnabled={true}
        domStorageEnabled={true}
        sharedCookiesEnabled={true} // Always enable shared cookies for CookieManager access
        thirdPartyCookiesEnabled={true} // Enable third-party cookies for full compatibility
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
