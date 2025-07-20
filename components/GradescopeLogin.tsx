import React, { useRef } from 'react';
import { WebView } from 'react-native-webview';
import { View, StyleSheet } from 'react-native';

const GRADESCOPE_LOGIN_URL = 'https://www.gradescope.com/login';
const GRADESCOPE_DASHBOARD_URL = 'https://www.gradescope.com/account';

interface GradescopeLoginProps {
  onLoginSuccess: (loginData: any) => void;
  onLoginFailure: () => void;
}

export const GradescopeLogin: React.FC<GradescopeLoginProps> = ({ onLoginSuccess, onLoginFailure }) => {
  const webviewRef = useRef<WebView>(null);
  const loginAttempted = useRef(false);

  const handleNavigationStateChange = (navState: any) => {
    const { url, loading } = navState;
    
    console.log('Navigation state changed:', { url, loading });

    // Check if we're already logged in and on the dashboard
    if (url.startsWith(GRADESCOPE_DASHBOARD_URL) && !loading && !loginAttempted.current) {
      console.log('User reached dashboard, checking login status');
      loginAttempted.current = true;
      
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

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('Received data from WebView:', data);

      if (data.type === 'loginCheck') {
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
        incognito={false} // Keep session for later proxy usage
        javaScriptEnabled={true}
        domStorageEnabled={true}
        sharedCookiesEnabled={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
