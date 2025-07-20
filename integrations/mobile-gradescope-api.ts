// Mobile-compatible Gradescope API
// This version uses the real Gradescope API with React Native compatible implementations

import { GradescopeAssignment, GradescopeCourse, GradescopeCourseList } from './gradescope-api';
import { 
  fetchGradescopeCourses as fetchRealGradescopeCourses,
  fetchGradescopeAssignments as fetchRealGradescopeAssignments,
  authenticateGradescope as authenticateRealGradescope,
  testGradescopeConnection as testRealGradescopeConnection
} from './mobile-gradescope-api-real';
import { PlatformCredentials } from '../store/useAppStore';


// Core function to fetch courses - supports both email/password and session cookies
export async function fetchGradescopeCourses(
  filterTerm?: string,
  credentials?: PlatformCredentials
): Promise<GradescopeCourseList> {
  return await fetchRealGradescopeCourses(filterTerm, credentials);
}

// Core function to fetch assignments - supports both email/password and session cookies
export async function fetchGradescopeAssignments(
  courseId: string,
  credentials?: PlatformCredentials
): Promise<GradescopeAssignment[]> {
  return await fetchRealGradescopeAssignments(courseId, credentials);
}

// Core authentication function - handles Gradescope's native login method
export async function authenticateGradescope(email: string, password: string): Promise<string> {
  return await authenticateRealGradescope(email, password);
}

// Test Gradescope connection
export async function testGradescopeConnection(credentials: PlatformCredentials): Promise<boolean> {
  return await testRealGradescopeConnection(credentials);
}