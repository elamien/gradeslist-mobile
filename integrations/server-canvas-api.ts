// Server-based Canvas API - calls our Vercel serverless functions
import { CanvasAssignment, CanvasCourse } from './canvas-api';
import { PlatformCredentials } from '../store/useAppStore';

// Configure server URL - using Vercel deployment
const SERVER_BASE_URL = 'https://gradeslist-mobile.vercel.app';

interface ServerResponse<T> {
  success: boolean;
  error?: string;
  message?: string;
  data?: T;
}

interface CanvasCoursesResponse {
  success: boolean;
  courses: CanvasCourse[];
  term: string;
  count: number;
  platform: string;
}

interface CanvasAssignmentsResponse {
  success: boolean;
  assignments: CanvasAssignment[];
  courseId: string;
  count: number;
  platform: string;
}

interface CanvasTestResponse {
  success: boolean;
  message: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
  platform: string;
}

/**
 * Make authenticated request to our Canvas API endpoints
 */
async function makeCanvasServerRequest<T>(
  endpoint: string, 
  credentials: PlatformCredentials,
  additionalData: any = {}
): Promise<T> {
  if (!credentials.token) {
    throw new Error('Canvas API token is required for server-based authentication');
  }

  const url = `${SERVER_BASE_URL}/api/canvas${endpoint}`;
  
  console.log(`Making Canvas server request to: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiToken: credentials.token,
        ...additionalData
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Canvas server request failed');
    }

    return data as T;
  } catch (error) {
    if (error instanceof Error) {
      // Check for common network errors
      if (error.message.includes('Failed to fetch') || error.message.includes('Network request failed')) {
        throw new Error('Cannot connect to Canvas API server');
      }
      throw error;
    }
    throw new Error('Unknown error occurred while contacting Canvas API server');
  }
}

/**
 * Test Canvas API token and server connection
 */
export async function testServerCanvasConnection(credentials: PlatformCredentials): Promise<boolean> {
  try {
    console.log('Testing server-based Canvas connection...');
    await makeCanvasServerRequest<CanvasTestResponse>('/test', credentials);
    console.log('Canvas server connection test successful');
    return true;
  } catch (error) {
    console.error('Canvas server connection test failed:', error);
    return false;
  }
}

/**
 * Fetch Canvas courses from server
 */
export async function fetchServerCanvasCourses(
  filterTerm?: string,
  credentials?: PlatformCredentials
): Promise<CanvasCourse[]> {
  if (!credentials) {
    throw new Error('Credentials are required for server-based Canvas course fetching');
  }

  try {
    const response = await makeCanvasServerRequest<CanvasCoursesResponse>(
      '/courses', 
      credentials,
      filterTerm ? { term: filterTerm } : {}
    );

    console.log(`Canvas server returned ${response.courses.length} courses`);
    return response.courses;
  } catch (error) {
    console.error('Error fetching Canvas courses from server:', error);
    throw error;
  }
}

/**
 * Fetch Canvas assignments from server
 */
export async function fetchServerCanvasAssignments(
  courseId: string,
  credentials?: PlatformCredentials
): Promise<CanvasAssignment[]> {
  if (!credentials) {
    throw new Error('Credentials are required for server-based Canvas assignment fetching');
  }

  try {
    const response = await makeCanvasServerRequest<CanvasAssignmentsResponse>(
      '/assignments',
      credentials,
      { courseId }
    );

    console.log(`Canvas server returned ${response.assignments.length} assignments for course ${courseId}`);
    return response.assignments;
  } catch (error) {
    console.error('Error fetching Canvas assignments from server:', error);
    throw error;
  }
}

/**
 * Validate Canvas API token using server (for compatibility with existing code)
 */
export async function authenticateServerCanvas(apiToken: string): Promise<string> {
  try {
    await makeCanvasServerRequest<CanvasTestResponse>('/test', { token: apiToken });
    return 'server-authenticated'; // Return a placeholder token
  } catch (error) {
    throw new Error(`Canvas server authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}