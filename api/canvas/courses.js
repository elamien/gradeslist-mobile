// Import Canvas API functions from canvasService
const { fetchCanvasCourses } = require('../lib/canvasService.js');

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
    const { apiToken, term } = req.body;

    if (!apiToken) {
      return res.status(400).json({
        success: false,
        error: 'Canvas API token is required'
      });
    }

    console.log(`Fetching Canvas courses${term ? ` for term: ${term}` : ''}`);

    // Use Canvas API function
    const courses = await fetchCanvasCourses(term || '', apiToken);

    console.log(`Found ${courses.length} Canvas courses`);

    res.status(200).json({
      success: true,
      courses: courses,
      term: term || 'all',
      count: courses.length,
      platform: 'canvas'
    });

  } catch (error) {
    console.error('Failed to fetch Canvas courses:', error.message);

    // Return appropriate error status
    const statusCode = error.message.includes('Unauthorized') || 
                      error.message.includes('Invalid access token') ? 401 : 500;

    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to fetch Canvas courses',
      platform: 'canvas'
    });
  }
}