const { fetchGradescopeAssignments } = require('../../api-extraction/gradescope-api');

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

    console.log(`Fetching assignments for course ${courseId} using working logic...`);

    // Use the exact working logic from test-due-dates.js
    const assignments = await fetchGradescopeAssignments(courseId, { email, password });

    console.log(`Found ${assignments.length} assignments with working date parsing`);

    // Convert to the format expected by the mobile app
    const formattedAssignments = assignments.map(assignment => ({
      id: assignment.id,
      title: assignment.title,
      due_date: assignment.due_date ? assignment.due_date.toISO() : null, // Convert Luxon DateTime to ISO string
      submissions_status: assignment.submissions_status,
      grade: assignment.grade,
      points: assignment.points,
      submission_id: assignment.submission_id,
      status: assignment.submissions_status,
      course_id: courseId,
      platform: 'gradescope',
      url: `/courses/${courseId}/assignments/${assignment.id}`,
      _debug_had_due_date: !!assignment.due_date
    }));

    res.status(200).json({
      success: true,
      assignments: formattedAssignments,
      courseId: courseId,
      count: formattedAssignments.length
    });

  } catch (error) {
    console.error('Working assignments endpoint failed:', error.message);

    // Return appropriate error status
    const statusCode = error.message.includes('Invalid email or password') ? 401 : 500;

    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to fetch assignments'
    });
  }
}