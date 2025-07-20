const axios = require('axios');

// Configuration
const CANVAS_BASE_URL = 'https://canvas.its.virginia.edu';

// Create axios instance for Canvas API
const canvasClient = axios.create({
  baseURL: CANVAS_BASE_URL,
  timeout: 5000, // 5 second timeout for mobile networks
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

/**
 * Core API helper function for Canvas requests
 */
async function makeCanvasRequest(endpoint, apiToken) {
  try {
    console.log(`Making Canvas API request: ${endpoint}`);
    
    const response = await canvasClient.get(endpoint, {
      headers: {
        'Authorization': `Bearer ${apiToken}`
      }
    });
    
    if (response.status === 200) {
      console.log(`Canvas API request successful: ${endpoint}`);
      return response.data;
    } else {
      throw new Error(`Canvas API returned status ${response.status}`);
    }
  } catch (error) {
    console.error(`Canvas API error for ${endpoint}:`, error.message);
    
    if (error.response) {
      if (error.response.status === 401) {
        throw new Error('Invalid Canvas API token or unauthorized access');
      } else if (error.response.status === 404) {
        throw new Error('Canvas resource not found');
      } else {
        throw new Error(`Canvas API error: ${error.response.status} ${error.response.statusText}`);
      }
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Canvas API request timed out');
    } else {
      throw new Error(`Canvas API request failed: ${error.message}`);
    }
  }
}

/**
 * Fetch Canvas courses with term filtering
 */
async function fetchCanvasCourses(filterTerm, apiToken) {
  try {
    console.log(`Fetching Canvas courses${filterTerm ? ` for term: ${filterTerm}` : ''}`);
    
    // Only fetch essential course fields to reduce payload size
    const endpoint = '/api/v1/courses?enrollment_state=active&include[]=term&per_page=100&only[]=id,name,course_code,term';
    const courses = await makeCanvasRequest(endpoint, apiToken);
    
    // Filter by term if specified
    let filteredCourses = courses;
    if (filterTerm) {
      const filterWords = filterTerm.toLowerCase().split(/\s+/).filter(word => word.length > 0);
      filteredCourses = courses.filter(course => {
        if (!course.term?.name) return false;
        const termNameLower = course.term.name.toLowerCase();
        return filterWords.every(word => termNameLower.includes(word));
      });
    }
    
    // Filter out courses without names
    const validCourses = filteredCourses.filter(course => course.name);
    
    console.log(`Found ${validCourses.length} Canvas courses`);
    return validCourses;
    
  } catch (error) {
    console.error('Error fetching Canvas courses:', error.message);
    throw error;
  }
}

/**
 * Fetch Canvas assignments for a specific course
 */
async function fetchCanvasAssignments(courseId, apiToken) {
  try {
    console.log(`Fetching Canvas assignments for course ${courseId}`);
    
    // Optimize Canvas API request - only request essential fields, increase page size
    const endpoint = `/api/v1/courses/${courseId}/assignments?include[]=submission&per_page=200&order_by=due_at&only[]=id,name,due_at,points_possible,submission`;
    const assignments = await makeCanvasRequest(endpoint, apiToken);
    
    console.log(`Found ${assignments.length} Canvas assignments for course ${courseId}`);
    return assignments;
    
  } catch (error) {
    console.error(`Error fetching Canvas assignments for course ${courseId}:`, error.message);
    throw error;
  }
}

/**
 * Validate Canvas API token by fetching user profile
 */
async function fetchCanvasUserProfile(apiToken) {
  try {
    console.log('Validating Canvas API token...');
    
    const userProfile = await makeCanvasRequest('/api/v1/users/self', apiToken);
    
    console.log('Canvas API token validation successful');
    return userProfile;
    
  } catch (error) {
    console.error('Canvas API token validation failed:', error.message);
    throw error;
  }
}

module.exports = {
  fetchCanvasCourses,
  fetchCanvasAssignments,
  fetchCanvasUserProfile
};