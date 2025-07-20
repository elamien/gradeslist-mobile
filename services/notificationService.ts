import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useAppStore } from '../store/useAppStore';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface NotificationPreferences {
  enabled: boolean;
  newAssignments: boolean;
  dueDateReminders: boolean;
  gradeUpdates: boolean;
}

export class NotificationService {
  /**
   * Register for push notifications and get device token
   */
  static async registerForPushNotifications(): Promise<string | null> {
    try {
      // Check if device supports push notifications
      if (!Device.isDevice) {
        console.log('Push notifications only work on physical devices');
        return null;
      }

      // Get existing permission status
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permission if not already granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }

      // Get the push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || 'gradeslist-mobile';
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });

      console.log('Push token obtained:', tokenData.data);

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      return tokenData.data;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Send device token to our server to enable notifications
   */
  static async updateDeviceToken(pushToken: string): Promise<boolean> {
    try {
      // Get connected platform credentials for user identification
      const { connections } = useAppStore.getState();
      const connectedPlatforms = connections.filter(conn => conn.isConnected);
      
      if (connectedPlatforms.length === 0) {
        console.log('No connected platforms, skipping token update');
        return false;
      }

      // Send token to our notification service
      const response = await fetch('https://gradeslist-mobile.vercel.app/api/notifications/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pushToken,
          platforms: connectedPlatforms.map(platform => ({
            id: platform.id,
            credentials: platform.credentials,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to register device token: ${response.status}`);
      }

      const result = await response.json();
      console.log('Device token registered successfully:', result);
      return true;
    } catch (error) {
      console.error('Failed to update device token:', error);
      return false;
    }
  }

  /**
   * Initialize notification service
   */
  static async initialize(): Promise<void> {
    try {
      console.log('Initializing notification service...');

      // Register for push notifications
      const pushToken = await this.registerForPushNotifications();
      
      if (pushToken) {
        // Update device token on server
        await this.updateDeviceToken(pushToken);
      }

      // Set up notification listeners
      this.setupNotificationListeners();

      console.log('Notification service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  }

  /**
   * Set up notification event listeners
   */
  static setupNotificationListeners(): void {
    // Handle notification received while app is in foreground
    Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Handle notification response (when user taps notification)
    Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      
      // Navigate to relevant screen based on notification data
      const notificationData = response.notification.request.content.data;
      
      if (notificationData?.type === 'new_assignment') {
        // Navigate to Due tab
        console.log('Navigate to Due tab for new assignment');
      } else if (notificationData?.type === 'grade_update') {
        // Navigate to Grades tab
        console.log('Navigate to Grades tab for grade update');
      }
    });
  }

  /**
   * Request notification permissions explicitly
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Get current notification permission status
   */
  static async getPermissionStatus(): Promise<string> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status;
    } catch (error) {
      console.error('Error getting notification permission status:', error);
      return 'undetermined';
    }
  }

  /**
   * Send a local test notification
   */
  static async sendTestNotification(): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'GradesList Test',
          body: 'Notifications are working! 🎉',
          data: { type: 'test' },
        },
        trigger: { seconds: 1 },
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  }
}