// Mobile-compatible Canvas API
// Based on the original canvas-api.ts but optimized for React Native

import { PlatformCredentials } from '../store/useAppStore';
import { CanvasAssignment, CanvasCourse } from './canvas-api';

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
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
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

// Core function to fetch courses - supports both direct API and server-based calls
export async function fetchCanvasCourses(filterTerm: string, apiTokenOrCredentials: string | PlatformCredentials): Promise<CanvasCourse[]> {
  try {
    // Check if this is server-based authentication
    if (typeof apiTokenOrCredentials === 'object' && apiTokenOrCredentials.token) {
      console.log('Using server-based Canvas course fetching');
      try {
        const { fetchServerCanvasCourses } = await import('./server-canvas-api');
        const courses = await fetchServerCanvasCourses(filterTerm, apiTokenOrCredentials);
        console.log('Got Canvas courses from server:', courses);
        return courses;
      } catch (error) {
        console.error('Error fetching Canvas courses from server:', error);
        throw error;
      }
    }
    
    // Direct Canvas API call
    const apiToken = typeof apiTokenOrCredentials === 'string' ? apiTokenOrCredentials : apiTokenOrCredentials.token || '';
    if (!apiToken) {
      throw new Error('Canvas API token is required');
    }
    
    // Only fetch essential course fields to reduce payload size
    const courses = await makeCanvasRequest('/api/v1/courses?enrollment_state=active&include[]=term&per_page=100&only[]=id,name,course_code,term', apiToken);
    
    const filterWords = filterTerm.toLowerCase().split(/\s+/).filter(word => word.length > 0);
    const filteredCourses = courses.filter((course: any) => {
      if (!course.term?.name) return false;
      const termNameLower = course.term.name.toLowerCase();
      return filterWords.every(word => termNameLower.includes(word));
    });

    return filteredCourses.filter((course: any) => course.name) as CanvasCourse[];
  } catch (error) {
    console.error('Canvas API error:', error);
    throw error;
  }
}

// Core function to fetch assignments - supports both direct API and server-based calls
export async function fetchCanvasAssignments(courseId: number | string, apiTokenOrCredentials: string | PlatformCredentials): Promise<CanvasAssignment[]> {
  try {
    // Check if this is server-based authentication
    if (typeof apiTokenOrCredentials === 'object' && apiTokenOrCredentials.token) {
      console.log('Using server-based Canvas assignment fetching');
      try {
        const { fetchServerCanvasAssignments } = await import('./server-canvas-api');
        const assignments = await fetchServerCanvasAssignments(courseId.toString(), apiTokenOrCredentials);
        console.log('Got Canvas assignments from server:', assignments);
        return assignments;
      } catch (error) {
        console.error('Error fetching Canvas assignments from server:', error);
        throw error;
      }
    }
    
    // Direct Canvas API call
    const apiToken = typeof apiTokenOrCredentials === 'string' ? apiTokenOrCredentials : apiTokenOrCredentials.token || '';
    if (!apiToken) {
      throw new Error('Canvas API token is required');
    }
    
    // Optimize Canvas API request - only request essential fields, increase page size
    const assignmentsEndpoint = `/api/v1/courses/${courseId}/assignments?include[]=submission&per_page=200&order_by=due_at&only[]=id,name,due_at,points_possible,submission`;
    const assignments = await makeCanvasRequest(assignmentsEndpoint, apiToken);
    return assignments as CanvasAssignment[];
  } catch (error) {
    console.error('Canvas API error:', error);
    throw error;
  }
}

// Core function to validate token
export async function fetchCanvasUserProfile(apiToken: string): Promise<any> {
  try {
    return await makeCanvasRequest('/api/v1/users/self', apiToken);
  } catch (error) {
    console.error('Canvas API error:', error);
    throw error;
  }
}

// Test Canvas connection - supports both direct API and server-based calls
export async function testCanvasConnection(apiTokenOrCredentials: string | PlatformCredentials): Promise<boolean> {
  try {
    // Check if this is server-based authentication
    if (typeof apiTokenOrCredentials === 'object' && apiTokenOrCredentials.token) {
      console.log('Testing server-based Canvas connection');
      try {
        const { testServerCanvasConnection } = await import('./server-canvas-api');
        return await testServerCanvasConnection(apiTokenOrCredentials);
      } catch (error) {
        console.error('Server Canvas connection test error:', error);
        return false;
      }
    }
    
    // Direct Canvas API call
    const apiToken = typeof apiTokenOrCredentials === 'string' ? apiTokenOrCredentials : apiTokenOrCredentials.token || '';
    if (!apiToken) {
      return false;
    }
    
    await fetchCanvasUserProfile(apiToken);
    return true;
  } catch (_error) {
    return false;
  }
}