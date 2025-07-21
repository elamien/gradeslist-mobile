import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { databaseService, StoredAssignment } from '../services/databaseService';
import { universalAPI } from '../integrations/mobile-universal-api';
import { useAppStore } from '../store/useAppStore';

/**
 * Hook that implements offline-first assignment loading
 * 1. Shows cached SQLite data immediately
 * 2. Fetches fresh data from APIs
 * 3. Updates SQLite cache
 * 4. Returns combined data with loading states
 */
export function useOfflineAssignments() {
  const {
    connections,
    selectedTerm,
    selectedCourseIds,
  } = useAppStore();

  // Local state for SQLite data (shows immediately)
  const [cachedAssignments, setCachedAssignments] = useState<StoredAssignment[]>([]);
  const [cacheLoaded, setCacheLoaded] = useState(false);

  // Get connected platforms
  const connectedPlatforms = connections.filter(conn => conn.isConnected);
  
  console.log('All connections:', connections);
  console.log('Connected platforms:', connectedPlatforms);

  // Load cached assignments from SQLite on mount
  useEffect(() => {
    const loadCachedData = async () => {
      try {
        // Ensure database is initialized first
        await databaseService.initialize();
        const assignments = await databaseService.getAssignments();
        setCachedAssignments(assignments);
        setCacheLoaded(true);
        console.log(`Loaded ${assignments.length} cached assignments from SQLite`);
      } catch (error) {
        console.error('Failed to load cached assignments:', error);
        setCacheLoaded(true); // Continue even if cache fails
      }
    };

    loadCachedData();
  }, []);

  // React Query for fresh data from APIs
  const {
    data: freshAssignments,
    isLoading: isFetching,
    error: fetchError,
    refetch,
  } = useQuery({
    queryKey: ['assignments', selectedTerm, selectedCourseIds, connectedPlatforms.length],
    queryFn: async () => {
      console.log('Fetching fresh assignments from APIs...');
      
      const allAssignments: any[] = [];

      // Fetch from each connected platform
      for (const connection of connectedPlatforms) {
        try {
          console.log(`Connection details for ${connection.id}:`, {
            isConnected: connection.isConnected,
            hasCredentials: !!connection.credentials,
            credentials: connection.credentials ? 'present' : 'missing'
          });
          
          if (!connection.credentials) {
            console.error(`No credentials found for ${connection.id}`);
            continue;
          }
          
          const assignments = await universalAPI.getAssignments(
            connection.id as 'canvas' | 'gradescope',
            connection.credentials,
            selectedTerm,
            selectedCourseIds
          );
          allAssignments.push(...assignments);
        } catch (error) {
          console.error(`Failed to fetch ${connection.id} assignments:`, error);
          // Continue with other platforms
        }
      }

      console.log(`Fetched ${allAssignments.length} fresh assignments from APIs`);
      return allAssignments;
    },
    enabled: connectedPlatforms.length > 0 && selectedCourseIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  });

  // Save fresh data to SQLite when it arrives
  useEffect(() => {
    const saveFreshData = async () => {
      if (!freshAssignments) return;

      try {
        // Convert to StoredAssignment format with debugging
        const storedAssignments: StoredAssignment[] = freshAssignments.map(assignment => {
          console.log('Processing assignment for storage:', {
            title: assignment.title,
            course_name: assignment.course_name,
            courseName: assignment.courseName,
            grade: assignment.grade,
            score: assignment.score,
            max_grade: assignment.max_grade,
            max_points: assignment.max_points,
            maxPoints: assignment.maxPoints,
            points: assignment.points
          });
          
          const processed = {
            id: assignment.id,
            title: assignment.title,
            courseName: assignment.course_name || assignment.courseName || 'Unknown Course',
            courseId: assignment.course_id || assignment.courseId || assignment.id.split('-')[0],
            dueDate: assignment.due_date || assignment.dueDate,
            platform: assignment.platform || 'gradescope',
            status: assignment.status || assignment.submissions_status || 'unknown',
            score: assignment.grade || assignment.score,
            maxPoints: assignment.max_grade || assignment.max_points || assignment.maxPoints || assignment.points,
            isGraded: (assignment.status === 'graded') || (assignment.submissions_status === 'Graded'),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          console.log('Processed assignment:', {
            title: processed.title,
            courseName: processed.courseName,
            score: processed.score,
            maxPoints: processed.maxPoints
          });
          
          return processed;
        });

        // Save to SQLite
        await databaseService.saveAssignments(storedAssignments);
        
        // Update cached state
        setCachedAssignments(storedAssignments);
        
        console.log(`Saved ${storedAssignments.length} assignments to SQLite`);
      } catch (error) {
        console.error('Failed to save assignments to SQLite:', error);
      }
    };

    saveFreshData();
  }, [freshAssignments]);

  // Return offline-first data
  return {
    // Data: Use fresh data if available, fallback to cached
    assignments: freshAssignments || cachedAssignments,
    
    // Loading states
    isLoading: !cacheLoaded, // Only show loading spinner if cache not loaded yet
    isFetching: isFetching, // Background refresh indicator
    
    // Cache status
    hasCachedData: cachedAssignments.length > 0,
    cacheLoaded,
    
    // Error handling
    error: fetchError,
    
    // Manual refresh
    refetch,
    
    // Stats
    stats: {
      cached: cachedAssignments.length,
      fresh: freshAssignments?.length || 0,
      usingCache: !freshAssignments && cachedAssignments.length > 0,
    },
  };
}

/**
 * Hook for filtered assignments (due vs graded)
 */
export function useFilteredAssignments(filter: { isGraded: boolean }) {
  const { assignments, ...rest } = useOfflineAssignments();
  
  const filteredAssignments = assignments.filter(assignment => {
    if (filter.isGraded) {
      return assignment.status === 'graded' || assignment.score !== null;
    } else {
      return assignment.status !== 'graded' && assignment.score === null;
    }
  });

  return {
    assignments: filteredAssignments,
    ...rest,
  };
}