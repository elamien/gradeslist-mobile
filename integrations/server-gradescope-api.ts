// Server-based Gradescope API - calls our Node.js server instead of direct scraping
import { GradescopeAssignment, GradescopeCourse, GradescopeCourseList } from './gradescope-api';
import { PlatformCredentials } from '../store/useAppStore';

// Configure server URL - update this when you deploy
const SERVER_BASE_URL = 'https://gradeslist-mobile.vercel.app';

interface ServerResponse<T> {
  success: boolean;
  error?: string;
  message?: string;
  data?: T;
}

interface CourseResponse {
  success: boolean;
  courses: Array<{
    id: string;
    name: string;
    term: string;
    url: string;
    platform: string;
  }>;
  term: string;
  count: number;
}

interface AssignmentResponse {
  success: boolean;
  assignments: Array<{
    id: string;
    title: string;
    due_date: string | null;
    status: string;
    grade: number | null;
    max_grade: number | null;
    course_id: string;
    platform: string;
    url: string;
  }>;
  courseId: string;
  count: number;
}

/**
 * Make authenticated request to our server
 */
async function makeServerRequest<T>(
  endpoint: string, 
  credentials: PlatformCredentials,
  additionalData: any = {}
): Promise<T> {
  if (!credentials.username || !credentials.password) {
    throw new Error('Username and password are required for server-based authentication');
  }

  const url = `${SERVER_BASE_URL}/api/gradescope${endpoint}`;
  
  console.log(`Making server request to: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: credentials.username,
        password: credentials.password,
        ...additionalData
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Server error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || data.error || 'Server request failed');
    }

    return data as T;
  } catch (error) {
    if (error instanceof Error) {
      // Check for common network errors
      if (error.message.includes('Failed to fetch') || error.message.includes('Network request failed')) {
        throw new Error('Cannot connect to server. Make sure the server is running on 192.168.0.250:3001');
      }
      throw error;
    }
    throw new Error('Unknown error occurred while contacting server');
  }
}

/**
 * Test server connection and authentication
 */
export async function testServerGradescopeConnection(credentials: PlatformCredentials): Promise<boolean> {
  try {
    console.log('Testing server-based Gradescope connection...');
    await makeServerRequest('/test', credentials);
    console.log('Server connection test successful');
    return true;
  } catch (error) {
    console.error('Server connection test failed:', error);
    return false;
  }
}

/**
 * Fetch courses from server
 */
export async function fetchServerGradescopeCourses(
  filterTerm?: string,
  credentials?: PlatformCredentials
): Promise<GradescopeCourseList> {
  if (!credentials) {
    throw new Error('Credentials are required for server-based course fetching');
  }

  try {
    const response = await makeServerRequest<CourseResponse>(
      '/courses', 
      credentials,
      filterTerm ? { term: filterTerm } : {}
    );

    console.log(`Server returned ${response.courses.length} courses`);
    console.log('Course details from server:', response.courses.map(c => `${c.name} - ${c.term}`));

    // Convert server response to expected format
    const result: GradescopeCourseList = {
      student: {},
      instructor: {}
    };

    response.courses.forEach((course, index) => {
      result.student[course.id] = {
        id: course.id,
        name: course.name,
        term: course.term
      };
    });

    return result;
  } catch (error) {
    console.error('Error fetching courses from server:', error);
    throw error;
  }
}

/**
 * Fetch assignments from server
 */
export async function fetchServerGradescopeAssignments(
  courseId: string,
  credentials?: PlatformCredentials
): Promise<GradescopeAssignment[]> {
  if (!credentials) {
    throw new Error('Credentials are required for server-based assignment fetching');
  }

  try {
    const response = await makeServerRequest<AssignmentResponse>(
      '/assignments',
      credentials,
      { courseId }
    );

    console.log(`Server returned ${response.assignments.length} assignments for course ${courseId}`);
    console.log('[DEBUG] First assignment from server:', response.assignments[0]);

    // Convert server response to expected format
    return response.assignments.map(assignment => {
      // Safe date parsing
      let dueDate = null;
      if (assignment.due_date) {
        try {
          console.log(`Parsing due date for ${assignment.title}: "${assignment.due_date}"`);
          
          // Convert Gradescope date format "2025-07-15 23:59:00 -0400" to ISO format
          let dateString = assignment.due_date;
          
          // Check if it's in the format "YYYY-MM-DD HH:mm:ss -HHMM"
          const gradescopeFormat = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) ([-+]\d{4})$/;
          const match = dateString.match(gradescopeFormat);
          
          if (match) {
            // Convert to ISO format: "YYYY-MM-DDTHH:mm:ss-HHMM"
            const [, dateTime, timezone] = match;
            dateString = `${dateTime.replace(' ', 'T')}${timezone.slice(0,3)}:${timezone.slice(3)}`;
            console.log(`Converted to ISO format: "${dateString}"`);
          }
          
          const parsedDate = new Date(dateString);
          console.log(`Parsed date result: ${parsedDate}, isNaN: ${isNaN(parsedDate.getTime())}`);
          if (!isNaN(parsedDate.getTime())) {
            dueDate = parsedDate;
          } else {
            console.warn(`Date parsing failed for ${assignment.title}: "${assignment.due_date}"`);
          }
        } catch (error) {
          console.warn(`Invalid due date for assignment ${assignment.id}:`, assignment.due_date);
        }
      }
      
      return {
        id: assignment.id,
        title: assignment.title,
        due_date: dueDate,
        submissions_status: assignment.status,
        grade: assignment.grade,
        points: assignment.max_grade?.toString() || null,
        submission_id: null, // Not available from server scraping
        _debug_had_due_date: assignment._debug_had_due_date, // Pass through debug info
        _debug_raw_due_date: assignment.due_date // Pass through raw server data
      };
    });
  } catch (error) {
    console.error('Error fetching assignments from server:', error);
    throw error;
  }
}

/**
 * Authenticate using server (for compatibility with existing code)
 */
export async function authenticateServerGradescope(email: string, password: string): Promise<string> {
  try {
    await makeServerRequest('/test', { username: email, password });
    return 'server-authenticated'; // Return a placeholder token
  } catch (error) {
    throw new Error(`Server authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}