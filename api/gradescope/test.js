import { authenticateGradescope } from '../lib/gradescopeService.js';

export default async function handler(req, res) {
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
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    console.log(`Testing Gradescope authentication for ${email}...`);

    // Attempt to authenticate
    const sessionCookies = await authenticateGradescope(email, password);

    console.log('Authentication successful');

    res.status(200).json({
      success: true,
      message: 'Gradescope authentication successful'
    });

  } catch (error) {
    console.error('Authentication test failed:', error.message);

    // Return appropriate error status
    const statusCode = error.message.includes('Invalid email or password') ? 401 : 500;

    res.status(statusCode).json({
      success: false,
      error: error.message || 'Authentication failed'
    });
  }
}