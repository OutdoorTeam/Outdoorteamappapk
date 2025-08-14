import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/utils/error-handling';

// Query keys
export const USER_FILES_KEYS = {
  all: ['user-files'] as const,
  byType: (type?: string) => [...USER_FILES_KEYS.all, type || 'all'] as const,
  byUser: (userId: number, type?: string) => [...USER_FILES_KEYS.all, 'user', userId, type || 'all'] as const,
};

// Hook for user's own files
export function useUserFiles(fileType?: string) {
  return useQuery({
    queryKey: USER_FILES_KEYS.byType(fileType),
    queryFn: () => {
      const params = fileType ? `?file_type=${fileType}` : '';
      return apiRequest(`/api/user-files${params}`);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - files don't change often
    refetchOnWindowFocus: false,
  });
}

// Hook for admin to get user files
export function useAdminUserFiles(userId: number, fileType?: string) {
  return useQuery({
    queryKey: USER_FILES_KEYS.byUser(userId, fileType),
    queryFn: () => {
      const params = fileType ? `?file_type=${fileType}` : '';
      return apiRequest(`/api/admin/user-files/${userId}${params}`);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    enabled: !!userId, // Only run if userId is provided
  });
}

// Mutation for uploading files (admin only)
export function useUploadUserFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { formData: FormData; userId: number; fileType: string }) => {
      return apiRequest('/api/upload-user-file', {
        method: 'POST',
        headers: {}, // Don't set Content-Type for FormData
        body: data.formData,
      });
    },
    onSuccess: (newFile, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ 
        queryKey: USER_FILES_KEYS.byUser(variables.userId, variables.fileType) 
      });
      queryClient.invalidateQueries({ 
        queryKey: USER_FILES_KEYS.byType(variables.fileType) 
      });
    },
  });
}

// Mutation for deleting files (admin only)
export function useDeleteUserFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileId: number) =>
      apiRequest(`/api/user-files/${fileId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      // Invalidate all user files queries
      queryClient.invalidateQueries({ queryKey: USER_FILES_KEYS.all });
    },
  });
}
