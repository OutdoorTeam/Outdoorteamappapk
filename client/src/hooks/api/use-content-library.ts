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
}

// Query keys
export const CONTENT_LIBRARY_KEYS = {
  all: ['content-library'] as const,
  byCategory: (category?: string) => [...CONTENT_LIBRARY_KEYS.all, 'category', category] as const,
};

// Hook to get content library items
export function useContentLibrary(category?: string) {
  const queryKey = category ? CONTENT_LIBRARY_KEYS.byCategory(category) : CONTENT_LIBRARY_KEYS.all;
  
  return useQuery({
    queryKey,
    queryFn: () => {
      const url = category 
        ? `/api/content-library?category=${encodeURIComponent(category)}`
        : '/api/content-library';
      return apiRequest<ContentLibraryItem[]>(url);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook to create content library item (admin only)
export function useCreateContentLibraryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemData: Omit<ContentLibraryItem, 'id' | 'created_at'>) =>
      apiRequest<ContentLibraryItem>('/api/content-library', {
        method: 'POST',
        body: JSON.stringify(itemData),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTENT_LIBRARY_KEYS.all });
    },
  });
}

// Hook to update content library item (admin only)
export function useUpdateContentLibraryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...itemData }: Partial<ContentLibraryItem> & { id: number }) =>
      apiRequest<ContentLibraryItem>(`/api/content-library/${id}`, {
        method: 'PUT',
        body: JSON.stringify(itemData),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTENT_LIBRARY_KEYS.all });
    },
  });
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
