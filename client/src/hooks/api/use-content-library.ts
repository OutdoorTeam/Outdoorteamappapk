import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/utils/error-handling';

// Query keys
export const CONTENT_LIBRARY_KEYS = {
  all: ['content-library'] as const,
  byCategory: (category?: string) => [...CONTENT_LIBRARY_KEYS.all, category || 'all'] as const,
};

// Hook for content library
export function useContentLibrary(category?: string) {
  return useQuery({
    queryKey: CONTENT_LIBRARY_KEYS.byCategory(category),
    queryFn: () => {
      const params = category ? `?category=${category}` : '';
      return apiRequest(`/api/content-library${params}`);
    },
    staleTime: 15 * 60 * 1000, // 15 minutes - content rarely changes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
  });
}

// Hook for exercises specifically
export function useExercises() {
  return useContentLibrary('exercise');
}

// Hook for meditation content
export function useMeditationContent() {
  return useContentLibrary('meditation');
}

// Hook for active breaks content
export function useActiveBreaksContent() {
  return useContentLibrary('active_breaks');
}

// Mutation for creating content (admin only)
export function useCreateContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      video_url?: string;
      category: string;
      subcategory?: string;
    }) =>
      apiRequest('/api/content-library', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (newContent) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: CONTENT_LIBRARY_KEYS.all });
      queryClient.invalidateQueries({ 
        queryKey: CONTENT_LIBRARY_KEYS.byCategory(newContent.category) 
      });
    },
  });
}

// Mutation for updating content (admin only)
export function useUpdateContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { 
      id: number; 
      data: {
        title: string;
        description?: string;
        video_url?: string;
        category: string;
        subcategory?: string;
        is_active?: boolean;
      }
    }) =>
      apiRequest(`/api/content-library/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      // Invalidate all content library queries
      queryClient.invalidateQueries({ queryKey: CONTENT_LIBRARY_KEYS.all });
    },
  });
}

// Mutation for deleting content (admin only)
export function useDeleteContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contentId: number) =>
      apiRequest(`/api/content-library/${contentId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      // Invalidate all content library queries
      queryClient.invalidateQueries({ queryKey: CONTENT_LIBRARY_KEYS.all });
    },
  });
}
