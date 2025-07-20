// Field Mapping Functions - Convert API-specific data to Universal format
// This is the "adapter pattern" that normalizes data from different sources

import { DateTime } from 'luxon';
import { CanvasAssignment, CanvasCourse } from './canvas-api';
import { GradescopeAssignment, GradescopeCourse, GradescopeCourseList } from './gradescope-api';
import { 
  UniversalAssignment, 
  UniversalCourse, 
  UniversalCourseList, 
  UniversalAssignmentStatus,
  UniversalAPIResponse 
} from './universal-interfaces';

// =============================================
// CANVAS TO UNIVERSAL MAPPING
// =============================================

export function mapCanvasAssignmentToUniversal(
  canvasAssignment: CanvasAssignment
): UniversalAssignment {
  return {
    id: canvasAssignment.id.toString(),                    // number -> string
    title: canvasAssignment.name || 'Untitled Assignment', // name -> title
    due_date: canvasAssignment.due_at,                     // due_at -> due_date (already string)
    max_points: canvasAssignment.points_possible,          // points_possible -> max_points
    score: canvasAssignment.submission?.score || null,     // submission.score -> score
    status: mapCanvasStatusToUniversal(canvasAssignment.submission?.workflow_state)
  };
}

export function mapCanvasCourseToUniversal(
  canvasCourse: CanvasCourse
): UniversalCourse {
  return {
    id: canvasCourse.id.toString(),                        // number -> string
    name: canvasCourse.name,                               // name -> name (same)
    term: canvasCourse.term?.name || 'Unknown Term',       // term.name -> term
    course_code: canvasCourse.course_code                  // course_code -> course_code (same)
  };
}

function mapCanvasStatusToUniversal(canvasStatus: string | null | undefined): string {
  if (!canvasStatus) return UniversalAssignmentStatus.MISSING;
  
  switch (canvasStatus.toLowerCase()) {
    case 'submitted':
      return UniversalAssignmentStatus.SUBMITTED;
    case 'pending_review':
      return UniversalAssignmentStatus.SUBMITTED;
    case 'graded':
      return UniversalAssignmentStatus.GRADED;
    case 'unsubmitted':
      return UniversalAssignmentStatus.MISSING;
    default:
      return UniversalAssignmentStatus.MISSING;
  }
}

// =============================================
// GRADESCOPE TO UNIVERSAL MAPPING
// =============================================

export function mapGradescopeAssignmentToUniversal(
  gradescopeAssignment: GradescopeAssignment
): UniversalAssignment {
  return {
    id: gradescopeAssignment.id,                           // string -> string (same)
    title: gradescopeAssignment.title,                     // title -> title (same)
    due_date: gradescopeAssignment.due_date 
      ? (gradescopeAssignment.due_date instanceof Date 
          ? gradescopeAssignment.due_date.toISOString()
          : gradescopeAssignment.due_date.toISO?.() || null)
      : null,        // DateTime/Date -> string
    max_points: parseFloat(gradescopeAssignment.points || '0') || null, // string -> number
    score: gradescopeAssignment.grade,                     // grade -> score (same)
    status: mapGradescopeStatusToUniversal(gradescopeAssignment.submissions_status)
  };
}

export function mapGradescopeCourseToUniversal(
  gradescopeCourse: GradescopeCourse
): UniversalCourse {
  return {
    id: gradescopeCourse.id,                               // string -> string (same)
    name: gradescopeCourse.name,                           // name -> name (same)
    term: gradescopeCourse.term,                           // term -> term (same)
    course_code: undefined                                 // Gradescope doesn't have course codes
  };
}

export function mapGradescopeCourseListToUniversal(
  gradescopeCourseList: GradescopeCourseList
): UniversalCourseList {
  return {
    student: Object.values(gradescopeCourseList.student).map(mapGradescopeCourseToUniversal),
    instructor: Object.values(gradescopeCourseList.instructor).map(mapGradescopeCourseToUniversal)
  };
}

function mapGradescopeStatusToUniversal(gradescopeStatus: string): string {
  const status = gradescopeStatus.toLowerCase();
  
  // Handle exact matches first
  switch (status) {
    case 'submitted':
      return UniversalAssignmentStatus.SUBMITTED;
    case 'graded':
      return UniversalAssignmentStatus.GRADED;
    case 'not submitted':
    case 'no submission':
    case 'missing':
      return UniversalAssignmentStatus.MISSING;
  }
  
  // Handle status strings with additional info (e.g., "Graded (Late)", "Submitted (On Time)")
  if (status.startsWith('graded')) {
    return UniversalAssignmentStatus.GRADED;
  }
  if (status.startsWith('submitted')) {
    return UniversalAssignmentStatus.SUBMITTED;
  }
  
  // Default to missing for unknown statuses
  return UniversalAssignmentStatus.MISSING;
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

// Create a standardized API response wrapper
export function createUniversalResponse<T>(
  data: T,
  source: 'canvas' | 'gradescope',
  success: boolean = true,
  error?: string
): UniversalAPIResponse<T> {
  return {
    data,
    source,
    timestamp: new Date().toISOString(),
    success,
    error
  };
}

// Batch mapping functions
export function mapCanvasAssignmentsToUniversal(
  canvasAssignments: CanvasAssignment[]
): UniversalAssignment[] {
  return canvasAssignments.map(mapCanvasAssignmentToUniversal);
}

export function mapCanvasCoursesToUniversal(
  canvasCourses: CanvasCourse[]
): UniversalCourse[] {
  return canvasCourses.map(mapCanvasCourseToUniversal);
}

export function mapGradescopeAssignmentsToUniversal(
  gradescopeAssignments: GradescopeAssignment[]
): UniversalAssignment[] {
  return gradescopeAssignments.map(mapGradescopeAssignmentToUniversal);
}