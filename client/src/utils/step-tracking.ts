// Google Fit integration utilities
export const GOOGLE_FIT_CONFIG = {
  scope: 'https://www.googleapis.com/auth/fitness.activity.read',
  discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/fitness/v1/rest'],
};

// Apple HealthKit types and utilities
export interface HealthKitStepData {
  value: number;
  startDate: Date;
  endDate: Date;
}

// Check if Google Fit is available (web)
export const isGoogleFitAvailable = (): boolean => {
  return typeof window !== 'undefined' && 
         typeof window.gapi !== 'undefined';
};

// Check if Apple HealthKit is available (iOS WebView or PWA)
export const isAppleHealthKitAvailable = (): boolean => {
  return typeof window !== 'undefined' && 
         'webkit' in window && 
         // @ts-ignore
         window.webkit?.messageHandlers?.health;
};

// Initialize Google Fit API
export const initializeGoogleFit = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!isGoogleFitAvailable()) {
      reject(new Error('Google API not available'));
      return;
    }

    // @ts-ignore
    window.gapi.load('auth2:client', async () => {
      try {
        // @ts-ignore
        await window.gapi.client.init({
          clientId: process.env.VITE_GOOGLE_CLIENT_ID || '',
          scope: GOOGLE_FIT_CONFIG.scope,
          discoveryDocs: GOOGLE_FIT_CONFIG.discoveryDocs,
        });
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
};

// Authenticate with Google Fit
export const authenticateGoogleFit = async (): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}> => {
  if (!isGoogleFitAvailable()) {
    throw new Error('Google Fit no está disponible');
  }

  try {
    // @ts-ignore
    const authInstance = window.gapi.auth2.getAuthInstance();
    const user = await authInstance.signIn();
    const authResponse = user.getAuthResponse();

    return {
      accessToken: authResponse.access_token,
      expiresAt: authResponse.expires_at,
    };
  } catch (error) {
    console.error('Google Fit authentication error:', error);
    throw new Error('Error al autenticar con Google Fit');
  }
};

// Get step data from Google Fit
export const getGoogleFitSteps = async (date: string): Promise<number> => {
  if (!isGoogleFitAvailable()) {
    throw new Error('Google Fit no está disponible');
  }

  try {
    const startTime = new Date(date + 'T00:00:00.000Z').getTime();
    const endTime = new Date(date + 'T23:59:59.999Z').getTime();

    const request = {
      aggregateBy: [
        {
          dataTypeName: 'com.google.step_count.delta',
          dataSourceId: 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps',
        },
      ],
      bucketByTime: { durationMillis: 86400000 }, // 1 day
      startTimeMillis: startTime,
      endTimeMillis: endTime,
    };

    // @ts-ignore
    const response = await window.gapi.client.fitness.users.dataset.aggregate({
      userId: 'me',
      resource: request,
    });

    const data = response.result;
    let totalSteps = 0;

    if (data.bucket && data.bucket.length > 0) {
      data.bucket.forEach((bucket: any) => {
        if (bucket.dataset && bucket.dataset.length > 0) {
          bucket.dataset.forEach((dataset: any) => {
            if (dataset.point && dataset.point.length > 0) {
              dataset.point.forEach((point: any) => {
                if (point.value && point.value.length > 0) {
                  totalSteps += point.value[0].intVal || 0;
                }
              });
            }
          });
        }
      });
    }

    return totalSteps;
  } catch (error) {
    console.error('Error fetching Google Fit steps:', error);
    throw new Error('Error al obtener pasos de Google Fit');
  }
};

// Apple HealthKit integration
export const requestAppleHealthKitPermission = async (): Promise<boolean> => {
  if (!isAppleHealthKitAvailable()) {
    throw new Error('Apple HealthKit no está disponible');
  }

  return new Promise((resolve, reject) => {
    try {
      // @ts-ignore
      window.webkit.messageHandlers.health.postMessage({
        action: 'requestPermission',
        types: ['stepCount'],
      });

      // Listen for response
      const handleHealthResponse = (event: MessageEvent) => {
        if (event.data.type === 'healthPermissionResponse') {
          window.removeEventListener('message', handleHealthResponse);
          resolve(event.data.granted);
        }
      };

      window.addEventListener('message', handleHealthResponse);

      // Timeout after 30 seconds
      setTimeout(() => {
        window.removeEventListener('message', handleHealthResponse);
        reject(new Error('Timeout waiting for HealthKit permission'));
      }, 30000);
    } catch (error) {
      reject(error);
    }
  });
};

// Get step data from Apple HealthKit
export const getAppleHealthKitSteps = async (date: string): Promise<number> => {
  if (!isAppleHealthKitAvailable()) {
    throw new Error('Apple HealthKit no está disponible');
  }

  return new Promise((resolve, reject) => {
    try {
      const startDate = new Date(date + 'T00:00:00.000Z');
      const endDate = new Date(date + 'T23:59:59.999Z');

      // @ts-ignore
      window.webkit.messageHandlers.health.postMessage({
        action: 'getStepCount',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      // Listen for response
      const handleHealthResponse = (event: MessageEvent) => {
        if (event.data.type === 'healthStepCountResponse') {
          window.removeEventListener('message', handleHealthResponse);
          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve(event.data.steps || 0);
          }
        }
      };

      window.addEventListener('message', handleHealthResponse);

      // Timeout after 30 seconds
      setTimeout(() => {
        window.removeEventListener('message', handleHealthResponse);
        reject(new Error('Timeout waiting for HealthKit step data'));
      }, 30000);
    } catch (error) {
      reject(error);
    }
  });
};

// Detect platform
export const getPlatform = (): 'android' | 'ios' | 'web' => {
  const userAgent = navigator.userAgent;
  
  if (/android/i.test(userAgent)) {
    return 'android';
  }
  
  if (/iPad|iPhone|iPod/.test(userAgent)) {
    return 'ios';
  }
  
  return 'web';
};

// Get timezone
export const getUserTimezone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

// Background sync utilities
export const setupBackgroundSync = (syncFunction: () => Promise<void>) => {
  // Register for background sync when page becomes visible
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      syncFunction().catch(console.error);
    }
  });

  // Sync on page load
  window.addEventListener('load', () => {
    syncFunction().catch(console.error);
  });

  // Periodic sync every 6 hours if page is active
  let syncInterval: NodeJS.Timeout;

  const startPeriodicSync = () => {
    syncInterval = setInterval(() => {
      if (!document.hidden) {
        syncFunction().catch(console.error);
      }
    }, 6 * 60 * 60 * 1000); // 6 hours
  };

  const stopPeriodicSync = () => {
    if (syncInterval) {
      clearInterval(syncInterval);
    }
  };

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopPeriodicSync();
    } else {
      startPeriodicSync();
    }
  });

  // Start initial sync
  if (!document.hidden) {
    startPeriodicSync();
  }

  // Cleanup
  return () => {
    stopPeriodicSync();
  };
};

// Utility to format last sync time
export const formatLastSync = (lastSync: string | null): string => {
  if (!lastSync) {
    return 'Nunca sincronizado';
  }

  const syncDate = new Date(lastSync);
  const now = new Date();
  const diffMs = now.getTime() - syncDate.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffHours < 1) {
    if (diffMinutes < 1) {
      return 'Hace menos de un minuto';
    }
    return `Hace ${diffMinutes} minuto${diffMinutes !== 1 ? 's' : ''}`;
  }

  if (diffHours < 24) {
    return `Hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `Hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`;
};
