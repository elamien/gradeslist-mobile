import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../store/useAppStore';
import { universalAPI } from '../integrations/mobile-universal-api';
import { UniversalCourse } from '../integrations/universal-interfaces';

export const useCourses = () => {
  const { connections, selectedTerm, credentialsLoaded } = useAppStore();
  const connectedPlatforms = connections.filter(conn => conn.isConnected);

  return useQuery<UniversalCourse[]>({
    queryKey: ['courses', connectedPlatforms.map(p => p.id), selectedTerm],
    queryFn: async () => {
      if (connectedPlatforms.length === 0) {
        return [];
      }

      const allCourses: UniversalCourse[] = [];

      for (const platform of connectedPlatforms) {
        if (!platform.credentials) continue;

        try {
          const courses = await universalAPI.getCourses(
            platform.id as 'canvas' | 'gradescope',
            platform.credentials,
            selectedTerm
          );
          
          allCourses.push(...courses);
        } catch (error) {
          console.error(`Failed to fetch courses from ${platform.name}:`, error);
          // Continue with other platforms even if one fails
        }
      }

      return allCourses;
    },
    enabled: connectedPlatforms.length > 0 && credentialsLoaded, // Wait for credentials to be loaded
    staleTime: 30 * 60 * 1000, // 30 minutes (courses change less frequently)
    refetchInterval: 60 * 60 * 1000, // 1 hour
  });
};