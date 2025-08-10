import React, { useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface GradescopeWebViewAuthProps {
  onAuthSuccess?: (cookies: string, sessionData?: any) => void;
  onAuthFailure?: (error: string) => void;
  onClose?: () => void;
}

export default function GradescopeWebViewAuth({ 
  onAuthSuccess, 
  onAuthFailure, 
  onClose: _onClose 
}: GradescopeWebViewAuthProps) {
  const [currentUrl, setCurrentUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [authCompleted, setAuthCompleted] = useState(false);
  const webViewRef = useRef<WebView>(null);

  // Gradescope login URL
  const GRADESCOPE_LOGIN_URL = 'https://www.gradescope.com/login';

  const handleNavigationStateChange = (navState: any) => {
    console.log('[WEBVIEW] Navigation:', {
      url: navState.url,
      loading: navState.loading,
      canGoBack: navState.canGoBack,
      canGoForward: navState.canGoForward,
      title: navState.title,
      timestamp: new Date().toISOString()
    });

    setCurrentUrl(navState.url);
    setIsLoading(navState.loading);

    // Check if we've reached the dashboard (successful login) and haven't completed auth yet
    if ((navState.url.includes('/courses') || navState.url.includes('/dashboard')) && !authCompleted) {
      console.log('[SUCCESS] Detected successful login - URL contains courses/dashboard');
      
      // Mark auth as completed to prevent duplicate triggers
      setAuthCompleted(true);
      
      // Try to extract cookies and session data immediately
      setTimeout(() => {
        extractAuthData();
      }, 1000); // Wait 1 second for page to fully load
    }
  };

  const handleLoadStart = () => {
    console.log('[WEBVIEW] Page load started at:', new Date().toISOString());
  };

  const handleLoad = () => {
    console.log('[WEBVIEW] Page loaded successfully at:', new Date().toISOString());
    
    // Inject JavaScript to gather information
    const jsCode = `
      console.log('[WEBVIEW-JS] Current URL:', window.location.href);
      console.log('[WEBVIEW-JS] Page title:', document.title);
      console.log('[WEBVIEW-JS] Cookies available:', !!document.cookie);
      console.log('[WEBVIEW-JS] Cookie length:', document.cookie.length);
      
      // Don't log full cookies for security, just check if they exist
      const cookieExists = document.cookie.length > 0;
      console.log('[WEBVIEW-JS] Has cookies:', cookieExists);
      
      // Check for auth forms
      const authForms = document.querySelectorAll('form[action*="login"], form[action*="auth"], form[action*="session"]');
      console.log('[WEBVIEW-JS] Auth forms found:', authForms.length);
      
      // Look for success indicators
      const successIndicators = document.querySelectorAll('[class*="dashboard"], [class*="courses"], [href*="courses"]');
      console.log('[WEBVIEW-JS] Success indicators found:', successIndicators.length);
      
      // Check for gradescope-specific elements
      const gradescopeElements = document.querySelectorAll('[class*="gradescope"], [id*="gradescope"]');
      console.log('[WEBVIEW-JS] Gradescope elements found:', gradescopeElements.length);
      
      true; // Always return something
    `;

    webViewRef.current?.injectJavaScript(jsCode);
  };

  const handleError = (error: any) => {
    console.log('[ERROR] WebView error:', {
      description: error?.nativeEvent?.description,
      code: error?.nativeEvent?.code,
      url: error?.nativeEvent?.url,
      timestamp: new Date().toISOString()
    });
    
    onAuthFailure?.(`WebView error: ${error?.nativeEvent?.description || 'Unknown error'}`);
  };

  const handleHttpError = (error: any) => {
    console.log('[ERROR] HTTP error:', {
      statusCode: error?.nativeEvent?.statusCode,
      url: error?.nativeEvent?.url,
      description: error?.nativeEvent?.description,
      timestamp: new Date().toISOString()
    });
  };

  const handleMessage = (event: any) => {
    console.log('[WEBVIEW-BRIDGE] Message received:', event.nativeEvent.data);
    
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('[WEBVIEW-BRIDGE] Parsed data:', data);
      
      // Handle structured data from injected JavaScript
      if (data.type === 'AUTH_SUCCESS') {
        console.log('[SUCCESS] Auth success message received from WebView');
        onAuthSuccess?.(data.cookies, data.sessionData);
      } else if (data.type === 'AUTH_DATA_EXTRACTED') {
        console.log('[SUCCESS] Cookie extraction successful!');
        console.log('[API-TEST] Cookie count:', data.cookieCount);
        console.log('[API-TEST] Cookie preview:', data.cookiesPreview);
        console.log('[API-TEST] Session tokens found:', Object.keys(data.sessionTokens?.localStorage || {}).length);
        
        // Use production WebView auth service
        handleAuthSuccess(data);
      }
    } catch (_e) {
      console.log('[WEBVIEW-BRIDGE] Raw message (not JSON):', event.nativeEvent.data);
    }
  };

  const handleAuthSuccess = async (authData: any) => {
    console.log('[WebViewAuth] Processing authentication success...');
    
    try {
      // Import the production service
      const { GradescopeWebViewAuthService } = await import('../services/gradescopeWebViewAuthService');
      
      console.log('[WebViewAuth] Parsing session data...');
      console.log('[WebViewAuth] Cookie count:', authData.cookieCount);
      console.log('[WebViewAuth] Cookie preview:', authData.cookiesPreview);
      
      // Parse and validate the session data
      const result = GradescopeWebViewAuthService.parseWebViewAuthData(authData);
      
      if (result.success && result.sessionData) {
        console.log('[WebViewAuth] Session data parsed successfully');
        console.log('[WebViewAuth] User ID:', result.sessionData.userId);
        console.log('[WebViewAuth] Expires at:', result.sessionData.expiresAt);
        
        // Trigger success callback with the parsed session data
        onAuthSuccess?.(result.sessionData.sessionCookies, result.sessionData);
      } else {
        console.error('[WebViewAuth] Failed to parse session data:', result.error);
        onAuthFailure?.(result.error || 'Failed to parse session data');
      }
      
    } catch (error) {
      console.error('[WebViewAuth] Authentication processing failed:', error);
      onAuthFailure?.(`Authentication failed: ${error}`);
    }
  };

  const extractAuthData = () => {
    console.log('[API-TEST] Attempting to extract authentication data...');
    
    const extractionScript = `
      // Extract cookies safely (use var to avoid duplicate declaration errors)
      var cookies = document.cookie;
      
      // Look for session tokens in various places
      var sessionTokens = {
        cookies: cookies,
        localStorage: {},
        sessionStorage: {}
      };
      
      // Safely check localStorage
      try {
        const lsKeys = Object.keys(localStorage);
        console.log('[WEBVIEW-JS] LocalStorage keys found:', lsKeys.length);
        lsKeys.forEach(key => {
          if (key.toLowerCase().includes('token') || 
              key.toLowerCase().includes('session') || 
              key.toLowerCase().includes('auth')) {
            sessionTokens.localStorage[key] = localStorage.getItem(key);
          }
        });
      } catch (e) {
        console.log('[WEBVIEW-JS] LocalStorage access denied');
      }
      
      // Safely check sessionStorage
      try {
        const ssKeys = Object.keys(sessionStorage);
        console.log('[WEBVIEW-JS] SessionStorage keys found:', ssKeys.length);
        ssKeys.forEach(key => {
          if (key.toLowerCase().includes('token') || 
              key.toLowerCase().includes('session') || 
              key.toLowerCase().includes('auth')) {
            sessionTokens.sessionStorage[key] = sessionStorage.getItem(key);
          }
        });
      } catch (e) {
        console.log('[WEBVIEW-JS] SessionStorage access denied');
      }
      
      // Send data back to React Native with actual cookie data for testing
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'AUTH_DATA_EXTRACTED',
        url: window.location.href,
        title: document.title,
        hasAuthData: cookies.length > 0 || Object.keys(sessionTokens.localStorage).length > 0,
        cookieCount: cookies.length,
        cookiesPreview: cookies.substring(0, 100) + '...', // Safe preview
        sessionTokens: sessionTokens,
        timestamp: new Date().toISOString()
      }));
      
      true;
    `;

    webViewRef.current?.injectJavaScript(extractionScript);
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText style={styles.headerText}>
          Gradescope Login
        </ThemedText>
        <ThemedText style={styles.urlText} numberOfLines={1}>
          {currentUrl || 'Loading...'}
        </ThemedText>
        {isLoading && (
          <ThemedText style={styles.loadingText}>
            Loading...
          </ThemedText>
        )}
      </ThemedView>
      
      <WebView
        ref={webViewRef}
        source={{ uri: GRADESCOPE_LOGIN_URL }}
        style={styles.webview}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadStart={handleLoadStart}
        onLoad={handleLoad}
        onError={handleError}
        onHttpError={handleHttpError}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        // Security settings
        mixedContentMode="compatibility"
        allowsFullscreenVideo={false}
        allowsBackForwardNavigationGestures={true}
        // User agent to appear more like a real browser
        userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1"
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#f8f9fa',
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  urlText: {
    fontSize: 12,
    opacity: 0.7,
    fontFamily: 'monospace',
  },
  loadingText: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
  },
  webview: {
    flex: 1,
  },
});
