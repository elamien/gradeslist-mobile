// services/cookieGradescopeService.ts
// Cookie-based Gradescope service using production parsing code

import axios from 'axios';

// Feature flags
export const COOKIE_LOGIN_ENABLED = true; // Set to false to disable cookie login across the app
export const FORCE_FRESH_LOGIN = false; // Set to true to clear cookies/data before login
// Import the CommonJS version to avoid Node.js module issues in React Native
const { 
  fetchGradescopeCourses, 
  fetchGradescopeAssignments 
} = require('../api-extraction/gradescope-api');

export interface CookieLoginResult {
  success: boolean;
  cookieHeader?: string;
  coursesCount?: number;
  assignmentsCount?: number;
  courses?: any[];
  error?: string;
}

// Extract cookies from WebView and verify they work
export async function verifyCookieLogin(cookieHeader: string): Promise<CookieLoginResult> {
  try {
    console.log('[CookieService] Starting cookie verification...');
    
    // Create axios client with cookies using Safari-like User-Agent for alignment
    const client = axios.create({
      timeout: 15000,
      headers: {
        'Cookie': cookieHeader,
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });

    // Step 1: Verify account access
    console.log('[CookieService] Step 1: Verifying account access...');
    const accountResponse = await client.get('https://www.gradescope.com/account', {
      maxRedirects: 0,
      validateStatus: status => status < 400
    });

    if (accountResponse.status !== 200) {
      throw new Error(`Account page returned status: ${accountResponse.status}`);
    }

    // Check if redirected to login or contains login form
    const accountHtml = accountResponse.data;
    if (accountHtml.includes('Log In') || accountHtml.includes('Sign In') || 
        accountHtml.includes('session[email]') || accountHtml.includes('session[password]')) {
      throw new Error('Account page contains login form - session invalid');
    }

    console.log('[CookieService] ✓ Account access verified');

    // Step 2: Fetch courses using production code
    console.log('[CookieService] Step 2: Fetching courses...');
    const authOptions = { sessionCookies: cookieHeader };
    const coursesData = await fetchGradescopeCourses('spring 2025', authOptions);

    // Extract all courses from the production response structure
    const allCourses: any[] = [];
    if (coursesData && coursesData.student) {
      Object.values(coursesData.student).forEach(course => allCourses.push(course));
    }
    if (coursesData && coursesData.instructor) {
      Object.values(coursesData.instructor).forEach(course => allCourses.push(course));
    }

    console.log(`[CookieService] ✓ Found ${allCourses.length} courses`);

    // Step 3: Fetch assignments from first course to verify parsing works
    let assignmentsCount = 0;
    if (allCourses.length > 0) {
      console.log('[CookieService] Step 3: Fetching sample assignments...');
      try {
        const assignments = await fetchGradescopeAssignments(allCourses[0].id, authOptions);
        assignmentsCount = assignments.length;
        console.log(`[CookieService] ✓ Found ${assignmentsCount} assignments in first course`);
      } catch (error) {
        console.warn('[CookieService] Warning: Could not fetch assignments, but courses work:', error);
        // Don't fail the entire verification if assignments fail but courses work
      }
    }

    return {
      success: true,
      cookieHeader,
      coursesCount: allCourses.length,
      assignmentsCount,
      courses: allCourses
    };

  } catch (error) {
    console.error('[CookieService] Cookie verification failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during cookie verification'
    };
  }
}

// Extract cookies from WebView navigation
export function extractCookiesFromWebView(webview: any): Promise<string> {
  return new Promise((resolve, reject) => {
    const script = `
      (function() {
        try {
          // Get all cookies for the current domain
          const cookies = document.cookie;
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'cookieExtraction',
            cookies: cookies,
            url: window.location.href
          }));
        } catch (error) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'cookieExtractionError',
            error: error.message
          }));
        }
      })();
    `;

    webview.injectJavaScript(script);

    const timeout = setTimeout(() => {
      reject(new Error('Cookie extraction timeout'));
    }, 10000);

    const handleMessage = (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'cookieExtraction') {
          clearTimeout(timeout);
          resolve(data.cookies);
        } else if (data.type === 'cookieExtractionError') {
          clearTimeout(timeout);
          reject(new Error(data.error));
        }
      } catch (error) {
        // Ignore non-JSON messages
      }
    };

    // Note: This would need to be integrated with the actual WebView message handler
    // This is a helper function that shows the pattern
  });
}