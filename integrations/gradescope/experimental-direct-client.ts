/**
 * EXPERIMENTAL: Direct Gradescope API Client using WebView Session Cookies
 * 
 * This is an experimental implementation to test if we can make direct
 * API calls to Gradescope using the session cookies extracted from WebView auth.
 * 
 * ⚠️  EXPERIMENTAL STATUS:
 * - Heavy logging for debugging
 * - Error handling for unknown responses  
 * - Gradual feature implementation
 * - Fallback to server-based client if this fails
 */

import { GradescopeWebViewAuthService } from '../../services/gradescopeWebViewAuthService';
import { GradescopeCourseList } from './types';

// Base Gradescope URLs
const GRADESCOPE_BASE_URL = 'https://www.gradescope.com';

/**
 * EXPERIMENT: Test if we can make authenticated requests to Gradescope directly
 */
export async function experimentalTestDirectConnection(): Promise<boolean> {
  console.log('[EXPERIMENTAL] Testing direct Gradescope connection with WebView cookies...');
  
  try {
    // Step 1: Get session cookies
    const cookies = await GradescopeWebViewAuthService.getApiCookies();
    
    if (!cookies) {
      console.log('[EXPERIMENTAL] No WebView session cookies available');
      return false;
    }
    
    console.log('[EXPERIMENTAL] Found session cookies, length:', cookies.length);
    console.log('[EXPERIMENTAL] Cookie preview:', cookies.substring(0, 100) + '...');
    
    // Step 2: Test authenticated web pages (not API endpoints)
    const testUrl = `${GRADESCOPE_BASE_URL}/`; // Main dashboard page
    
    console.log('[EXPERIMENTAL] Making test request to:', testUrl);
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Cookie': cookies,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Referer': 'https://www.gradescope.com/',
      },
    });
    
    console.log('[EXPERIMENTAL] Response status:', response.status);
    console.log('[EXPERIMENTAL] Response headers:', Object.fromEntries(response.headers));
    
    if (response.ok) {
      const htmlData = await response.text();
      console.log('[EXPERIMENTAL] HTML response length:', htmlData.length);
      console.log('[EXPERIMENTAL] HTML preview:', htmlData.substring(0, 300));
      
      // Check if we got an authenticated page (look for course data)
      const hasCoursesData = htmlData.includes('courses') || htmlData.includes('dashboard');
      const isLoggedIn = !htmlData.includes('Login') && !htmlData.includes('login');
      
      console.log('[EXPERIMENTAL] Has courses data:', hasCoursesData);
      console.log('[EXPERIMENTAL] Is logged in:', isLoggedIn);
      
      if (hasCoursesData && isLoggedIn) {
        console.log('[EXPERIMENTAL] ✅ Direct connection successful!');
        return true;
      } else {
        console.log('[EXPERIMENTAL] ❌ Connection successful but not authenticated');
        return false;
      }
    } else {
      console.log('[EXPERIMENTAL] ❌ Connection failed with status:', response.status);
      return false;
    }
    
  } catch (error) {
    console.error('[EXPERIMENTAL] Connection test failed:', error);
    return false;
  }
}

/**
 * EXPERIMENT: Try to fetch user courses directly
 */
export async function experimentalFetchDirectCourses(): Promise<GradescopeCourseList | null> {
  console.log('[EXPERIMENTAL] Attempting to fetch courses directly from Gradescope...');
  
  try {
    // Step 1: Verify we have session cookies
    const cookies = await GradescopeWebViewAuthService.getApiCookies();
    
    if (!cookies) {
      console.log('[EXPERIMENTAL] No session cookies for direct course fetch');
      return null;
    }
    
    // Step 2: Try actual web pages that likely contain course data  
    const potentialEndpoints = [
      '/', // Main dashboard
      '/courses', // Courses page
      '/account', // Account page
    ];
    
    for (const endpoint of potentialEndpoints) {
      const url = `${GRADESCOPE_BASE_URL}${endpoint}`;
      console.log(`[EXPERIMENTAL] Trying endpoint: ${url}`);
      
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Cookie': cookies,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
            'Referer': 'https://www.gradescope.com/',
          },
        });
        
        console.log(`[EXPERIMENTAL] ${endpoint} - Status: ${response.status}`);
        
        if (response.ok) {
          const htmlData = await response.text();
          console.log(`[EXPERIMENTAL] ${endpoint} - HTML length: ${htmlData.length}`);
          console.log(`[EXPERIMENTAL] ${endpoint} - HTML preview:`, htmlData.substring(0, 300));
          
          // Look for course-related content in HTML
          const hasCourseElements = htmlData.includes('course') || htmlData.includes('Course');
          const hasAssignmentElements = htmlData.includes('assignment') || htmlData.includes('Assignment');
          const hasGradescopeContent = htmlData.includes('gradescope');
          
          console.log(`[EXPERIMENTAL] ${endpoint} - Has courses: ${hasCourseElements}`);
          console.log(`[EXPERIMENTAL] ${endpoint} - Has assignments: ${hasAssignmentElements}`);
          console.log(`[EXPERIMENTAL] ${endpoint} - Has Gradescope content: ${hasGradescopeContent}`);
          
          if (hasCourseElements || hasAssignmentElements) {
            console.log(`[EXPERIMENTAL] ✅ Found course/assignment data at ${endpoint}!`);
            
            // Try to extract course names/IDs from HTML (basic scraping)
            const courseMatches = htmlData.match(/courses\/(\d+)/g);
            const courseNames = htmlData.match(/course[^>]*>([^<]+)</g);
            
            console.log(`[EXPERIMENTAL] ${endpoint} - Course URLs found:`, courseMatches?.slice(0, 5));
            console.log(`[EXPERIMENTAL] ${endpoint} - Course names found:`, courseNames?.slice(0, 5));
            
            // Return basic course structure if we found data
            if (courseMatches && courseMatches.length > 0) {
              return parseCourseData({ endpoint, courseMatches, courseNames, htmlLength: htmlData.length });
            }
          }
        }
        
      } catch (endpointError) {
        console.log(`[EXPERIMENTAL] ${endpoint} - Error:`, endpointError);
      }
    }
    
    console.log('[EXPERIMENTAL] ❌ No valid course endpoints found');
    return null;
    
  } catch (error) {
    console.error('[EXPERIMENTAL] Course fetch failed:', error);
    return null;
  }
}

/**
 * Helper: Parse course data into our expected format
 */
function parseCourseData(data: any): GradescopeCourseList {
  console.log('[EXPERIMENTAL] Parsing course data...', data);
  
  if (data && data.courseMatches) {
    // Extract course IDs from URLs like "courses/123456"
    const courseIds = data.courseMatches.map((match: string) => match.replace('courses/', ''));
    
    console.log('[EXPERIMENTAL] Extracted course IDs:', courseIds);
    
    return {
      courses: courseIds.map((id: string, index: number) => ({
        id,
        name: `Course ${id}`, // Placeholder - would need proper HTML parsing
        term: 'Discovered from WebView'
      })),
      term: 'WebView Session',
      total: courseIds.length
    };
  }
  
  // Return empty structure if no data found
  return {
    courses: [],
    term: 'Unknown',
    total: 0
  };
}

/**
 * EXPERIMENT: Main direct client test function
 */
export async function runDirectClientExperiment(): Promise<{
  connectionWorks: boolean;
  coursesFound: boolean;
  courseData?: GradescopeCourseList;
}> {
  console.log('[EXPERIMENTAL] 🧪 Starting Direct Client Experiment...');
  
  const results = {
    connectionWorks: false,
    coursesFound: false,
    courseData: undefined as GradescopeCourseList | undefined
  };
  
  // Test 1: Basic connection
  results.connectionWorks = await experimentalTestDirectConnection();
  
  // Test 2: Course fetching (only if connection works)
  if (results.connectionWorks) {
    const courseData = await experimentalFetchDirectCourses();
    results.coursesFound = courseData !== null;
    results.courseData = courseData || undefined;
  }
  
  console.log('[EXPERIMENTAL] 📊 Experiment Results:', results);
  
  return results;
}
