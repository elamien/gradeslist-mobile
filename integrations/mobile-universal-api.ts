// Mobile Universal API - React Native Compatible
// This provides a unified interface for both Canvas and Gradescope APIs

import { fetchCanvasCourses, fetchCanvasAssignments, testCanvasConnection } from './mobile-canvas-api';
import { 
  fetchServerGradescopeCourses as fetchGradescopeCourses, 
  fetchServerGradescopeAssignments as fetchGradescopeAssignments, 
  testServerGradescopeConnection as testGradescopeConnection 
} from './server-gradescope-api';
import { 
  mapCanvasAssignmentsToUniversal, 
  mapCanvasCoursesToUniversal,
  mapGradescopeAssignmentsToUniversal,
  mapGradescopeCourseListToUniversal
} from './field-mapping';
import { UniversalAssignment, UniversalCourse } from './universal-interfaces';
import { PlatformCredentials } from '../store/useAppStore';

// =============================================
// UNIVERSAL ASSIGNMENT FUNCTIONS
// =============================================

/**
 * Fetch assignments from Canvas and return in universal format
 */
export async function getCanvasAssignments(
  courseId: string,
  apiTokenOrCredentials: string | PlatformCredentials
): Promise<UniversalAssignment[]> {
  try {
    const canvasAssignments = await fetchCanvasAssignments(courseId, apiTokenOrCredentials);
    return mapCanvasAssignmentsToUniversal(canvasAssignments).map(assignment => ({
      ...assignment,
      course_name: `Course ${courseId}`, // Would be enriched with actual course name
      platform: 'canvas' as const
    }));
  } catch (error) {
    console.error('Error fetching Canvas assignments:', error);
    throw error;
  }
}

/**
 * Fetch assignments from Gradescope and return in universal format
 */
export async function getGradescopeAssignments(
  courseId: string,
  credentials: PlatformCredentials
): Promise<UniversalAssignment[]> {
  try {
    const gradescopeAssignments = await fetchGradescopeAssignments(courseId, credentials);
    return mapGradescopeAssignmentsToUniversal(gradescopeAssignments).map(assignment => ({
      ...assignment,
      platform: 'gradescope' as const
    }));
  } catch (error) {
    console.error('Error fetching Gradescope assignments:', error);
    throw error;
  }
}

/**
 * Fetch assignments from any platform for specific courses
 */
export async function getAssignments(
  platform: 'canvas' | 'gradescope',
  credentials: PlatformCredentials,
  selectedTerm: string = 'spring 2025',
  selectedCourseIds: string[] = []
): Promise<UniversalAssignment[]> {
  if (platform === 'canvas') {
    if (!credentials.token && !credentials.username) throw new Error('Canvas API token is required.');
    
    // Early return if no courses selected
    if (selectedCourseIds.length === 0) {
      return [];
    }
    
    // For Canvas, we need to first fetch courses to get course IDs
    const courses = await getCanvasCourses(selectedTerm, credentials);
    const allAssignments: UniversalAssignment[] = [];
    
    // Filter courses to only selected ones
    const selectedCourses = courses.filter(course => selectedCourseIds.includes(course.id));
    
    // Fetch assignments for each selected course
    for (const course of selectedCourses) {
      try {
        const assignments = await getCanvasAssignments(course.id, credentials);
        // Add course name and course_id to assignments
        const enrichedAssignments = assignments.map(assignment => ({
          ...assignment,
          course_id: course.id,
          course_name: course.name
        }));
        allAssignments.push(...enrichedAssignments);
      } catch (error) {
        console.error(`Error fetching assignments for Canvas course ${course.id}:`, error);
        // Continue with other courses
      }
    }
    
    return allAssignments;
  } else {
    // Early return if no courses selected
    if (selectedCourseIds.length === 0) {
      return [];
    }
    
    // For Gradescope, we need to first fetch courses to get course IDs
    const courseList = await getGradescopeCourses(selectedTerm, credentials);
    const allAssignments: UniversalAssignment[] = [];
    
    // Get all courses (student and instructor)
    const allCourses = [...courseList.student, ...courseList.instructor];
    
    // Filter courses to only selected ones
    const selectedCourses = allCourses.filter(course => selectedCourseIds.includes(course.id));
    
    // Create course lookup map for quick access
    const courseMap = new Map();
    allCourses.forEach(course => {
      courseMap.set(course.id, course.name);
    });
    
    // Fetch assignments for each selected course
    for (const course of selectedCourses) {
      try {
        console.log(`[DEBUG] Processing course: ${course.name} (${course.id})`);
        const assignments = await getGradescopeAssignments(course.id, credentials);
        console.log(`[DEBUG] Got ${assignments.length} raw assignments, first one:`, assignments[0]);
        
        // Add course name and course_id to assignments
        const enrichedAssignments = assignments.map(assignment => ({
          ...assignment,
          course_id: course.id,
          course_name: course.name
        }));
        console.log(`[DEBUG] Enriched assignment sample:`, enrichedAssignments[0]);
        allAssignments.push(...enrichedAssignments);
      } catch (error) {
        console.error(`Error fetching assignments for Gradescope course ${course.id}:`, error);
        // Continue with other courses
      }
    }
    
    return allAssignments;
  }
}

// =============================================
// UNIVERSAL COURSE FUNCTIONS
// =============================================

/**
 * Fetch courses from Canvas and return in universal format
 */
export async function getCanvasCourses(
  filterTerm: string,
  apiTokenOrCredentials: string | PlatformCredentials
): Promise<UniversalCourse[]> {
  try {
    const canvasCourses = await fetchCanvasCourses(filterTerm, apiTokenOrCredentials);
    return mapCanvasCoursesToUniversal(canvasCourses).map(course => ({
      ...course,
      platform: 'canvas' as const
    }));
  } catch (error) {
    console.error('Error fetching Canvas courses:', error);
    throw error;
  }
}

/**
 * Fetch courses from Gradescope and return in universal format
 */
export async function getGradescopeCourses(
  filterTerm: string,
  credentials: PlatformCredentials
): Promise<{ student: UniversalCourse[], instructor: UniversalCourse[] }> {
  try {
    const gradescopeCourseList = await fetchGradescopeCourses(filterTerm, credentials);
    const universalCourseList = mapGradescopeCourseListToUniversal(gradescopeCourseList);
    
    return {
      student: universalCourseList.student.map(course => ({
        ...course,
        platform: 'gradescope' as const
      })),
      instructor: universalCourseList.instructor.map(course => ({
        ...course,
        platform: 'gradescope' as const
      }))
    };
  } catch (error) {
    console.error('Error fetching Gradescope courses:', error);
    throw error;
  }
}

/**
 * Fetch courses from any platform
 */
export async function getCourses(
  platform: 'canvas' | 'gradescope',
  credentials: PlatformCredentials,
  selectedTerm: string = 'spring 2025'
): Promise<UniversalCourse[]> {
  if (platform === 'canvas') {
    if (!credentials.token && !credentials.username) throw new Error('Canvas API token is required.');
    return await getCanvasCourses(selectedTerm, credentials);
  } else {
    const courseList = await getGradescopeCourses(selectedTerm, credentials);
    return [...courseList.student, ...courseList.instructor];
  }
}

// =============================================
// CONNECTION TESTING FUNCTIONS
// =============================================

/**
 * Test connection to any platform
 */
export async function testConnection(
  platform: 'canvas' | 'gradescope',
  credentials: PlatformCredentials
): Promise<boolean> {
  if (platform === 'canvas') {
    if (!credentials.token && !credentials.username) {
      throw new Error('Canvas API token is required.');
    }
    return await testCanvasConnection(credentials);
  } else {
    return await testGradescopeConnection(credentials);
  }
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Merge assignments from multiple platforms
 */
export function mergeAssignments(
  assignments: UniversalAssignment[][]
): UniversalAssignment[] {
  return assignments.flat();
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

/**
 * Sort assignments by due date
 */
export function sortAssignmentsByDueDate(
  assignments: UniversalAssignment[]
): UniversalAssignment[] {
  return assignments.sort((a, b) => {
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });
}

// Export the main API object for easy importing
export const universalAPI = {
  getAssignments,
  getCourses,
  testConnection,
  mergeAssignments,
  filterAssignmentsByStatus,
  filterAssignmentsByDueDate,
  sortAssignmentsByDueDate
};
