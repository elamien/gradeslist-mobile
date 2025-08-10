// Secure Gradescope Client - WebView authentication only
import { GradescopeAssignment, GradescopeCourseList } from './types';
import { GradescopeWebViewClient } from './webview-client';
import { GradescopeWebViewAuthService } from '../../services/gradescopeWebViewAuthService';

// Authentication method type (only webview supported for security)
export type GradescopeAuthMethod = 'webview' | 'none';

/**
 * Test Gradescope connection - WebView only (secure)
 */
export async function testGradescopeConnection(): Promise<{ success: boolean; method: GradescopeAuthMethod }> {
  console.log('[GradescopeAPI] Testing WebView connection...');
  
  try {
    const webViewAuth = await GradescopeWebViewAuthService.isSessionValid();
    if (webViewAuth) {
      console.log('[GradescopeAPI] Found valid WebView session, testing connection...');
      const webViewWorking = await GradescopeWebViewClient.testConnection();
      if (webViewWorking) {
        console.log('[GradescopeAPI] WebView connection successful');
        return { success: true, method: 'webview' };
      }
    }
  } catch (error) {
    console.log('[GradescopeAPI] WebView connection failed:', error);
  }
  
  console.log('[GradescopeAPI] No WebView session found - user needs to authenticate');
  return { success: false, method: 'none' };
}

/**
 * Fetch courses - WebView only (secure)
 */
export async function fetchGradescopeCourses(
  filterTerm?: string
): Promise<GradescopeCourseList> {
  console.log('[GradescopeAPI] Fetching courses with WebView...');
  
  try {
    const webViewAuth = await GradescopeWebViewAuthService.isSessionValid();
    if (!webViewAuth) {
      throw new Error('No valid WebView session. Please authenticate via WebView first.');
    }
    
    console.log('[GradescopeAPI] Using WebView client for courses');
    const courses = await GradescopeWebViewClient.fetchCourses(filterTerm);
    console.log(`[GradescopeAPI] WebView returned ${Object.keys(courses.student).length} courses`);
    return courses;
  } catch (error) {
    console.error('[GradescopeAPI] WebView course fetch failed:', error);
    throw new Error('Failed to fetch courses. Please re-authenticate via WebView.');
  }
}

/**
 * Fetch assignments - WebView only (secure)
 */
export async function fetchGradescopeAssignments(
  courseId: string
): Promise<GradescopeAssignment[]> {
  console.log(`[GradescopeAPI] Fetching assignments for course ${courseId} with WebView...`);
  
  try {
    const webViewAuth = await GradescopeWebViewAuthService.isSessionValid();
    if (!webViewAuth) {
      throw new Error('No valid WebView session. Please authenticate via WebView first.');
    }
    
    console.log('[GradescopeAPI] Using WebView client for assignments');
    const assignments = await GradescopeWebViewClient.fetchAssignments(courseId);
    console.log(`[GradescopeAPI] WebView returned ${assignments.length} assignments`);
    return assignments;
  } catch (error) {
    console.error('[GradescopeAPI] WebView assignment fetch failed:', error);
    throw new Error('Failed to fetch assignments. Please re-authenticate via WebView.');
  }
}

/**
 * Get current authentication method
 */
export async function getCurrentAuthMethod(): Promise<GradescopeAuthMethod> {
  try {
    const hasWebViewSession = await GradescopeWebViewAuthService.isSessionValid();
    if (hasWebViewSession) return 'webview';
  } catch (error) {
    console.log('[GradescopeAPI] Error checking WebView session:', error);
  }
  
  return 'none'; // Only WebView authentication supported
}

// =============================================================================
// SECURITY UPGRADE COMPLETE ✅
// 
// Removed all password-based authentication for security:
// - No credential transmission over network
// - No password storage in app or server  
// - Session-based auth via secure WebView only
// - Direct Gradescope access with better performance
// 
// Benefits:
// - 🔒 Enhanced security (no password exposure)
// - ⚡ Better performance (direct scraping)
// - 📱 Superior UX (browser-style login)
// - 🎯 Accurate data (real titles, proper dates)
// =============================================================================