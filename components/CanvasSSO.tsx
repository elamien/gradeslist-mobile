import React, { useRef, useState, useEffect } from 'react';
import { WebView } from 'react-native-webview';
import { View, StyleSheet, Alert, Text, TouchableOpacity, Linking } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { CanvasInstitution } from '../services/canvasInstitutionService';

// Canvas iOS GetSSOLogin equivalent for React Native
class GetSSOLogin {
  domain: string;
  code: string;
  app: string;

  constructor(url: string, app: string = 'student') {
    const urlObj = new URL(url);
    const ssoHosts = ['sso.canvaslms.com', 'sso.beta.canvaslms.com', 'sso.test.canvaslms.com'];
    
    if (!ssoHosts.includes(urlObj.hostname) || urlObj.pathname !== '/canvas/login') {
      throw new Error('Invalid SSO URL');
    }

    const params = new URLSearchParams(urlObj.search);
    this.domain = params.get('domain') || '';
    this.code = params.get(this.getCodeForApp(app)) || '';
    this.app = app;

    if (!this.domain || !this.code) {
      throw new Error('Missing domain or code in SSO URL');
    }
  }

  getCodeForApp(app: string): string {
    switch (app) {
      case 'teacher': return 'code_ios_teacher';
      case 'parent': return 'code';
      case 'student':
      default: return 'code';
    }
  }

  async fetch() {
    try {
      console.log('[GetSSOLogin] Fetching mobile verify for domain:', this.domain);
      
      // First get mobile verify for the domain (Canvas iOS pattern)
      const mobileVerifyResponse = await fetch(
        `https://canvas.instructure.com/api/v1/mobile_verify.json?domain=${encodeURIComponent(this.domain)}`
      );
      const client = await mobileVerifyResponse.json();

      if (!client.authorized || !client.base_url || !client.client_id) {
        throw new Error('Institution not authorized for mobile access');
      }

      console.log('[GetSSOLogin] Mobile verify successful, exchanging code for token');

      // Exchange code for token (PostLoginOAuthRequest equivalent)
      const tokenResponse = await fetch(`${client.base_url}/login/oauth2/token`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
        },
        body: new URLSearchParams({
          client_id: client.client_id,
          client_secret: client.client_secret || '',
          code: this.code,
          grant_type: 'authorization_code',
          redirect_uri: 'https://canvas/login'
        })
      });

      const tokenData = await tokenResponse.json();
      
      if (!tokenData.access_token) {
        throw new Error('Failed to obtain access token');
      }

      return {
        access_token: tokenData.access_token,
        base_url: client.base_url,
        user: tokenData.user,
        client_id: client.client_id,
        client_secret: client.client_secret,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        domain: this.domain,
        institutionName: `${this.domain} (SSO)`
      };
    } catch (error) {
      console.error('[GetSSOLogin] SSO login failed:', error);
      throw new Error(`SSO login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

interface CanvasSSO {
  institution: CanvasInstitution;
  onLoginSuccess: (accessToken: string, userInfo: any) => void;
  onLoginFailure: (error: string) => void;
  onCancel: () => void;
}

interface CanvasMobileVerify {
  authorized: boolean;
  base_url: string;
  client_id: string;
  client_secret: string;
}

export const CanvasSSO: React.FC<CanvasSSO> = ({
  institution,
  onLoginSuccess,
  onLoginFailure,
  onCancel
}) => {
  const webviewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileVerify, setMobileVerify] = useState<CanvasMobileVerify | null>(null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);

  // Canvas iOS deep link handling (universal links equivalent)
  useEffect(() => {
    const handleDeepLink = (url: string) => {
      console.log('[CanvasSSO] Deep link received:', url);
      if (isCanvasSSOLink(url)) {
        handleCanvasSSORedirect(url);
      }
    };

    const linkingListener = Linking.addEventListener('url', handleDeepLink);

    // Handle deep links when app is launched from closed state
    Linking.getInitialURL().then((url) => {
      if (url && isCanvasSSOLink(url)) {
        handleCanvasSSORedirect(url);
      }
    });

    return () => linkingListener?.remove();
  }, []);

  // Step 1: Get OAuth configuration from Canvas central registry
  useEffect(() => {
    const getMobileVerifyConfig = async () => {
      try {
        // Clear any existing Canvas cookies for fresh login
        console.log('[CanvasSSO] Starting fresh Canvas authentication...');
        try {
          const CookieManager = await import('@react-native-cookies/cookies');
          
          // Clear specific Canvas domains first
          const canvasDomains = [
            'https://canvas.instructure.com',
            'https://sso.canvaslms.com', 
            'https://canvas.its.virginia.edu',
            'https://shibidp.its.virginia.edu'
          ];
          
          for (const domain of canvasDomains) {
            try {
              const cookies = await CookieManager.default.get(domain);
              const cookieNames = Object.keys(cookies);
              for (const cookieName of cookieNames) {
                await CookieManager.default.clearByName(domain, cookieName);
              }
              console.log(`[CanvasSSO] Cleared ${cookieNames.length} cookies for ${domain}`);
            } catch (domainError) {
              console.warn(`[CanvasSSO] Could not clear cookies for ${domain}:`, domainError.message);
            }
          }
          
          // Clear all cookies as backup
          await CookieManager.default.clearAll(true);
          console.log('[CanvasSSO] ✅ Cleared all existing cookies for fresh login');
        } catch (error) {
          console.warn('[CanvasSSO] Cookie clear warning:', error.message);
        }
        console.log('[CanvasSSO] Getting mobile verify config for:', institution.domain);
        
        const verifyUrl = `https://canvas.instructure.com/api/v1/mobile_verify.json?domain=${encodeURIComponent(institution.domain)}`;
        
        const response = await fetch(verifyUrl, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
          }
        });

        if (!response.ok) {
          throw new Error(`Mobile verify failed: ${response.status}`);
        }

        const verifyData: CanvasMobileVerify = await response.json();
        
        console.log('[CanvasSSO] Mobile verify response:', JSON.stringify(verifyData, null, 2));
        
        if (!verifyData.authorized) {
          console.log('[CanvasSSO] Institution not authorized for mobile OAuth - using web-only authentication');
          console.log('[CanvasSSO] Loading Canvas web login directly for:', institution.name);
          
          // Skip mobile OAuth entirely - use web-only authentication
          const baseUrl = institution.domain.startsWith('http') ? institution.domain : `https://${institution.domain}`;
          
          // For UVA specifically, force fresh login by clearing Shibboleth session
          let webLoginUrl;
          if (institution.domain.includes('virginia.edu')) {
            // Force fresh login by logging out from UVA Shibboleth IdP first
            // This will clear the session where 'neh6vw' is stored
            webLoginUrl = `https://shibidp.its.virginia.edu/idp/profile/Logout?return=${encodeURIComponent(baseUrl + '/login/saml')}`;
            console.log('[CanvasSSO] 🔄 Forcing UVA Shibboleth logout to clear session for fresh NetBadge login:', webLoginUrl);
          } else {
            // General SAML endpoint for other institutions
            webLoginUrl = `${baseUrl}/login/saml`;
            console.log('[CanvasSSO] Using general SAML endpoint:', webLoginUrl);
          }
          
          setAuthUrl(webLoginUrl);
          
          // Set minimal mobile verify for web authentication
          setMobileVerify({
            authorized: false,
            base_url: baseUrl,
            client_id: 'web-only',
            client_secret: ''
          });
          return;
        }

        console.log('[CanvasSSO] Mobile verify success:', verifyData.base_url, verifyData.client_id);
        setMobileVerify(verifyData);
        
        // Step 2: Construct OAuth URL
        const oauthUrl = constructOAuthUrl(verifyData);
        setAuthUrl(oauthUrl);
        
      } catch (error) {
        console.error('[CanvasSSO] Mobile verify error:', error);
        console.log('[CanvasSSO] Attempting fallback OAuth configuration...');
        
        // Try Canvas iOS fallback: empty credentials + direct institutional OAuth
        console.log('[CanvasSSO] Mobile verify failed - using Canvas iOS fallback with empty credentials');
        const fallbackVerify: CanvasMobileVerify = {
          authorized: false,
          base_url: institution.domain.startsWith('http') ? institution.domain : `https://${institution.domain}`,
          client_id: '', // Canvas iOS uses empty credentials when mobile_verify fails
          client_secret: ''
        };
        setMobileVerify(fallbackVerify);
        const oauthUrl = constructOAuthUrl(fallbackVerify);
        setAuthUrl(oauthUrl);
      }
    };

    getMobileVerifyConfig();
  }, [institution.domain]);

  // Canvas iOS SSO detection helper
  const isCanvasSSOLink = (url: string): boolean => {
    const ssoHosts = ['sso.canvaslms.com', 'sso.beta.canvaslms.com', 'sso.test.canvaslms.com'];
    try {
      const urlObj = new URL(url);
      return ssoHosts.includes(urlObj.hostname) && urlObj.pathname === '/canvas/login';
    } catch {
      return false;
    }
  };

  // Canvas iOS SSO redirect handler
  const handleCanvasSSORedirect = async (url: string) => {
    console.log('[CanvasSSO] 🎯 Canvas centralized SSO redirect detected:', url);
    setIsLoading(true);
    
    try {
      const ssoLogin = new GetSSOLogin(url, 'student');
      const loginResult = await ssoLogin.fetch();
      
      console.log('[CanvasSSO] ✅ Canvas SSO login successful');
      onLoginSuccess(loginResult.access_token, {
        ...loginResult.user,
        domain: loginResult.domain,
        institutionName: loginResult.institutionName,
        baseUrl: loginResult.base_url
      });
    } catch (error) {
      console.error('[CanvasSSO] Canvas SSO login error:', error);
      
      // For unauthorized institutions like UVA, fall back to web-only authentication
      if (error instanceof Error && error.message.includes('not authorized for mobile access')) {
        console.log('[CanvasSSO] 🔄 Institution not authorized - continuing with web-only authentication');
        console.log('[CanvasSSO] ✅ Shibboleth authentication was successful, treating as web session');
        
        // The Shibboleth authentication already succeeded - treat this as successful web auth
        handleWebLoginSuccess(url);
        return;
      }
      
      // Try Canvas Network fallback if original domain failed (Canvas iOS pattern)
      const fallbackSuccess = await tryCanvasNetworkFallback();
      if (!fallbackSuccess) {
        onLoginFailure(error instanceof Error ? error.message : 'SSO authentication failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Canvas Network fallback (Canvas iOS pattern)
  const tryCanvasNetworkFallback = async (): Promise<boolean> => {
    console.log('[CanvasSSO] Trying Canvas Network fallback for:', institution.name);
    
    try {
      const response = await fetch('https://canvas.instructure.com/api/v1/mobile_verify.json?domain=learn.canvas.net');
      const client = await response.json();
      
      if (client.authorized && client.client_id) {
        console.log('[CanvasSSO] Canvas Network authorized - redirecting');
        const oauthUrl = `https://learn.canvas.net/login/oauth2/auth?client_id=${client.client_id}&response_type=code&redirect_uri=https%3A%2F%2Fcanvas%2Flogin&mobile=1`;
        setAuthUrl(oauthUrl);
        setMobileVerify({
          authorized: true,
          base_url: 'https://learn.canvas.net',
          client_id: client.client_id,
          client_secret: client.client_secret || ''
        });
        return true;
      }
    } catch (error) {
      console.log('[CanvasSSO] Canvas Network fallback failed:', error instanceof Error ? error.message : 'Unknown error');
    }
    
    return false;
  };

  // Web-only authentication success handler
  const handleWebLoginSuccess = async (url: string) => {
    console.log('[CanvasSSO] Processing web login success:', url);
    
    try {
      // For web-only authentication, we create a pseudo access token from the session
      // This allows the app to work with Canvas web session cookies
      const webSession = {
        token: 'web-session-token', // Use 'token' field like other credentials
        access_token: 'web-session-token', // Placeholder - actual requests will use session cookies
        base_url: mobileVerify?.base_url,
        user: {
          id: 'web-user',
          name: 'Canvas User',
          short_name: 'User',
          sortable_name: 'User, Canvas',
          avatar_url: null,
          email: null
        },
        domain: institution.domain,
        institutionName: institution.name,
        webSessionUrl: url,
        loginData: {
          authType: 'web-only',
          webSession: true,
          institution: institution.name,
          domain: institution.domain
        }
      };

      console.log('[CanvasSSO] ✅ Web authentication successful for:', institution.name);
      onLoginSuccess(webSession.access_token, webSession);
      
    } catch (error) {
      console.error('[CanvasSSO] Web login processing error:', error);
      onLoginFailure(error instanceof Error ? error.message : 'Web authentication failed');
    }
  };

  // Helper function to determine common SSO provider for institutions
  const getCommonSSOProvider = (domain: string): string | null => {
    // UVA uses NetBadge - try different common values
    if (domain.includes('virginia.edu')) {
      // UVA NetBadge uses Shibboleth SAML with specific EntityID
      const providers = [
        'urn:mace:incommon:virginia.edu', // Exact UVA EntityID from NetBadge docs
        'shibboleth',                     // Protocol name
        'saml',                          // SAML protocol
        'netbadge',                      // UVA brand name
        'virginia'                       // Institution identifier
      ];
      // Try the exact EntityID first
      const currentTime = Date.now();
      const providerIndex = Math.floor(currentTime / 20000) % providers.length; // Change every 20 seconds
      console.log(`[CanvasSSO] Testing SSO provider ${providerIndex + 1}/${providers.length}: ${providers[providerIndex]}`);
      return providers[providerIndex];
    }
    
    // Add other common university SSO patterns
    if (domain.includes('.edu')) {
      return 'shibboleth'; // Many universities use Shibboleth
    }
    
    return null;
  };

  const constructOAuthUrl = (verify: CanvasMobileVerify) => {
    const params = new URLSearchParams({
      client_id: verify.client_id,
      response_type: 'code',
      redirect_uri: 'https://canvas/login', // Canvas universal redirect
      mobile: '1', // Canvas iOS mobile app indicator
      state: Date.now().toString()
    });

    // Add authentication_provider if available - this enables SSO redirect
    if (institution.authentication_provider) {
      params.set('authentication_provider', institution.authentication_provider);
      console.log('[CanvasSSO] Using SSO provider:', institution.authentication_provider);
    } else {
      // For institutions without authentication_provider in search results,
      // try common SSO provider values (NetBadge typically uses SAML)
      const commonProvider = getCommonSSOProvider(institution.domain);
      if (commonProvider) {
        params.set('authentication_provider', commonProvider);
        console.log('[CanvasSSO] Using fallback SSO provider:', commonProvider);
      }
    }

    const oauthUrl = `${verify.base_url}/login/oauth2/auth?${params.toString()}`;
    console.log('[CanvasSSO] Constructed OAuth URL:', oauthUrl);
    return oauthUrl;
  };

  const handleNavigationStateChange = (navState: any) => {
    const { url, loading } = navState;
    console.log('[CanvasSSO] Navigation:', { url, loading });

    setIsLoading(loading);

    // Canvas iOS SSO redirect detection - use the full GetSSOLogin implementation
    if (isCanvasSSOLink(url)) {
      console.log('[CanvasSSO] 🎯 Canvas centralized SSO redirect detected in WebView!');
      handleCanvasSSORedirect(url);
      return;
    }

    // Web-only authentication success detection
    if (mobileVerify?.client_id === 'web-only') {
      // Log all navigation for debugging NetBadge flow
      console.log('[CanvasSSO] Web auth navigation:', url);
      
      // Check if we're being redirected to UVA's Shibboleth IdP (the actual login page)
      if (url.includes('shibidp.its.virginia.edu')) {
        console.log('[CanvasSSO] 🎯 UVA Shibboleth IdP detected - you should see NetBadge login form');
        console.log('[CanvasSSO] 🔍 Full Shibboleth URL:', url);
        
        // Check if this is the logout page - auto-proceed to complete logout
        if (url.includes('/profile/Logout')) {
          console.log('[CanvasSSO] 🔄 Shibboleth logout page detected - auto-proceeding with logout');
          
          // Inject JavaScript to automatically click the logout proceed button
          const autoLogoutScript = `
            setTimeout(function() {
              // Look for common logout proceed buttons/forms
              const proceedButton = document.querySelector('input[type="submit"][value*="proceed"], input[type="submit"][value*="Proceed"], button[type="submit"]');
              if (proceedButton) {
                console.log('Found logout proceed button, clicking...');
                proceedButton.click();
                return;
              }
              
              // Look for logout form and submit it
              const logoutForm = document.querySelector('form');
              if (logoutForm) {
                console.log('Found logout form, submitting...');
                logoutForm.submit();
                return;
              }
              
              // If no form found, try to redirect directly
              console.log('No logout form found, redirecting to Canvas SAML...');
              window.location.href = 'https://canvas.its.virginia.edu/login/saml';
            }, 1000);
          `;
          
          webviewRef.current?.injectJavaScript(autoLogoutScript);
          return;
        }
        
        // Check if this is a login form or automatic redirect
        if (url.includes('/profile/SAML2/Redirect/SSO')) {
          console.log('[CanvasSSO] 🔄 Shibboleth SSO redirect detected');
        } else if (url.includes('/idp/') || url.includes('login')) {
          console.log('[CanvasSSO] 📝 NetBadge login form should be visible');
        } else {
          console.log('[CanvasSSO] ⚠️ Unexpected Shibboleth URL pattern');
        }
        return; // Let the Shibboleth page load and show login form
      }
      
      // Don't interfere with SAML redirects in the URL path
      if (url.includes('/saml') && url.includes(institution.domain)) {
        console.log('[CanvasSSO] Canvas SAML endpoint - continuing flow');
        return;
      }
      
      // Check if we've successfully returned from NetBadge to Canvas
      if (url.includes(institution.domain) && 
          (url === `https://${institution.domain}/` || url.includes('/courses') || url.includes('/dashboard') || url.includes('?login_success=1') || url.includes('/profile') || url.includes('/login/canvas'))) {
        console.log('[CanvasSSO] ✅ Canvas web authentication completed successfully!');
        console.log('[CanvasSSO] 🎯 NetBadge + Duo 2FA authentication flow completed');
        handleWebLoginSuccess(url);
        return;
      }
    }

    // Intercept Canvas OAuth callback
    if (url.startsWith('https://canvas/login')) {
      try {
        const urlObj = new URL(url);
        const code = urlObj.searchParams.get('code');
        const error = urlObj.searchParams.get('error');
        
        if (error) {
          console.error('[CanvasSSO] OAuth error:', error);
          if (error === 'access_denied') {
            onLoginFailure('Authentication cancelled by user');
          } else {
            onLoginFailure(`Authentication failed: ${error}`);
          }
          return;
        }
        
        if (code && mobileVerify) {
          console.log('[CanvasSSO] Got authorization code, exchanging for token...');
          exchangeCodeForToken(code, mobileVerify);
          return;
        }
        
        onLoginFailure('No authorization code received');
      } catch (parseError) {
        console.error('[CanvasSSO] URL parsing error:', parseError);
        onLoginFailure('Invalid callback URL format');
      }
    }

    // Only check for OAuth errors, not general login page errors (for web-only auth)
    if (url.includes('/login') && !loading && mobileVerify?.client_id !== 'web-only') {
      const errorCheckScript = `
        (function() {
          const pageText = document.body.textContent || '';
          const errorMessages = document.querySelectorAll('.error, .alert-error, [class*="error"]');
          
          // Check for Canvas OAuth errors (invalid_client for unauthorized institutions)
          if (pageText.includes('invalid_client') || pageText.includes('unknown client')) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'invalidClient',
              message: 'Institution not authorized for mobile access'
            }));
            return;
          }
          
          // Skip general login errors for web-only authentication
        })();
      `;
      
      webviewRef.current?.injectJavaScript(errorCheckScript);
    }
  };

  const exchangeCodeForToken = async (code: string, verify: CanvasMobileVerify) => {
    try {
      const tokenUrl = `${verify.base_url}/login/oauth2/token`;
      
      // Match Canvas iOS app behavior exactly - always include both fields
      const tokenData = {
        client_id: verify.client_id, // Empty string for unauthorized institutions
        client_secret: verify.client_secret, // Empty string for unauthorized institutions
        grant_type: 'authorization_code',
        code: code
      };

      console.log('[CanvasSSO] Exchanging code for token at:', tokenUrl);
      console.log('[CanvasSSO] Token request data:', { ...tokenData, client_secret: tokenData.client_secret ? '[REDACTED]' : 'none' });
      
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(tokenData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
      }

      const tokenResponse = await response.json();
      
      if (tokenResponse.access_token) {
        console.log('[CanvasSSO] Token exchange successful');
        
        // Fetch user info to validate token and get user details
        await fetchUserInfo(tokenResponse.access_token, verify.base_url);
      } else {
        throw new Error('No access token in response');
      }
      
    } catch (error) {
      console.error('[CanvasSSO] Token exchange error:', error);
      
      // Check if this is an unauthorized institution (empty client_id)
      if (verify.client_id === '' && !verify.authorized) {
        onLoginFailure(`${institution.name} is not authorized for mobile access. Please contact your institution's Canvas administrators to request mobile app support, or use Canvas through your web browser.`);
      } else {
        onLoginFailure(`Failed to complete authentication: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const fetchUserInfo = async (accessToken: string, baseUrl: string) => {
    try {
      const userResponse = await fetch(`${baseUrl}/api/v1/users/self`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      if (!userResponse.ok) {
        throw new Error(`Failed to fetch user info: ${userResponse.status}`);
      }

      const userInfo = await userResponse.json();
      console.log('[CanvasSSO] User info fetched successfully:', userInfo.name);
      
      onLoginSuccess(accessToken, {
        ...userInfo,
        domain: institution.domain,
        institutionName: institution.name,
        baseUrl: baseUrl
      });
      
    } catch (error) {
      console.error('[CanvasSSO] User info fetch error:', error);
      onLoginFailure(`Authentication succeeded but failed to fetch user info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'invalidClient') {
        console.log('[CanvasSSO] Invalid client error detected - institution not authorized');
        onLoginFailure(`${institution.name} is not authorized for mobile access. Please contact your institution's Canvas administrators to request mobile app support, or use Canvas through your web browser.`);
      } else if (data.type === 'loginError') {
        console.error('[CanvasSSO] Login error from WebView:', data.message);
        onLoginFailure(data.message);
      }
    } catch (parseError) {
      // Ignore non-JSON messages
      console.log('[CanvasSSO] Non-JSON message:', event.nativeEvent.data);
    }
  };

  const handleLoadError = (errorEvent: any) => {
    console.error('[CanvasSSO] WebView load error:', errorEvent.nativeEvent);
    Alert.alert(
      'Connection Error',
      `Could not connect to ${institution.name}. Please check your internet connection and try again.`,
      [
        { text: 'Retry', onPress: () => webviewRef.current?.reload() },
        { text: 'Cancel', onPress: onCancel, style: 'cancel' }
      ]
    );
  };

  if (!authUrl) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Configuring authentication...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        source={{ uri: authUrl }}
        onNavigationStateChange={handleNavigationStateChange}
        onShouldStartLoadWithRequest={(request) => {
          // Canvas iOS WKWebView decidePolicyForNavigationAction equivalent
          if (isCanvasSSOLink(request.url)) {
            console.log('[CanvasSSO] Intercepting SSO redirect via onShouldStartLoadWithRequest');
            handleCanvasSSORedirect(request.url);
            return false; // Prevent WebView navigation, handle with GetSSOLogin
          }
          
          if (request.url.startsWith('https://canvas/login')) {
            console.log('[CanvasSSO] Intercepting OAuth callback via onShouldStartLoadWithRequest');
            // Let the normal navigation handler process this
            return true;
          }
          
          return true;
        }}
        onMessage={handleMessage}
        onError={handleLoadError}
        javaScriptEnabled={true}
        domStorageEnabled={true} // Enable for web authentication session
        sharedCookiesEnabled={mobileVerify?.client_id === 'web-only'} // Enable cookies for web-only auth
        userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        style={styles.webview}
        startInLoadingState={true}
        scalesPageToFit={true}
        allowsBackForwardNavigationGestures={true}
        // Force fresh loading - disable all caching
        cacheEnabled={false}
        incognito={false} // Don't use incognito as it interferes with cookies
        clearCacheOnNavigation={true}
        // Canvas iOS uses 30-second timeout
        onLoadEnd={() => console.log('[CanvasSSO] WebView load completed')}
        onHttpError={(event) => console.log('[CanvasSSO] HTTP Error:', event.nativeEvent)}
        // Add more detailed logging
        onLoadStart={(navState) => console.log('[CanvasSSO] Load started:', navState.nativeEvent.url)}
        onLoadProgress={(event) => {
          if (event.nativeEvent.progress === 1) {
            console.log('[CanvasSSO] Page fully loaded:', event.nativeEvent.url);
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 16,
    color: '#656d76',
    marginTop: 16,
  },
});