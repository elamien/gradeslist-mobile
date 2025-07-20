// Register device tokens for push notifications
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
    const { pushToken, platforms } = req.body;

    if (!pushToken) {
      return res.status(400).json({
        success: false,
        error: 'Push token is required'
      });
    }

    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one platform is required'
      });
    }

    console.log(`Registering push token: ${pushToken.substring(0, 20)}...`);
    console.log(`Platforms: ${platforms.map(p => p.id).join(', ')}`);

    // TODO: Store device token in database with user identification
    // For now, we'll just log it and return success
    
    // In production, you would:
    // 1. Create a unique user ID based on platform credentials
    // 2. Store the push token in a database with user association
    // 3. Associate notification preferences with the user
    
    // For demo purposes, we'll create a simple user identifier
    const userIdentifier = platforms.map(p => `${p.id}:${p.credentials?.username || p.credentials?.token?.substring(0, 10) || 'unknown'}`).join('|');
    
    console.log(`User identifier: ${userIdentifier}`);
    
    // In a real implementation, store this in a database:
    // const user = {
    //   id: userIdentifier,
    //   pushToken: pushToken,
    //   platforms: platforms,
    //   registeredAt: new Date().toISOString(),
    //   notificationPreferences: {
    //     newAssignments: true,
    //     dueDateReminders: true,
    //     gradeUpdates: true
    //   }
    // };
    
    res.status(200).json({
      success: true,
      message: 'Device token registered successfully',
      userIdentifier: userIdentifier,
      registeredPlatforms: platforms.map(p => p.id)
    });

  } catch (error) {
    console.error('Failed to register device token:', error.message);

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to register device token'
    });
  }
}