// Universal API Wrapper - Mobile Compatible Version
// These functions provide a consistent interface for the mobile app

import { MobileAPI } from './mobile-api';
import { UniversalAssignment, UniversalCourse } from './universal-interfaces';

// =============================================
// UNIVERSAL API FUNCTIONS
// =============================================

/**
 * Fetch assignments from any platform
 */
export async function getAssignments(
  platform: 'canvas' | 'gradescope',
  username: string,
  password: string
): Promise<UniversalAssignment[]> {
  return await MobileAPI.getAssignments(platform, username, password);
}

/**
 * Fetch courses from any platform
 */
export async function getCourses(
  platform: 'canvas' | 'gradescope',
  username: string,
  password: string
): Promise<UniversalCourse[]> {
  return await MobileAPI.getCourses(platform, username, password);
}

/**
 * Test connection to a platform
 */
export async function testConnection(
  platform: 'canvas' | 'gradescope',
  username: string,
  password: string
): Promise<boolean> {
  return await MobileAPI.testConnection(platform, username, password);
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