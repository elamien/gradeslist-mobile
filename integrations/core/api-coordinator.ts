// Mobile Universal API - React Native Compatible
// This provides a unified interface for both Canvas and Gradescope APIs

import { PlatformCredentials } from '../../store/useAppStore';
import { fetchCanvasAssignments, fetchCanvasCourses, testCanvasConnection } from '../canvas/client';
import {
    fetchGradescopeAssignments,
    fetchGradescopeCourses,
    testGradescopeConnection,
    getCurrentAuthMethod
} from '../gradescope/client';
import {
    mapCanvasAssignmentsToUniversal,
    mapCanvasCoursesToUniversal,
    mapGradescopeAssignmentsToUniversal,
    mapGradescopeCourseListToUniversal
} from './data-normalizers';
import { UniversalAssignment, UniversalCourse } from './normalized-types';

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
 * Uses secure WebView authentication only
 */
export async function getGradescopeAssignments(
  courseId: string
): Promise<UniversalAssignment[]> {
  try {
    // Use WebView client (secure, no credentials needed)
    const gradescopeAssignments = await fetchGradescopeAssignments(courseId);
    
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
    const courseList = await getGradescopeCourses(selectedTerm);
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
        const assignments = await getGradescopeAssignments(course.id);
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
 * Uses secure WebView authentication only
 */
export async function getGradescopeCourses(
  filterTerm: string
): Promise<{ student: UniversalCourse[], instructor: UniversalCourse[] }> {
  try {
    // Use WebView client (secure, no credentials needed)
    const gradescopeCourseList = await fetchGradescopeCourses(filterTerm);
    
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
    const courseList = await getGradescopeCourses(selectedTerm);
    return [...courseList.student, ...courseList.instructor];
  }
}

// =============================================
// CONNECTION TESTING FUNCTIONS
// =============================================

/**
 * Test connection to any platform
 * Uses secure WebView authentication for Gradescope
 */
export async function testConnection(
  platform: 'canvas' | 'gradescope',
  credentials?: PlatformCredentials
): Promise<boolean> {
  if (platform === 'canvas') {
    if (!credentials || (!credentials.token && !credentials.username)) {
      throw new Error('Canvas API token is required.');
    }
    return await testCanvasConnection(credentials);
  } else {
    // Use secure WebView authentication only
    const result = await testGradescopeConnection();
    return result.success;
  }
}

// =============================================
// UTILITY FUNCTIONS
// =============================================









// Export the main API object for easy importing
export const universalAPI = {
  getAssignments,
  getCourses,
  testConnection
};
