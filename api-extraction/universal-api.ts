// Universal API Wrapper - "Plug and Chug" Functions
// These functions provide a consistent interface regardless of the underlying API

import { 
  fetchCanvasCourses, 
  fetchCanvasAssignments, 
  fetchCanvasUserProfile 
} from './canvas-api';
import { 
  fetchGradescopeCourses, 
  fetchGradescopeAssignments 
} from './gradescope-api';
import { 
  mapCanvasAssignmentsToUniversal,
  mapCanvasCoursesToUniversal,
  mapGradescopeCourseListToUniversal,
  mapGradescopeAssignmentsToUniversal,
  createUniversalResponse
} from './field-mapping';
import { 
  UniversalAssignment, 
  UniversalCourse, 
  UniversalCourseList, 
  UniversalAPIResponse 
} from './universal-interfaces';

// =============================================
// UNIVERSAL COURSE FUNCTIONS
// =============================================

/**
 * Fetch courses from Canvas API and return in universal format
 */
export async function fetchUniversalCanvasCourses(
  filterTerm: string,
  apiToken: string
): Promise<UniversalAPIResponse<UniversalCourse[]>> {
  try {
    const canvasCourses = await fetchCanvasCourses(filterTerm, apiToken);
    const universalCourses = mapCanvasCoursesToUniversal(canvasCourses);
    return createUniversalResponse(universalCourses, 'canvas');
  } catch (error) {
    return createUniversalResponse([], 'canvas', false, error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Fetch courses from Gradescope API and return in universal format
 * Supports both email/password and session cookies authentication
 */
export async function fetchUniversalGradescopeCourses(
  filterTerm?: string,
  authOptions?: { email: string; password: string } | { sessionCookies: string }
): Promise<UniversalAPIResponse<UniversalCourseList>> {
  try {
    const gradescopeCourseList = await fetchGradescopeCourses(filterTerm, authOptions);
    const universalCourseList = mapGradescopeCourseListToUniversal(gradescopeCourseList);
    return createUniversalResponse(universalCourseList, 'gradescope');
  } catch (error) {
    const emptyList: UniversalCourseList = { student: [], instructor: [] };
    return createUniversalResponse(emptyList, 'gradescope', false, error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Fetch courses from both APIs and combine them
 */
export async function fetchUniversalAllCourses(
  filterTerm: string,
  canvasApiToken: string,
  gradescopeAuthOptions?: { email: string; password: string } | { sessionCookies: string }
): Promise<UniversalAPIResponse<{
  canvas: UniversalCourse[];
  gradescope: UniversalCourseList;
}>> {
  try {
    const [canvasResponse, gradescopeResponse] = await Promise.all([
      fetchUniversalCanvasCourses(filterTerm, canvasApiToken),
      fetchUniversalGradescopeCourses(filterTerm, gradescopeAuthOptions)
    ]);

    const combinedData = {
      canvas: canvasResponse.data,
      gradescope: gradescopeResponse.data
    };

    const hasErrors = !canvasResponse.success || !gradescopeResponse.success;
    const errorMessage = [
      !canvasResponse.success ? `Canvas: ${canvasResponse.error}` : '',
      !gradescopeResponse.success ? `Gradescope: ${gradescopeResponse.error}` : ''
    ].filter(Boolean).join('; ');

    return createUniversalResponse(combinedData, 'canvas', !hasErrors, errorMessage || undefined);
  } catch (error) {
    const emptyData = {
      canvas: [],
      gradescope: { student: [], instructor: [] }
    };
    return createUniversalResponse(emptyData, 'canvas', false, error instanceof Error ? error.message : 'Unknown error');
  }
}

// =============================================
// UNIVERSAL ASSIGNMENT FUNCTIONS
// =============================================

/**
 * Fetch assignments from Canvas API and return in universal format
 */
export async function fetchUniversalCanvasAssignments(
  courseId: string,
  apiToken: string
): Promise<UniversalAPIResponse<UniversalAssignment[]>> {
  try {
    const canvasAssignments = await fetchCanvasAssignments(courseId, apiToken);
    const universalAssignments = mapCanvasAssignmentsToUniversal(canvasAssignments);
    return createUniversalResponse(universalAssignments, 'canvas');
  } catch (error) {
    return createUniversalResponse([], 'canvas', false, error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Fetch assignments from Gradescope API and return in universal format
 * Supports both email/password and session cookies authentication
 */
export async function fetchUniversalGradescopeAssignments(
  courseId: string,
  authOptions?: { email: string; password: string } | { sessionCookies: string }
): Promise<UniversalAPIResponse<UniversalAssignment[]>> {
  try {
    const gradescopeAssignments = await fetchGradescopeAssignments(courseId, authOptions);
    const universalAssignments = mapGradescopeAssignmentsToUniversal(gradescopeAssignments);
    return createUniversalResponse(universalAssignments, 'gradescope');
  } catch (error) {
    return createUniversalResponse([], 'gradescope', false, error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Fetch assignments from both APIs for a given course
 */
export async function fetchUniversalAllAssignments(
  canvasCourseId: string,
  gradescopeCourseId: string,
  canvasApiToken: string,
  gradescopeAuthOptions?: { email: string; password: string } | { sessionCookies: string }
): Promise<UniversalAPIResponse<{
  canvas: UniversalAssignment[];
  gradescope: UniversalAssignment[];
}>> {
  try {
    const [canvasResponse, gradescopeResponse] = await Promise.all([
      fetchUniversalCanvasAssignments(canvasCourseId, canvasApiToken),
      fetchUniversalGradescopeAssignments(gradescopeCourseId, gradescopeAuthOptions)
    ]);

    const combinedData = {
      canvas: canvasResponse.data,
      gradescope: gradescopeResponse.data
    };

    const hasErrors = !canvasResponse.success || !gradescopeResponse.success;
    const errorMessage = [
      !canvasResponse.success ? `Canvas: ${canvasResponse.error}` : '',
      !gradescopeResponse.success ? `Gradescope: ${gradescopeResponse.error}` : ''
    ].filter(Boolean).join('; ');

    return createUniversalResponse(combinedData, 'canvas', !hasErrors, errorMessage || undefined);
  } catch (error) {
    const emptyData = {
      canvas: [],
      gradescope: []
    };
    return createUniversalResponse(emptyData, 'canvas', false, error instanceof Error ? error.message : 'Unknown error');
  }
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Validate Canvas API token
 */
export async function validateCanvasToken(apiToken: string): Promise<boolean> {
  try {
    await fetchCanvasUserProfile(apiToken);
    return true;
  } catch {
    return false;
  }
}

/**
 * Simple function to merge assignments from both APIs into a single array
 */
export function mergeUniversalAssignments(
  canvasAssignments: UniversalAssignment[],
  gradescopeAssignments: UniversalAssignment[]
): UniversalAssignment[] {
  return [...canvasAssignments, ...gradescopeAssignments];
}

/**
 * Filter assignments by status
 */
export function filterAssignmentsByStatus(
  assignments: UniversalAssignment[],
  status: string
): UniversalAssignment[] {
  return assignments.filter(assignment => assignment.status === status);
}

/**
 * Filter assignments by due date range
 */
export function filterAssignmentsByDueDate(
  assignments: UniversalAssignment[],
  startDate?: string,
  endDate?: string
): UniversalAssignment[] {
  return assignments.filter(assignment => {
    if (!assignment.due_date) return false;
    
    const dueDate = new Date(assignment.due_date);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    if (start && dueDate < start) return false;
    if (end && dueDate > end) return false;
    
    return true;
  });
}