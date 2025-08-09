// Universal interfaces for Canvas and Gradescope APIs

export interface UniversalAssignment {
  id: string;
  title: string;
  due_date: string | null;
  max_points: number | null;
  score: number | null;
  status: string;
  course_id?: string;
  course_name?: string;
  platform?: 'canvas' | 'gradescope' | 'blackboard' | 'google-classroom' | 'moodle';
}

export interface UniversalCourse {
  id: string;
  name: string;
  term: string;
  course_code?: string;
  platform?: 'canvas' | 'gradescope' | 'blackboard' | 'google-classroom' | 'moodle';
}

export interface UniversalCourseList {
  student: UniversalCourse[];
  instructor: UniversalCourse[];
}

export enum UniversalAssignmentStatus {
  MISSING = "missing",
  SUBMITTED = "submitted",
  GRADED = "graded"
}

export interface UniversalAPIResponse<T> {
  data: T;
  source: 'canvas' | 'gradescope';
  timestamp: string;
  success: boolean;
  error?: string;
}