const { authenticateGradescope, fetchCourses } = require('../lib/gradescopeService.js');

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
    const { email, password, term } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    console.log(`Fetching courses for ${email}${term ? `, term: ${term}` : ''}`);

    // Authenticate and get session cookies
    const sessionCookies = await authenticateGradescope(email, password);

    // Fetch courses
    const courses = await fetchCourses(sessionCookies, term);

    console.log(`Found ${courses.length} courses`);

    res.status(200).json({
      success: true,
      courses: courses,
      term: term || 'all',
      count: courses.length
    });

  } catch (error) {
    console.error('Failed to fetch courses:', error.message);

    // Return appropriate error status
    const statusCode = error.message.includes('Invalid email or password') ? 401 : 500;

    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to fetch courses'
    });
  }
}