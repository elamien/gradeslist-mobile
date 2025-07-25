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
    credentialsLoaded,
  } = useAppStore();

  // Local state for SQLite data (shows immediately)
  const [cachedAssignments, setCachedAssignments] = useState<StoredAssignment[]>([]);
  const [cacheLoaded, setCacheLoaded] = useState(false);

  // Get connected platforms
  const connectedPlatforms = connections.filter(conn => conn.isConnected);
  
  // Debug: Only log if needed
  // console.log('Hook state:', { credentialsLoaded, connectedCount: connectedPlatforms.length });

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
    enabled: credentialsLoaded && connectedPlatforms.length > 0 && selectedCourseIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  });

  // Local state for processed assignments 
  const [processedAssignments, setProcessedAssignments] = useState<StoredAssignment[]>([]);

  // Save fresh data to SQLite when it arrives
  useEffect(() => {
    const saveFreshData = async () => {
      if (!freshAssignments) return;

      try {
        // Convert to StoredAssignment format
        const storedAssignments: StoredAssignment[] = freshAssignments.map(assignment => ({
          id: assignment.id,
          title: assignment.title,
          courseName: assignment.course_name || assignment.courseName || 'Unknown Course',
          courseId: assignment.course_id || assignment.courseId || assignment.id.split('-')[0],
          dueDate: assignment.due_date || assignment.dueDate,
          platform: assignment.platform || 'gradescope',
          status: assignment.status || assignment.submissions_status || 'unknown',
          score: assignment.score || assignment.grade || null,
          maxPoints: assignment.max_points || assignment.maxPoints || assignment.points || null,
          isGraded: (assignment.status === 'graded') || (assignment.submissions_status === 'Graded'),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));

        // Save to SQLite
        await databaseService.saveAssignments(storedAssignments);
        
        // Update both cached and processed state
        setCachedAssignments(storedAssignments);
        setProcessedAssignments(storedAssignments);
        
        console.log(`Saved ${storedAssignments.length} assignments to SQLite`);
      } catch (error) {
        console.error('Failed to save assignments to SQLite:', error);
      }
    };

    saveFreshData();
  }, [freshAssignments]);

  // Return offline-first data - use processed assignments when available
  const finalAssignments = processedAssignments.length > 0 ? processedAssignments : cachedAssignments;
  
  return {
    // Data: Use processed data if available, fallback to cached
    assignments: finalAssignments,
    
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
      processed: processedAssignments.length,
      usingCache: processedAssignments.length === 0 && cachedAssignments.length > 0,
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
      return assignment.status !== 'graded' && (assignment.score === null || assignment.score === undefined);
    }
  });

  // Debug: Log what we're returning to the UI
  if (!filter.isGraded && filteredAssignments.length > 0) {
    console.log('Due assignments being returned:', filteredAssignments.slice(0, 3).map(a => ({
      title: a.title,
      courseName: a.courseName,
      dueDate: a.dueDate,
      score: a.score,
      status: a.status
    })));
  }

  return {
    assignments: filteredAssignments,
    ...rest,
  };
}