// Gradescope API - Type Definitions Only
// These interfaces are used by field-mapping.ts and server-gradescope-api.ts

export interface GradescopeAssignment {
  id: string;
  title: string;
  due_date: any;  // Can be DateTime object or Date or string
  submissions_status: string;
  grade: number | null;
  points: string | null;
  submission_id?: string;
}

export interface GradescopeCourse {
  id: string;
  name: string;
  term: string;
}

export interface GradescopeCourseList {
  instructor: { [key: string]: GradescopeCourse };
  student: { [key: string]: GradescopeCourse };
}


