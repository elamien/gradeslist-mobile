// Test endpoint to manually trigger notification check
const checkAssignments = require('../cron/check-assignments.js');

module.exports = async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    console.log('🧪 Manual notification test triggered');
    
    // Simulate cron request with auth header
    const mockRequest = {
      ...req,
      headers: {
        ...req.headers,
        authorization: `Bearer ${process.env.CRON_SECRET || 'test-secret'}`
      }
    };

    // Create a mock response object to capture the cron result
    let cronResult = null;
    const mockResponse = {
      status: (code) => ({
        json: (data) => {
          cronResult = { statusCode: code, data };
          return mockResponse;
        }
      }),
      setHeader: () => mockResponse
    };

    // Call the cron function
    await checkAssignments(mockRequest, mockResponse);

    res.status(200).json({
      success: true,
      message: 'Notification test completed',
      cronResult: cronResult,
      timestamp: new Date().toISOString(),
      note: 'This manually triggered the assignment checking logic'
    });

  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      note: 'Manual notification test failed'
    });
  }
}