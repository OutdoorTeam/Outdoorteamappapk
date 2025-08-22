import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/utils/error-handling';

export interface ContentLibraryItem {
  id: number;
  title: string;
  description: string | null;
  video_url: string | null;
  category: string;
  subcategory: string | null;
  is_active: number;
  created_at: string;
  video_type?: string;
  duration_minutes?: number;
  difficulty_level?: string;
  tags?: string;
}

// Query keys
export const CONTENT_LIBRARY_KEYS = {
  all: ['content-library'] as const,
  byCategory: (category?: string) => category 
    ? [...CONTENT_LIBRARY_KEYS.all, 'category', category] 
    : CONTENT_LIBRARY_KEYS.all,
};

// Hook to get content library items
export function useContentLibrary(category?: string) {
  return useQuery({
    queryKey: CONTENT_LIBRARY_KEYS.byCategory(category),
    queryFn: () => {
      const url = category 
        ? `/api/content-library?category=${encodeURIComponent(category)}`
        : '/api/content-library';
      return apiRequest<ContentLibraryItem[]>(url);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook to get videos for active breaks (active_breaks category)
export function useActiveBreaksVideos() {
  return useContentLibrary('active_breaks');
}

// Hook to get meditation videos
export function useMeditationVideos() {
  return useContentLibrary('meditation');
}

// Alias for exercises (exercise category)
export function useExercises() {
  return useContentLibrary('exercise');
}

// Hook to create content library item (admin only)
export function useCreateContentLibraryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (item: Omit<ContentLibraryItem, 'id' | 'created_at'>) =>
      apiRequest<ContentLibraryItem>('/api/content-library', {
        method: 'POST',
        body: JSON.stringify(item),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTENT_LIBRARY_KEYS.all });
    },
  });
}

// Alias for useCreateContentLibraryItem to match ContentManagement imports
export function useCreateContent() {
  return useCreateContentLibraryItem();
}

// Hook to update content library item (admin only)
export function useUpdateContentLibraryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...item }: Partial<ContentLibraryItem> & { id: number }) =>
      apiRequest<ContentLibraryItem>(`/api/content-library/${id}`, {
        method: 'PUT',
        body: JSON.stringify(item),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTENT_LIBRARY_KEYS.all });
    },
  });
}

// Alias for useUpdateContentLibraryItem to match ContentManagement imports
export function useUpdateContent() {
  return useUpdateContentLibraryItem();
}

// Hook to delete content library item (admin only)
export function useDeleteContentLibraryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/content-library/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTENT_LIBRARY_KEYS.all });
    },
  });
}

// Alias for useDeleteContentLibraryItem to match ContentManagement imports
export function useDeleteContent() {
  return useDeleteContentLibraryItem();
}
