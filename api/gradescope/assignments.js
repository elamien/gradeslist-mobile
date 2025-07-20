const { authenticateGradescope, fetchAssignments } = require('../lib/gradescopeService.js');

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
    const { email, password, courseId } = req.body;

    if (!email || !password || !courseId) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and courseId are required'
      });
    }

    console.log(`Fetching assignments for ${email}, course: ${courseId}`);

    // Authenticate and get session cookies
    const sessionCookies = await authenticateGradescope(email, password);

    // Fetch assignments for the specific course
    const assignments = await fetchAssignments(sessionCookies, courseId);

    console.log(`Found ${assignments.length} assignments`);

    res.status(200).json({
      success: true,
      assignments: assignments,
      courseId: courseId,
      count: assignments.length
    });

  } catch (error) {
    console.error('Failed to fetch assignments:', error.message);

    // Return appropriate error status
    const statusCode = error.message.includes('Invalid email or password') ? 401 : 500;

    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to fetch assignments'
    });
  }
}