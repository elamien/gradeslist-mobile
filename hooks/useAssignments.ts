import { useQuery } from '@tanstack/react-query';
import { universalAPI } from '../integrations/mobile-universal-api';
import { UniversalAssignment } from '../integrations/universal-interfaces';
import { useAppStore } from '../store/useAppStore';

export const useAssignments = () => {
  const { connections, selectedTerm, selectedCourseIds, credentialsLoaded } = useAppStore();
  const connectedPlatforms = connections.filter(conn => conn.isConnected);

  return useQuery<UniversalAssignment[]>({
    queryKey: ['assignments', connectedPlatforms.map(p => p.id), selectedTerm, selectedCourseIds],
    queryFn: async () => {
      if (connectedPlatforms.length === 0 || selectedCourseIds.length === 0) {
        return [];
      }

      const allAssignments: UniversalAssignment[] = [];

      for (const platform of connectedPlatforms) {
        if (!platform.credentials) continue;

        try {
          // Get assignments from this platform for selected courses only
          const assignments = await universalAPI.getAssignments(
            platform.id as 'canvas' | 'gradescope',
            platform.credentials,
            selectedTerm,
            selectedCourseIds
          );
          
          // Add all assignments (already filtered by the API)
          allAssignments.push(...assignments);
        } catch (error) {
          console.error(`Failed to fetch assignments from ${platform.name}:`, error);
          // Continue with other platforms even if one fails
        }
      }

      return allAssignments;
    },
    enabled: connectedPlatforms.length > 0 && selectedCourseIds.length > 0 && credentialsLoaded,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 15 * 60 * 1000, // 15 minutes
  });
};

export const useDueAssignments = () => {
  const { data: assignments, ...query } = useAssignments();
  
  const dueAssignments = assignments?.filter(assignment => {
    // Show assignments that are not graded (includes missing, submitted, overdue)
    // This covers all assignments that still need attention regardless of due date
    return assignment.status !== 'graded';
  }) || [];

  return {
    ...query,
    data: dueAssignments,
  };
};

export const useGradedAssignments = () => {
  const { data: assignments, ...query } = useAssignments();
  
  const gradedAssignments = assignments?.filter(assignment => {
    // Filter for assignments that have been graded (have a score)
    return assignment.score !== null && assignment.score !== undefined;
  }) || [];

  return {
    ...query,
    data: gradedAssignments,
  };
};