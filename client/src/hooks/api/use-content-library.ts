import { useQuery } from '@tanstack/react-query';
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
    queryFn: () => apiRequest(`/api/content-library${category ? `?category=${category}` : ''}`),
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}

// Hook specifically for exercises
export function useExercises() {
  return useContentLibrary('exercise');
}

// Hook specifically for meditation content
export function useMeditationContent() {
  return useContentLibrary('meditation');
}

// Hook specifically for active breaks
export function useActiveBreaks() {
  return useContentLibrary('active_breaks');
}
