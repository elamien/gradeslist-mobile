// Import Canvas API functions from canvasService
const { fetchCanvasAssignments } = require('../lib/canvasService.js');

module.exports = async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use POST.' 
    });
  }

  try {
    const { apiToken, courseId } = req.body;

    if (!apiToken) {
      return res.status(400).json({
        success: false,
        error: 'Canvas API token is required'
      });
    }

    if (!courseId) {
      return res.status(400).json({
        success: false,
        error: 'Course ID is required'
      });
    }

    console.log(`Fetching Canvas assignments for course ${courseId}`);

    // Use Canvas API function
    const assignments = await fetchCanvasAssignments(courseId, apiToken);

    console.log(`Found ${assignments.length} Canvas assignments for course ${courseId}`);

    res.status(200).json({
      success: true,
      assignments: assignments,
      courseId: courseId,
      count: assignments.length,
      platform: 'canvas'
    });

  } catch (error) {
    console.error(`Failed to fetch Canvas assignments for course ${req.body.courseId}:`, error.message);

    // Return appropriate error status
    const statusCode = error.message.includes('Unauthorized') || 
                      error.message.includes('Invalid access token') ? 401 : 500;

    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to fetch Canvas assignments',
      platform: 'canvas'
    });
  }
}