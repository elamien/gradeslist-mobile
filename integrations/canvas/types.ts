// Canvas API - Type Definitions Only
// These interfaces are used by mobile-canvas-api.ts and field-mapping.ts

export interface CanvasAssignment {
  id: number;
  name: string | null;
  due_at: string | null;
  points_possible: number | null;
  submission?: {
    workflow_state: string | null;
    score: number | null;
    submitted_at: string | null;
  } | null;
}

export interface CanvasCourse {
  id: number;
  name: string;
  term?: {
    id: number;
    name: string;
  };
  course_code?: string;
}

