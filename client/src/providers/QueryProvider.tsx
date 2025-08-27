import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

interface QueryProviderProps {
  children: React.ReactNode;
}

// Create a stable query client instance
const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on 401/403 errors (auth issues)
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        // Don't retry more than 2 times
        return failureCount < 2;
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (previously cacheTime)
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Don't retry mutations on client errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 1;
      },
    },
  },
});

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  // Use useState to ensure client is created only once
  const [queryClient] = React.useState(() => createQueryClient());

  React.useEffect(() => {
    // Global error handler for queries
    const handleQueryError = (error: any) => {
      console.error('Query error:', error);
      
      // Handle auth errors globally
      if (error?.status === 401) {
        console.log('Authentication error detected, clearing token');
        localStorage.removeItem('auth_token');
        // Don't redirect automatically, let the auth context handle it
      }
    };

    // Set up global error handling
    queryClient.getQueryCache().subscribe((event) => {
      if (event?.query?.state?.error) {
        handleQueryError(event.query.state.error);
      }
    });

    queryClient.getMutationCache().subscribe((event) => {
      if (event?.mutation?.state?.error) {
        handleQueryError(event.mutation.state.error);
      }
    });

    return () => {
      // Cleanup subscriptions
      queryClient.getQueryCache().clear();
      queryClient.getMutationCache().clear();
    };
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};