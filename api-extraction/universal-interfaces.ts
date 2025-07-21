// Universal/Standardized Data Interfaces
// These interfaces provide a consistent format for data from both Canvas and Gradescope APIs

// Universal Assignment interface - standardized fields from both APIs (MVP)
export interface UniversalAssignment {
  id: string;                    // Standardized as string (Canvas: number -> string, Gradescope: string)
  title: string;                 // Standardized name (Canvas: name, Gradescope: title)  
  due_date: string | null;       // Standardized datetime (Canvas: due_at, Gradescope: due_date -> ISO string)
  max_points: number | null;     // Standardized points (Canvas: points_possible, Gradescope: points -> number)
  score: number | null;          // Standardized score (Canvas: submission.score, Gradescope: grade)
  status: string;                // Standardized status (Canvas: workflow_state, Gradescope: submissions_status)
}

// Universal Course interface - standardized fields from both APIs
export interface UniversalCourse {
  id: string;                    // Standardized as string (Canvas: number -> string, Gradescope: string)
  name: string;                  // Course name (same in both)
  term: string;                  // Standardized term (Canvas: term.name, Gradescope: term)
  course_code?: string;          // Optional course code (only available in Canvas)
}

// Universal CourseList interface - standardized structure
export interface UniversalCourseList {
  student: UniversalCourse[];    // Array of student courses
  instructor: UniversalCourse[]; // Array of instructor courses
}

// Status mapping for standardized assignment statuses (MVP: 3 states only)
export enum UniversalAssignmentStatus {
  MISSING = "missing",        // No submission (Canvas: unsubmitted/null, Gradescope: "Not submitted")
  SUBMITTED = "submitted",    // Submitted but not graded (Canvas: submitted/pending_review, Gradescope: "Submitted")
  GRADED = "graded"          // Graded (Canvas: graded, Gradescope: "Graded")
}

// Universal API response interface
export interface UniversalAPIResponse<T> {
  data: T;
  source: 'canvas' | 'gradescope';
  timestamp: string;
  success: boolean;
  error?: string;
}