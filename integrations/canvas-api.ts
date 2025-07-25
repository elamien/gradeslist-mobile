// Canvas API - Core Data Structures and Functions
// Extracted from: canvas-fetch/canvas-fetch.ts

// Core Canvas Assignment interface
export interface CanvasAssignment {
  id: number;
  name: string | null;
  due_at: string | null;              // Single datetime string
  points_possible: number | null;
  submission?: {
    workflow_state: string | null;
    score: number | null;
    submitted_at: string | null;      // Single datetime string
  } | null;
}

// Core Canvas Course interface
export interface CanvasCourse {
  id: number;
  name: string;
  term?: {
    id: number;
    name: string;
  };
  course_code?: string;
}

// Configuration
const CANVAS_BASE_URL = 'https://canvas.its.virginia.edu';

// Request cache to avoid duplicate API calls
const requestCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Request deduplication - prevent duplicate requests in flight
const pendingRequests = new Map<string, Promise<any>>();

// Core API helper function with caching
async function makeCanvasRequest(endpoint: string, apiToken: string) {
  const cacheKey = `${endpoint}:${apiToken.slice(-10)}`; // Use last 10 chars of token for cache key
  
  // Check cache first
  const cached = requestCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    return cached.data;
  }
  
  // Check if request is already in flight
  const pendingRequest = pendingRequests.get(cacheKey);
  if (pendingRequest) {
    return await pendingRequest;
  }
  
  const url = `${CANVAS_BASE_URL}${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${apiToken}`,
    'Accept': 'application/json+canvas-string-ids',
    'Accept-Encoding': 'gzip, deflate, br',
    'User-Agent': 'GradesList/1.0',
    'Cache-Control': 'no-cache'
  };
  
  // Create and store the request promise
  const requestPromise = (async () => {
    // Add timeout using AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout (reduced from 5s)
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: headers,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Canvas API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Cache the result
      requestCache.set(cacheKey, { data, timestamp: Date.now() });
      
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Canvas API request timed out');
      }
      throw error;
    } finally {
      // Clean up pending request
      pendingRequests.delete(cacheKey);
    }
  })();
  
  // Store the request promise
  pendingRequests.set(cacheKey, requestPromise);
  
  return await requestPromise;
}

// Core function to fetch courses
export async function fetchCanvasCourses(filterTerm: string, apiToken: string): Promise<CanvasCourse[]> {
  // Only fetch essential course fields to reduce payload size
  const courses = await makeCanvasRequest('/api/v1/courses?enrollment_state=active&include[]=term&per_page=100&only[]=id,name,course_code,term', apiToken);
  
  const filterWords = filterTerm.toLowerCase().split(/\s+/).filter(word => word.length > 0);
  const filteredCourses = courses.filter((course: any) => {
    if (!course.term?.name) return false;
    const termNameLower = course.term.name.toLowerCase();
    return filterWords.every(word => termNameLower.includes(word));
  });

  return filteredCourses.filter((course: any) => course.name) as CanvasCourse[];
}

// Core function to fetch assignments
export async function fetchCanvasAssignments(courseId: number | string, apiToken: string): Promise<CanvasAssignment[]> {
  // Optimize Canvas API request - only request essential fields, increase page size
  const assignmentsEndpoint = `/api/v1/courses/${courseId}/assignments?include[]=submission&per_page=200&order_by=due_at&only[]=id,name,due_at,points_possible,submission`;
  const assignments = await makeCanvasRequest(assignmentsEndpoint, apiToken);
  return assignments as CanvasAssignment[];
}

// Core function to validate token
export async function fetchCanvasUserProfile(apiToken: string): Promise<any> {
  return await makeCanvasRequest('/api/v1/users/self', apiToken);
}