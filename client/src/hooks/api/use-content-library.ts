import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/utils/error-handling';

export interface ContentLibraryItem {
  id: number;
  title: string;
  description: string | null;
  video_url: string | null;
  category: string;
  subcategory: string | null;
  is_active: boolean;
  created_at: string;
}

// Query keys
export const CONTENT_LIBRARY_KEYS = {
  all: ['content-library'] as const,
  byCategory: (category: string) => [...CONTENT_LIBRARY_KEYS.all, 'category', category] as const,
};

// Hook to get content library items
export function useContentLibrary() {
  return useQuery({
    queryKey: CONTENT_LIBRARY_KEYS.all,
    queryFn: () => apiRequest<ContentLibraryItem[]>('/api/content-library'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook to get exercises (content library items with category 'exercise')
export function useExercises() {
  return useQuery({
    queryKey: CONTENT_LIBRARY_KEYS.byCategory('exercise'),
    queryFn: () => apiRequest<ContentLibraryItem[]>('/api/content-library?category=exercise'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook to get content library by category
export function useContentLibraryByCategory(category: string) {
  return useQuery({
    queryKey: CONTENT_LIBRARY_KEYS.byCategory(category),
    queryFn: () => apiRequest<ContentLibraryItem[]>(`/api/content-library?category=${category}`),
    enabled: !!category,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Create content mutation
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

// Update content mutation
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

// Delete content mutation
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
