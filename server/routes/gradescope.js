const express = require('express');
const router = express.Router();
const { authenticateGradescope, fetchCourses, fetchAssignments } = require('../services/gradescopeService');

// Load environment variables
require('dotenv').config();

// Test endpoint with env credentials  
router.get('/debug-assignments/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    const email = process.env.GRADESCOPE_TEST_EMAIL;
    const password = process.env.GRADESCOPE_TEST_PASSWORD;
    
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Test credentials not configured in environment' 
      });
    }

    console.log(`Debug: Fetching assignments for course ${courseId}`);
    const sessionCookies = await authenticateGradescope(email, password);
    const assignments = await fetchAssignments(sessionCookies, courseId);
    
    res.json({ 
      success: true, 
      assignments,
      courseId,
      count: assignments.length
    });
  } catch (error) {
    console.error('Debug assignments error:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch assignments', 
      message: error.message 
    });
  }
});

// Test connection endpoint
router.post('/test', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }

    console.log(`Testing Gradescope connection for ${email}`);
    const sessionCookies = await authenticateGradescope(email, password);
    
    res.json({ 
      success: true, 
      message: 'Authentication successful',
      hasSession: !!sessionCookies
    });
  } catch (error) {
    console.error('Test connection error:', error.message);
    res.status(401).json({ 
      error: 'Authentication failed', 
      message: error.message 
    });
  }
});

// Fetch courses endpoint
router.post('/courses', async (req, res) => {
  try {
    const { email, password, term } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }

    console.log(`Fetching courses for ${email}, term: ${term || 'all'}`);
    
    // Authenticate first
    const sessionCookies = await authenticateGradescope(email, password);
    
    // Fetch courses
    const courses = await fetchCourses(sessionCookies, term);
    
    console.log(`Found ${courses.length} courses`);
    
    res.json({ 
      success: true, 
      courses: courses,
      term: term || 'all',
      count: courses.length
    });
  } catch (error) {
    console.error('Fetch courses error:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch courses', 
      message: error.message 
    });
  }
});

// Fetch assignments endpoint
router.post('/assignments', async (req, res) => {
  try {
    const { email, password, courseId, term } = req.body;
    
    if (!email || !password || !courseId) {
      return res.status(400).json({ 
        error: 'Email, password, and courseId are required' 
      });
    }

    console.log(`Fetching assignments for ${email}, course: ${courseId}`);
    
    // Authenticate first
    const sessionCookies = await authenticateGradescope(email, password);
    
    // Fetch assignments
    const assignments = await fetchAssignments(sessionCookies, courseId);
    
    console.log(`Found ${assignments.length} assignments`);
    
    res.json({ 
      success: true, 
      assignments: assignments,
      courseId: courseId,
      count: assignments.length
    });
  } catch (error) {
    console.error('Fetch assignments error:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch assignments', 
      message: error.message 
    });
  }
});

// Fetch all data endpoint (courses + assignments)
router.post('/all', async (req, res) => {
  try {
    const { email, password, term } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }

    console.log(`Fetching all data for ${email}, term: ${term || 'all'}`);
    
    // Authenticate first
    const sessionCookies = await authenticateGradescope(email, password);
    
    // Fetch courses
    const courses = await fetchCourses(sessionCookies, term);
    
    // Fetch assignments for each course
    const coursesWithAssignments = await Promise.all(
      courses.map(async (course) => {
        try {
          const assignments = await fetchAssignments(sessionCookies, course.id);
          return {
            ...course,
            assignments: assignments
          };
        } catch (error) {
          console.error(`Error fetching assignments for course ${course.id}:`, error.message);
          return {
            ...course,
            assignments: [],
            error: 'Failed to fetch assignments'
          };
        }
      })
    );
    
    const totalAssignments = coursesWithAssignments.reduce((total, course) => total + course.assignments.length, 0);
    
    console.log(`Found ${courses.length} courses with ${totalAssignments} total assignments`);
    
    res.json({ 
      success: true, 
      courses: coursesWithAssignments,
      term: term || 'all',
      summary: {
        courseCount: courses.length,
        assignmentCount: totalAssignments
      }
    });
  } catch (error) {
    console.error('Fetch all data error:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch data', 
      message: error.message 
    });
  }
});

module.exports = router;