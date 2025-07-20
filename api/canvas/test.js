// Import Canvas API functions from canvasService
const { fetchCanvasUserProfile } = require('../lib/canvasService.js');

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
    const { apiToken } = req.body;

    if (!apiToken) {
      return res.status(400).json({
        success: false,
        error: 'Canvas API token is required'
      });
    }

    console.log('Testing Canvas API token...');

    // Use Canvas API function to validate token
    const userProfile = await fetchCanvasUserProfile(apiToken);

    console.log('Canvas API token validation successful');

    res.status(200).json({
      success: true,
      message: 'Canvas API token validation successful',
      user: {
        id: userProfile.id,
        name: userProfile.name,
        email: userProfile.email
      },
      platform: 'canvas'
    });

  } catch (error) {
    console.error('Canvas API token validation failed:', error.message);

    // Return appropriate error status
    const statusCode = error.message.includes('Unauthorized') || 
                      error.message.includes('Invalid access token') || 
                      error.message.includes('Invalid Canvas API token') ? 401 : 500;

    res.status(statusCode).json({
      success: false,
      error: error.message || 'Canvas API token validation failed',
      platform: 'canvas'
    });
  }
}