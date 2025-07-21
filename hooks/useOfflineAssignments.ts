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

  // Save fresh data to SQLite when it arrives
  useEffect(() => {
    const saveFreshData = async () => {
      if (!freshAssignments) return;

      try {
        // Convert to StoredAssignment format with debugging
        const storedAssignments: StoredAssignment[] = freshAssignments.map(assignment => {
          console.log('[HOOK DEBUG] Raw assignment received:', {
            title: assignment.title,
            course_name: assignment.course_name,
            courseName: assignment.courseName,
            due_date: assignment.due_date,
            dueDate: assignment.dueDate,
            score: assignment.score,
            max_points: assignment.max_points
          });
          
          const processed = {
            id: assignment.id,
            title: assignment.title,
            courseName: assignment.course_name || assignment.courseName || 'Unknown Course',
            courseId: assignment.course_id || assignment.courseId || assignment.id.split('-')[0],
            dueDate: assignment.due_date || assignment.dueDate,
            platform: assignment.platform || 'gradescope',
            status: assignment.status || assignment.submissions_status || 'unknown',
            score: assignment.score || assignment.grade,
            maxPoints: assignment.max_points || assignment.maxPoints || assignment.points,
            isGraded: (assignment.status === 'graded') || (assignment.submissions_status === 'Graded'),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          console.log('[HOOK DEBUG] Processed assignment:', {
            title: processed.title,
            courseName: processed.courseName,
            dueDate: processed.dueDate,
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
  console.log('Hook returning data:', {
    freshCount: freshAssignments?.length || 0,
    cachedCount: cachedAssignments.length,
    usingFresh: !!freshAssignments,
    sampleAssignment: (freshAssignments || cachedAssignments)[0] ? {
      title: (freshAssignments || cachedAssignments)[0].title,
      courseName: (freshAssignments || cachedAssignments)[0].courseName,
      score: (freshAssignments || cachedAssignments)[0].score
    } : null
  });
  
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