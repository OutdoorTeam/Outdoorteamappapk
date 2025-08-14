import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/utils/error-handling';

// Query keys
export const AUTH_KEYS = {
  all: ['auth'] as const,
  user: () => [...AUTH_KEYS.all, 'user'] as const,
};

// Hook for current user
export function useCurrentUser() {
  return useQuery({
    queryKey: AUTH_KEYS.user(),
    queryFn: () => apiRequest('/api/auth/me'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    retry: false, // Don't retry auth requests
    enabled: !!localStorage.getItem('auth_token'), // Only run if token exists
  });
}

// Mutation for login
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: { email: string; password: string }) =>
      apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    onSuccess: (data) => {
      // Store token and update auth cache
      localStorage.setItem('auth_token', data.token);
      queryClient.setQueryData(AUTH_KEYS.user(), data.user);
      
      // Invalidate all queries that depend on user authentication
      queryClient.invalidateQueries();
    },
  });
}

// Mutation for register
export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userData: { full_name: string; email: string; password: string }) =>
      apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      }),
    onSuccess: (data) => {
      // Store token and update auth cache
      localStorage.setItem('auth_token', data.token);
      queryClient.setQueryData(AUTH_KEYS.user(), data.user);
      
      // Invalidate all queries
      queryClient.invalidateQueries();
    },
  });
}

// Logout utility
export function useLogout() {
  const queryClient = useQueryClient();

  return () => {
    localStorage.removeItem('auth_token');
    queryClient.clear(); // Clear all cached data
    queryClient.setQueryData(AUTH_KEYS.user(), null);
  };
}
