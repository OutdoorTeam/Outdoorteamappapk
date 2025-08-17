import { useQuery } from '@tanstack/react-query';
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
  is_active?: number;
  updated_at?: string;
  description?: string;
}

// Get user files with optional type filter
export const useUserFiles = (fileType?: string) => {
  return useQuery({
    queryKey: ['user-files', fileType],
    queryFn: async () => {
      const params = fileType ? `?file_type=${fileType}` : '';
      return apiRequest<UserFile[]>(`/api/user-files${params}`);
    },
    retry: 2,
    staleTime: 30000, // 30 seconds
  });
};
