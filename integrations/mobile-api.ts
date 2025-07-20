// Mobile-compatible API integration
// This is a React Native compatible version that doesn't rely on server-side HTML parsing

import { UniversalAssignment, UniversalCourse } from './universal-interfaces';

// Mock data for testing - this will be replaced with actual API calls
const mockCanvasAssignments: UniversalAssignment[] = [
  {
    id: 'canvas-1',
    title: 'CS 4640 - Web Programming Assignment 3: React Todo App with TypeScript',
    due_date: '2025-01-20T23:59:00Z',
    max_points: 100,
    score: null,
    status: 'pending',
    course_name: 'CS 4640 - Web Programming',
    platform: 'canvas'
  },
  {
    id: 'canvas-2',
    title: 'CS 4640 - Quiz 4: React Hooks and State Management',
    due_date: '2025-01-25T23:59:00Z',
    max_points: 50,
    score: null,
    status: 'pending',
    course_name: 'CS 4640 - Web Programming',
    platform: 'canvas'
  }
];

const mockGradescopeAssignments: UniversalAssignment[] = [
  {
    id: 'gradescope-1',
    title: 'MATH 3250 - Differential Equations Problem Set 7',
    due_date: '2025-01-21T23:59:00Z',
    max_points: 100,
    score: null,
    status: 'pending',
    course_name: 'MATH 3250 - Differential Equations',
    platform: 'gradescope'
  },
  {
    id: 'gradescope-2',
    title: 'PHYS 2620 - Lab Report: Electromagnetic Induction',
    due_date: '2025-01-22T23:59:00Z',
    max_points: 100,
    score: null,
    status: 'pending',
    course_name: 'PHYS 2620 - Physics Lab',
    platform: 'gradescope'
  }
];

const mockGradedAssignments: UniversalAssignment[] = [
  {
    id: 'canvas-graded-1',
    title: 'CS 4640 - Web Programming Assignment 2: Database Design',
    due_date: '2025-01-10T23:59:00Z',
    max_points: 100,
    score: 95,
    status: 'graded',
    course_name: 'CS 4640 - Web Programming',
    platform: 'canvas'
  },
  {
    id: 'gradescope-graded-1',
    title: 'MATH 3250 - Differential Equations Problem Set 6',
    due_date: '2025-01-15T23:59:00Z',
    max_points: 100,
    score: 87,
    status: 'graded',
    course_name: 'MATH 3250 - Differential Equations',
    platform: 'gradescope'
  },
  {
    id: 'canvas-graded-2',
    title: 'ENGL 1010 - Essay: Character Analysis in Shakespeare',
    due_date: '2025-01-12T23:59:00Z',
    max_points: 85,
    score: 78,
    status: 'graded',
    course_name: 'ENGL 1010 - English Composition',
    platform: 'canvas'
  }
];

// Mock courses data
const mockCourses: UniversalCourse[] = [
  {
    id: 'canvas-course-1',
    name: 'CS 4640 - Web Programming',
    term: 'Spring 2025',
    course_code: 'CS 4640',
    platform: 'canvas'
  },
  {
    id: 'gradescope-course-1',
    name: 'MATH 3250 - Differential Equations',
    term: 'Spring 2025',
    course_code: 'MATH 3250',
    platform: 'gradescope'
  },
  {
    id: 'canvas-course-2',
    name: 'ENGL 1010 - English Composition',
    term: 'Spring 2025',
    course_code: 'ENGL 1010',
    platform: 'canvas'
  },
  {
    id: 'gradescope-course-2',
    name: 'PHYS 2620 - Physics Lab',
    term: 'Spring 2025',
    course_code: 'PHYS 2620',
    platform: 'gradescope'
  }
];

// Simulated API delay
const simulateApiDelay = () => new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));

export class MobileAPI {
  static async getAssignments(platform: 'canvas' | 'gradescope', username: string, password: string): Promise<UniversalAssignment[]> {
    // Simulate API delay
    await simulateApiDelay();
    
    // Simulate authentication check
    if (!username || !password) {
      throw new Error('Invalid credentials');
    }
    
    // Return mock data based on platform
    if (platform === 'canvas') {
      return [...mockCanvasAssignments, ...mockGradedAssignments.filter(a => a.platform === 'canvas')];
    } else {
      return [...mockGradescopeAssignments, ...mockGradedAssignments.filter(a => a.platform === 'gradescope')];
    }
  }

  static async getCourses(platform: 'canvas' | 'gradescope', username: string, password: string): Promise<UniversalCourse[]> {
    // Simulate API delay
    await simulateApiDelay();
    
    // Simulate authentication check
    if (!username || !password) {
      throw new Error('Invalid credentials');
    }
    
    // Return mock data based on platform
    return mockCourses.filter(course => course.platform === platform);
  }

  static async testConnection(platform: 'canvas' | 'gradescope', username: string, password: string): Promise<boolean> {
    // Simulate API delay
    await simulateApiDelay();
    
    // Simple validation - in real app, this would make an actual API call
    if (!username || !password) {
      return false;
    }
    
    // Simulate some authentication failures for testing
    if (username === 'invalid' || password === 'invalid') {
      return false;
    }
    
    return true;
  }
}

// Helper function to convert DateTime to ISO string for the universal interface
export function formatDateForUniversal(date: string | null): string | null {
  if (!date) return null;
  try {
    return new Date(date).toISOString();
  } catch {
    return null;
  }
}