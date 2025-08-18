// integrations/gradescopeClient.ts
// Gradescope Client Factory - Routes between cookie and server-based auth

import { PlatformCredentials } from '../store/useAppStore';
import { 
  fetchServerGradescopeCourses as fetchGradescopeCourses, 
  fetchServerGradescopeAssignments as fetchGradescopeAssignments,
} from './server-gradescope-api';

// Development flag - set to true to log cookie values locally
const DEV_LOG_COOKIE_VALUES = true;

type GradescopeMode = 'cookie' | 'server';

interface GradescopeClient {
  mode: GradescopeMode;
  fetchCourses: (filterTerm: string) => Promise<any>;
  fetchAssignments: (courseId: string) => Promise<any>;
}

/**
 * Create Gradescope client based on credentials type
 */
export function getGradescopeClient(credentials: PlatformCredentials): GradescopeClient {
  // Determine mode based on credential type
  const isCookieMode = credentials.cookies && 
                      credentials.loginData?.cookieBased === true &&
                      credentials.loginData?.coursesCount !== undefined;
  
  const mode: GradescopeMode = isCookieMode ? 'cookie' : 'server';
  
  console.log(`[Gradescope] Client mode: ${mode}`);
  
  if (mode === 'cookie') {
    console.log(`[Gradescope] Cookie mode - using verified session with ${credentials.loginData?.coursesCount} courses`);
    
    if (DEV_LOG_COOKIE_VALUES) {
      // Development logging - show cookie names
      const cookieNames = credentials.cookies ? 
        credentials.cookies.split(';').map(c => c.split('=')[0].trim()) : [];
      console.log(`[Gradescope] Cookie names: [${cookieNames.join(', ')}]`);
    }
    
    return createCookieClient(credentials);
  } else {
    console.log(`[Gradescope] Server mode - using username/password authentication`);
    return createServerClient(credentials);
  }
}

/**
 * Create cookie-based client using production parsing code
 */
function createCookieClient(credentials: PlatformCredentials): GradescopeClient {
  // Import the CommonJS version to avoid Node.js module issues in React Native
  const { 
    fetchGradescopeCourses, 
    fetchGradescopeAssignments 
  } = require('../api-extraction/gradescope-api');
  
  const authOptions = { sessionCookies: credentials.cookies };
  
  return {
    mode: 'cookie',
    
    fetchCourses: async (filterTerm: string) => {
      console.log(`[Gradescope] Cookie fetch courses for term: ${filterTerm}`);
      try {
        const coursesData = await fetchGradescopeCourses(filterTerm, authOptions);
        
        // Extract all courses from the production response structure
        const allCourses: any[] = [];
        if (coursesData && coursesData.student) {
          Object.values(coursesData.student).forEach(course => allCourses.push(course));
        }
        if (coursesData && coursesData.instructor) {
          Object.values(coursesData.instructor).forEach(course => allCourses.push(course));
        }
        
        console.log(`[Gradescope] Cookie mode found ${allCourses.length} courses`);
        return coursesData;
      } catch (error) {
        console.error('[Gradescope] Cookie mode course fetch failed:', error);
        throw error;
      }
    },
    
    fetchAssignments: async (courseId: string) => {
      console.log(`[Gradescope] Cookie fetch assignments for course: ${courseId}`);
      try {
        const assignments = await fetchGradescopeAssignments(courseId, authOptions);
        console.log(`[Gradescope] Cookie mode found ${assignments.length} assignments`);
        return assignments;
      } catch (error) {
        console.error(`[Gradescope] Cookie mode assignment fetch failed for course ${courseId}:`, error);
        throw error;
      }
    }
  };
}

/**
 * Create server-based client (existing behavior)
 */
function createServerClient(credentials: PlatformCredentials): GradescopeClient {
  return {
    mode: 'server',
    
    fetchCourses: async (filterTerm: string) => {
      console.log(`[Gradescope] Server fetch courses for term: ${filterTerm}`);
      try {
        const coursesData = await fetchGradescopeCourses(filterTerm, credentials);
        console.log(`[Gradescope] Server mode course fetch completed`);
        return coursesData;
      } catch (error) {
        console.error('[Gradescope] Server mode course fetch failed:', error);
        throw error;
      }
    },
    
    fetchAssignments: async (courseId: string) => {
      console.log(`[Gradescope] Server fetch assignments for course: ${courseId}`);
      try {
        const assignments = await fetchGradescopeAssignments(courseId, credentials);
        console.log(`[Gradescope] Server mode assignment fetch completed`);
        return assignments;
      } catch (error) {
        console.error(`[Gradescope] Server mode assignment fetch failed for course ${courseId}:`, error);
        throw error;
      }
    }
  };
}