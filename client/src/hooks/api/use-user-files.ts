import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/utils/error-handling';
import { useAuth } from '@/contexts/AuthContext';

// Query keys
export const USER_FILES_KEYS = {
  all: ['user-files'] as const,
  byUser: (userId: number, fileType?: string) => [...USER_FILES_KEYS.all, userId, fileType || 'all'] as const,
};

// Hook for user files
export function useUserFiles(fileType?: string, userId?: number) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: USER_FILES_KEYS.byUser(targetUserId || 0, fileType),
    queryFn: () => apiRequest(`/api/users/${targetUserId}/files${fileType ? `?file_type=${fileType}` : ''}`),
    enabled: !!targetUserId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}
