import * as SecureStore from 'expo-secure-store';

export interface GradescopeSessionData {
  sessionCookies: string;
  userId?: string;
  extractedAt: Date;
  expiresAt?: Date;
  pageTitle?: string;
  currentUrl?: string;
}

export interface WebViewAuthResult {
  success: boolean;
  sessionData?: GradescopeSessionData;
  error?: string;
}

export class GradescopeWebViewAuthService {
  private static readonly STORAGE_KEY = 'gradescope_webview_session';
  private static readonly SESSION_DURATION_HOURS = 24; // Default session duration

  /**
   * Store extracted session data securely
   */
  static async storeSessionData(sessionData: GradescopeSessionData): Promise<void> {
    try {
      const dataToStore = {
        ...sessionData,
        extractedAt: sessionData.extractedAt.toISOString(),
        expiresAt: sessionData.expiresAt?.toISOString(),
      };
      
      await SecureStore.setItemAsync(
        this.STORAGE_KEY, 
        JSON.stringify(dataToStore)
      );
      
      console.log('[WebViewAuth] Session data stored securely');
    } catch (error) {
      console.error('[WebViewAuth] Failed to store session data:', error);
      throw new Error('Failed to store session data');
    }
  }

  /**
   * Retrieve stored session data
   */
  static async getStoredSessionData(): Promise<GradescopeSessionData | null> {
    try {
      const storedData = await SecureStore.getItemAsync(this.STORAGE_KEY);
      if (!storedData) {
        return null;
      }

      const parsed = JSON.parse(storedData);
      return {
        ...parsed,
        extractedAt: new Date(parsed.extractedAt),
        expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : undefined,
      };
    } catch (error) {
      console.error('[WebViewAuth] Failed to retrieve session data:', error);
      return null;
    }
  }

  /**
   * Check if stored session is still valid
   */
  static async isSessionValid(): Promise<boolean> {
    try {
      const sessionData = await this.getStoredSessionData();
      if (!sessionData) {
        return false;
      }

      // Check if session has expired
      if (sessionData.expiresAt && new Date() > sessionData.expiresAt) {
        console.log('[WebViewAuth] Session expired, clearing stored data');
        await this.clearStoredSession();
        return false;
      }

      // Check if session is older than default duration
      const hoursOld = (Date.now() - sessionData.extractedAt.getTime()) / (1000 * 60 * 60);
      if (hoursOld > this.SESSION_DURATION_HOURS) {
        console.log('[WebViewAuth] Session too old, clearing stored data');
        await this.clearStoredSession();
        return false;
      }

      return true;
    } catch (error) {
      console.error('[WebViewAuth] Error checking session validity:', error);
      return false;
    }
  }

  /**
   * Clear stored session data
   */
  static async clearStoredSession(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(this.STORAGE_KEY);
      console.log('[WebViewAuth] Session data cleared');
    } catch (error) {
      console.error('[WebViewAuth] Failed to clear session data:', error);
    }
  }

  /**
   * Parse extracted auth data from WebView
   */
  static parseWebViewAuthData(rawData: any): WebViewAuthResult {
    try {
      // Handle different data structures from WebView
      let sessionCookies: string;
      
      if (rawData.sessionTokens?.cookies) {
        // From WebView bridge data
        sessionCookies = rawData.sessionTokens.cookies;
      } else if (rawData.sessionCookies) {
        // From direct session data object
        sessionCookies = rawData.sessionCookies;
      } else {
        console.error('[WebViewAuth] No session cookies found. Available keys:', Object.keys(rawData));
        return {
          success: false,
          error: 'No session cookies found in WebView data'
        };
      }

      if (!sessionCookies || sessionCookies.length === 0) {
        return {
          success: false,
          error: 'Session cookies are empty'
        };
      }

      const sessionData: GradescopeSessionData = {
        sessionCookies: sessionCookies,
        extractedAt: new Date(),
        expiresAt: this.calculateExpiration(),
        pageTitle: rawData.title || rawData.pageTitle,
        currentUrl: rawData.url || rawData.currentUrl,
      };

      // Extract user ID from apt.uid cookie if available
      const uidMatch = sessionCookies.match(/apt\.uid=([^;]+)/);
      if (uidMatch) {
        sessionData.userId = uidMatch[1];
      }

      return {
        success: true,
        sessionData
      };
    } catch (error) {
      console.error('[WebViewAuth] Error parsing WebView auth data:', error);
      return {
        success: false,
        error: `Failed to parse auth data: ${error}`
      };
    }
  }

  /**
   * Calculate session expiration time
   */
  private static calculateExpiration(): Date {
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + this.SESSION_DURATION_HOURS);
    return expiration;
  }

  /**
   * Validate session cookies by checking format
   */
  static validateSessionCookies(cookies: string): boolean {
    // Check for required Gradescope session cookies
    const hasSessionId = cookies.includes('apt.sid=');
    const hasUserId = cookies.includes('apt.uid=');
    
    return hasSessionId && hasUserId;
  }

  /**
   * Get formatted cookies for API requests
   */
  static async getApiCookies(): Promise<string | null> {
    try {
      const sessionData = await this.getStoredSessionData();
      if (!sessionData || !await this.isSessionValid()) {
        return null;
      }

      return sessionData.sessionCookies;
    } catch (error) {
      console.error('[WebViewAuth] Error getting API cookies:', error);
      return null;
    }
  }

  /**
   * Get session info for UI display
   */
  static async getSessionInfo(): Promise<{
    isValid: boolean;
    userId?: string;
    extractedAt?: Date;
    expiresAt?: Date;
  }> {
    try {
      const sessionData = await this.getStoredSessionData();
      const isValid = await this.isSessionValid();

      return {
        isValid,
        userId: sessionData?.userId,
        extractedAt: sessionData?.extractedAt,
        expiresAt: sessionData?.expiresAt,
      };
    } catch (error) {
      console.error('[WebViewAuth] Error getting session info:', error);
      return { isValid: false };
    }
  }
}
