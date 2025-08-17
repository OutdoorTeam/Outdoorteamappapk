import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/utils/error-handling';

export interface ContentVideo {
  id: number;
  title: string;
  description: string | null;
  category: string;
  video_url: string;
  is_active: boolean;
  created_at: string;
}

// Query keys
export const CONTENT_VIDEOS_KEYS = {
  all: ['content-videos'] as const,
  byCategory: (category: string) => [...CONTENT_VIDEOS_KEYS.all, 'category', category] as const,
};

// Hook to get all content videos
export function useContentVideos() {
  return useQuery({
    queryKey: CONTENT_VIDEOS_KEYS.all,
    queryFn: () => apiRequest<ContentVideo[]>('/api/content-videos'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook to get content videos by category
export function useContentVideosByCategory(category: string) {
  return useQuery({
    queryKey: CONTENT_VIDEOS_KEYS.byCategory(category),
    queryFn: () => apiRequest<ContentVideo[]>(`/api/content-videos?category=${category}`),
    enabled: !!category,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Create content video mutation (admin only)
export function useCreateContentVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (video: Omit<ContentVideo, 'id' | 'created_at'>) =>
      apiRequest<ContentVideo>('/api/content-videos', {
        method: 'POST',
        body: JSON.stringify(video),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTENT_VIDEOS_KEYS.all });
    },
  });
}

// Update content video mutation (admin only)
export function useUpdateContentVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...video }: Partial<ContentVideo> & { id: number }) =>
      apiRequest<ContentVideo>(`/api/content-videos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(video),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTENT_VIDEOS_KEYS.all });
    },
  });
}

// Delete content video mutation (admin only)
export function useDeleteContentVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/content-videos/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTENT_VIDEOS_KEYS.all });
    },
  });
}
