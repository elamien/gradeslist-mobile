import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// Types for our store
export interface PlatformCredentials {
  username?: string;
  password?: string;
  token?: string;
  cookies?: string;
  lastLogin?: string;
  // New fields for WebView proxy pattern
  proxyReady?: boolean;
  loginData?: any;
}

export interface PlatformConnection {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  isConnected: boolean;
  credentials?: PlatformCredentials;
}

interface AppState {
  // Connection state
  connections: PlatformConnection[];
  credentialsLoaded: boolean; // Track if credentials have been loaded from secure storage
  
  // UI state
  selectedConnection: PlatformConnection | null;
  
  // Settings state
  selectedTerm: string; // e.g., "spring 2025"
  selectedSeason: 'spring' | 'summer' | 'fall' | 'winter';
  selectedYear: number;
  
  // Filter state
  selectedCourseIds: string[]; // Array of course IDs to sync
  showCompletedTasks: boolean;
  
  // Notification state
  notificationsEnabled: boolean;
  notificationPreferences: {
    newAssignments: boolean;
    dueDateReminders: boolean;
    gradeUpdates: boolean;
  };
  pushToken: string | null;
  
  // Actions
  updateConnection: (id: string, updates: Partial<PlatformConnection>) => void;
  connectPlatform: (id: string, credentials: PlatformCredentials) => Promise<void>;
  disconnectPlatform: (id: string) => Promise<void>;
  setSelectedConnection: (connection: PlatformConnection | null) => void;
  setSelectedCourseIds: (courseIds: string[]) => void;
  toggleCourseSelection: (courseId: string) => void;
  setShowCompletedTasks: (show: boolean) => void;
  setSelectedTerm: (season: 'spring' | 'summer' | 'fall' | 'winter', year: number) => void;
  
  // Notification actions
  setNotificationsEnabled: (enabled: boolean) => void;
  updateNotificationPreferences: (preferences: Partial<AppState['notificationPreferences']>) => void;
  setPushToken: (token: string | null) => void;
}

// Initial connection data - only Canvas and Gradescope supported
const initialConnections: PlatformConnection[] = [
  {
    id: 'canvas',
    name: 'Canvas',
    description: 'Connect your Canvas account to sync assignments and grades',
    icon: '🎨',
    color: '#E13F29',
    isConnected: false,
  },
  {
    id: 'gradescope',
    name: 'Gradescope',
    description: 'Link Gradescope to view graded assignments and feedback',
    icon: '📊',
    color: '#3B82F6',
    isConnected: false,
  },
];

// Secure storage helpers
const storeCredentials = async (platformId: string, credentials: PlatformCredentials) => {
  const key = `credentials_${platformId}`;
  await SecureStore.setItemAsync(key, JSON.stringify(credentials));
};

const getCredentials = async (platformId: string): Promise<PlatformCredentials | null> => {
  const key = `credentials_${platformId}`;
  const stored = await SecureStore.getItemAsync(key);
  return stored ? JSON.parse(stored) : null;
};

const removeCredentials = async (platformId: string) => {
  const key = `credentials_${platformId}`;
  await SecureStore.deleteItemAsync(key);
};

export const useAppStore = create<AppState>()(
  persist(
    (set, _get) => ({
      // Initial state
      connections: initialConnections,
      credentialsLoaded: false,
      selectedConnection: null,
      selectedTerm: 'spring 2025',
      selectedSeason: 'spring',
      selectedYear: 2025,
      selectedCourseIds: [],
      showCompletedTasks: false,
      
      // Notification initial state
      notificationsEnabled: false,
      notificationPreferences: {
        newAssignments: true,
        dueDateReminders: true,
        gradeUpdates: true,
      },
      pushToken: null,

      // Actions
      updateConnection: (id, updates) =>
        set((state) => ({
          connections: state.connections.map((conn) =>
            conn.id === id ? { ...conn, ...updates } : conn
          ),
        })),

      connectPlatform: async (id, credentials) => {
        try {
          // Test the connection first
          const { universalAPI } = await import('../integrations/core/api-coordinator');
          const isValid = await universalAPI.testConnection(
            id as 'canvas' | 'gradescope',
            credentials
          );
          
          if (!isValid) {
            throw new Error('Invalid credentials - connection test failed');
          }
          
          // Store credentials securely
          await storeCredentials(id, credentials);
          
          // Update connection state
          set((state) => ({
            connections: state.connections.map((conn) =>
              conn.id === id
                ? { ...conn, isConnected: true, credentials }
                : conn
            ),
            selectedConnection: null,
          }));
        } catch (error) {
          console.error('Failed to connect platform:', error);
          throw error;
        }
      },

      disconnectPlatform: async (id) => {
        try {
          // Remove stored credentials
          await removeCredentials(id);
          
          // Update connection state
          set((state) => ({
            connections: state.connections.map((conn) =>
              conn.id === id
                ? { ...conn, isConnected: false, credentials: undefined }
                : conn
            ),
          }));
        } catch (error) {
          console.error('Failed to disconnect platform:', error);
          throw error;
        }
      },

      setSelectedConnection: (connection) =>
        set({ selectedConnection: connection }),

      setSelectedCourseIds: (courseIds) =>
        set({ selectedCourseIds: courseIds }),

      toggleCourseSelection: (courseId) =>
        set((state) => ({
          selectedCourseIds: state.selectedCourseIds.includes(courseId)
            ? state.selectedCourseIds.filter(id => id !== courseId)
            : [...state.selectedCourseIds, courseId]
        })),

      setShowCompletedTasks: (show) =>
        set({ showCompletedTasks: show }),

      setSelectedTerm: (season, year) => {
        const selectedTerm = `${season} ${year}`;
        set({ 
          selectedTerm,
          selectedSeason: season,
          selectedYear: year
        });
      },

      // Notification actions
      setNotificationsEnabled: (enabled) =>
        set({ notificationsEnabled: enabled }),

      updateNotificationPreferences: (preferences) =>
        set((state) => ({
          notificationPreferences: {
            ...state.notificationPreferences,
            ...preferences
          }
        })),

      setPushToken: (token) =>
        set({ pushToken: token }),
    }),
    {
      name: 'app-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist non-sensitive data
      partialize: (state) => ({
        connections: state.connections.map(conn => ({
          ...conn,
          credentials: undefined, // Don't persist credentials in AsyncStorage
        })),
        selectedTerm: state.selectedTerm,
        selectedSeason: state.selectedSeason,
        selectedYear: state.selectedYear,
        selectedCourseIds: state.selectedCourseIds,
        showCompletedTasks: state.showCompletedTasks,
        notificationsEnabled: state.notificationsEnabled,
        notificationPreferences: state.notificationPreferences,
        pushToken: state.pushToken,
      }),
    }
  )
);

// Initialize credentials from secure storage on app start
export const initializeCredentials = async () => {
  const { connections, updateConnection } = useAppStore.getState();
  
  for (const connection of connections) {
    if (connection.isConnected) {
      try {
        const credentials = await getCredentials(connection.id);
        
        if (credentials) {
          updateConnection(connection.id, { credentials });
        } else {
          // Credentials not found, mark as disconnected
          updateConnection(connection.id, { isConnected: false });
        }
      } catch (error) {
        console.error(`Failed to load credentials for ${connection.id}:`, error);
        updateConnection(connection.id, { isConnected: false });
      }
    }
  }
  
  // Mark credentials as loaded
  useAppStore.setState({ credentialsLoaded: true });
};