// Vercel Cron Job to check for new assignments and send notifications
const { Expo } = require('expo-server-sdk');

// Import our API services
const { fetchCanvasCourses, fetchCanvasAssignments } = require('../lib/canvasService.js');
const { fetchGradescopeCourses, fetchGradescopeAssignments } = require('../lib/gradescopeService.js');

// Create Expo SDK client for sending push notifications
const expo = new Expo();

// In-memory storage for demo (in production, use a database)
let lastKnownAssignments = new Map(); // userId -> assignments array

module.exports = async function handler(req, res) {
  console.log('🔔 Assignment check cron job started');

  try {
    // Verify this is a cron request (optional security)
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // In production, fetch all registered users from database
    // For demo, we'll use mock data
    const registeredUsers = getMockUsers();

    let totalNotificationsSent = 0;
    const results = [];

    for (const user of registeredUsers) {
      try {
        console.log(`Checking assignments for user: ${user.id}`);
        
        const currentAssignments = await fetchUserAssignments(user);
        const lastAssignments = lastKnownAssignments.get(user.id) || [];
        
        // Find new assignments
        const newAssignments = findNewAssignments(currentAssignments, lastAssignments);
        
        if (newAssignments.length > 0) {
          console.log(`Found ${newAssignments.length} new assignments for user ${user.id}`);
          
          // Send notifications for new assignments
          if (user.pushToken && user.notificationPreferences.newAssignments) {
            const sentCount = await sendNewAssignmentNotifications(user.pushToken, newAssignments);
            totalNotificationsSent += sentCount;
          }
        }
        
        // Update stored assignments
        lastKnownAssignments.set(user.id, currentAssignments);
        
        results.push({
          userId: user.id,
          newAssignments: newAssignments.length,
          totalAssignments: currentAssignments.length
        });
        
      } catch (error) {
        console.error(`Error checking assignments for user ${user.id}:`, error.message);
        results.push({
          userId: user.id,
          error: error.message
        });
      }
    }

    console.log(`🔔 Assignment check completed. Sent ${totalNotificationsSent} notifications.`);

    res.status(200).json({
      success: true,
      message: 'Assignment check completed',
      results: results,
      notificationsSent: totalNotificationsSent,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Cron job error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Fetch all assignments for a user across their connected platforms
 */
async function fetchUserAssignments(user) {
  const allAssignments = [];

  for (const platform of user.platforms) {
    try {
      if (platform.id === 'canvas' && platform.credentials?.token) {
        // Fetch Canvas courses and assignments
        const courses = await fetchCanvasCourses('spring 2025', platform.credentials.token);
        
        for (const course of courses) {
          const assignments = await fetchCanvasAssignments(course.id, platform.credentials.token);
          
          // Convert to universal format
          for (const assignment of assignments) {
            allAssignments.push({
              id: `canvas-${assignment.id}`,
              title: assignment.name,
              courseName: course.name,
              dueDate: assignment.due_at,
              platform: 'canvas',
              courseId: course.id,
              createdAt: assignment.created_at
            });
          }
        }
      } else if (platform.id === 'gradescope' && platform.credentials?.username && platform.credentials?.password) {
        // Fetch Gradescope courses and assignments  
        const courses = await fetchGradescopeCourses('spring 2025', platform.credentials);
        
        for (const courseId of Object.keys(courses.courses)) {
          const course = courses.courses[courseId];
          const assignments = await fetchGradescopeAssignments(courseId, platform.credentials);
          
          // Convert to universal format
          for (const assignment of assignments) {
            allAssignments.push({
              id: `gradescope-${assignment.id}`,
              title: assignment.title,
              courseName: course.name,
              dueDate: assignment.due_date,
              platform: 'gradescope',
              courseId: courseId,
              createdAt: new Date().toISOString() // Gradescope doesn't provide created date
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching ${platform.id} assignments:`, error.message);
    }
  }

  return allAssignments;
}

/**
 * Find new assignments by comparing current vs last known
 */
function findNewAssignments(currentAssignments, lastAssignments) {
  const lastIds = new Set(lastAssignments.map(a => a.id));
  return currentAssignments.filter(assignment => !lastIds.has(assignment.id));
}

/**
 * Send push notifications for new assignments
 */
async function sendNewAssignmentNotifications(pushToken, newAssignments) {
  if (!Expo.isExpoPushToken(pushToken)) {
    console.error('Invalid push token:', pushToken);
    return 0;
  }

  const messages = [];

  for (const assignment of newAssignments) {
    const dueText = assignment.dueDate 
      ? new Date(assignment.dueDate).toLocaleDateString('en-US', {
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
      : 'No due date';

    messages.push({
      to: pushToken,
      sound: 'default',
      title: 'New Assignment Posted!',
      body: `${assignment.courseName}: ${assignment.title} (Due ${dueText})`,
      data: {
        type: 'new_assignment',
        assignmentId: assignment.id,
        courseId: assignment.courseId,
        platform: assignment.platform
      },
    });
  }

  try {
    const chunks = expo.chunkPushNotifications(messages);
    let sentCount = 0;

    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      console.log('Notification tickets:', ticketChunk);
      sentCount += chunk.length;
    }

    return sentCount;
  } catch (error) {
    console.error('Error sending push notifications:', error);
    return 0;
  }
}

/**
 * Mock users for demo (in production, fetch from database)
 */
function getMockUsers() {
  return [
    {
      id: 'demo-user-1',
      pushToken: 'ExponentPushToken[demo-token]', // This would be real tokens from registration
      platforms: [
        {
          id: 'canvas',
          credentials: {
            token: '22119~YWmzek7F9JJvAQYZaF3fvhWMhBARYFDZG68cQMuAmKQnVz2QCxheaXwGYaFhPnV2'
          }
        }
      ],
      notificationPreferences: {
        newAssignments: true,
        dueDateReminders: true,
        gradeUpdates: true
      }
    }
    // In production, this would fetch all users from database
  ];
}