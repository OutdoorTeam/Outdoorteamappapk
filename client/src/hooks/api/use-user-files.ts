import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/utils/error-handling';

export interface UserFile {
  id: number;
  user_id: number;
  filename: string;
  file_type: string;
  file_path: string;
  uploaded_by: number;
  created_at: string;
  file_size?: number;
  mime_type?: string;
  original_name?: string;
  is_active?: boolean;
  updated_at?: string;
  description?: string;
}

// Query keys
export const USER_FILES_KEYS = {
  all: ['user-files'] as const,
  byType: (type: string) => [...USER_FILES_KEYS.all, 'type', type] as const,
};

// Hook to get user files by type
export function useUserFiles(fileType?: string) {
  const token = localStorage.getItem('auth_token');
  return useQuery({
    queryKey: fileType ? USER_FILES_KEYS.byType(fileType) : USER_FILES_KEYS.all,
    queryFn: () => {
      const url = fileType ? `/api/user-files?file_type=${fileType}` : '/api/user-files';
      return apiRequest<UserFile[]>(url);
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Upload file mutation
export function useUploadUserFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) =>
      apiRequest<UserFile>('/api/upload-user-file', {
        method: 'POST',
        body: formData,
        headers: {}, // Don't set Content-Type for FormData
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_FILES_KEYS.all });
    },
  });
}

// Delete file mutation
export function useDeleteUserFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileId: number) =>
      apiRequest(`/api/user-files/${fileId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_FILES_KEYS.all });
    },
  });
}
