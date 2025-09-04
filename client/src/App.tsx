
import * as React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { QueryProvider } from '@/providers/QueryProvider';
import { Toaster } from '@/components/ui/toaster';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';

// Pages - with error boundaries
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import AdminPage from '@/pages/AdminPage';
import TrainingPage from '@/pages/TrainingPage';
import NutritionPage from '@/pages/NutritionPage';
import MeditationPage from '@/pages/MeditationPage';
import ActiveBreaksPage from '@/pages/ActiveBreaksPage';
import ExercisesPage from '@/pages/ExercisesPage';
import PlansPage from '@/pages/PlansPage';
import PlansManagePage from '@/pages/admin/PlansManagementPage';
import ProfilePage from '@/pages/ProfilePage';
import PlanSelectionPage from '@/pages/PlanSelectionPage';

// Error fallback component
const PageErrorFallback: React.FC<{ error?: Error, pageName?: string }> = ({ error, pageName }) => (
  <div className="min-h-screen bg-black text-white flex items-center justify-center">
    <div className="text-center p-8">
      <h1 className="text-2xl font-bold text-[#D3B869] mb-4">
        Error en {pageName || 'la página'}
      </h1>
      <p className="text-gray-300 mb-4">
        Ha ocurrido un error al cargar esta página.
      </p>
      {error && (
        <div className="bg-gray-800 p-4 rounded mb-4 text-left">
          <p className="text-sm text-gray-400 mb-2">Detalles del error:</p>
          <code className="text-xs text-red-400">{error.message}</code>
        </div>
      )}
      <button 
        onClick={() => window.location.href = '/'}
        className="bg-[#D3B869] text-black px-6 py-2 rounded hover:bg-[#D3B869]/90"
      >
        Ir al Inicio
      </button>
    </div>
  </div>
);

// Page wrapper with error boundary
const PageWrapper: React.FC<{ 
  children: React.ReactNode; 
  pageName: string; 
}> = ({ children, pageName }) => {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error(`Error in ${pageName}:`, event.error);
      setError(event.error);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [pageName]);

  if (error) {
    return <PageErrorFallback error={error} pageName={pageName} />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const [appError, setAppError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Global error handler
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      if (event.reason?.message?.includes('fetch')) {
        console.log('Network error detected - this is likely normal');
        return;
      }
    };

    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
      if (event.error?.message?.includes('Loading chunk')) {
        console.log('Chunk loading error - attempting reload');
        window.location.reload();
        return;
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  if (appError) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-[#D3B869] mb-4">
            Error en la Aplicación
          </h1>
          <p className="text-gray-300 mb-4">{appError}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-[#D3B869] text-black px-6 py-2 rounded hover:bg-[#D3B869]/90"
          >
            Recargar Aplicación
          </button>
        </div>
      </div>
    );
  }

  try {
    return (
      <QueryProvider>
        <AuthProvider>
          <Router>
            <Layout>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={
                  <PageWrapper pageName="Home">
                    <HomePage />
                  </PageWrapper>
                } />
                <Route path="/login" element={
                  <PageWrapper pageName="Login">
                    <LoginPage />
                  </PageWrapper>
                } />
                <Route path="/register" element={
                  <PageWrapper pageName="Register">
                    <RegisterPage />
                  </PageWrapper>
                } />
                <Route path="/plans" element={
                  <PageWrapper pageName="Plans">
                    <PlansPage />
                  </PageWrapper>
                } />
                <Route path="/planes" element={
                  <PageWrapper pageName="Planes">
                    <PlansPage />
                  </PageWrapper>
                } />

                {/* Protected user routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <PageWrapper pageName="Dashboard">
                      <DashboardPage />
                    </PageWrapper>
                  </ProtectedRoute>
                } />
                
                <Route path="/plan-selection" element={
                  <ProtectedRoute>
                    <PageWrapper pageName="Plan Selection">
                      <PlanSelectionPage />
                    </PageWrapper>
                  </ProtectedRoute>
                } />

                <Route path="/training" element={
                  <ProtectedRoute>
                    <PageWrapper pageName="Training">
                      <TrainingPage />
                    </PageWrapper>
                  </ProtectedRoute>
                } />

                <Route path="/nutrition" element={
                  <ProtectedRoute>
                    <PageWrapper pageName="Nutrition">
                      <NutritionPage />
                    </PageWrapper>
                  </ProtectedRoute>
                } />

                <Route path="/meditation" element={
                  <ProtectedRoute>
                    <PageWrapper pageName="Meditation">
                      <MeditationPage />
                    </PageWrapper>
                  </ProtectedRoute>
                } />

                <Route path="/active-breaks" element={
                  <ProtectedRoute>
                    <PageWrapper pageName="Active Breaks">
                      <ActiveBreaksPage />
                    </PageWrapper>
                  </ProtectedRoute>
                } />

                <Route path="/exercises" element={
                  <ProtectedRoute>
                    <PageWrapper pageName="Exercises">
                      <ExercisesPage />
                    </PageWrapper>
                  </ProtectedRoute>
                } />

                <Route path="/profile" element={
                  <ProtectedRoute>
                    <PageWrapper pageName="Profile">
                      <ProfilePage />
                    </PageWrapper>
                  </ProtectedRoute>
                } />

                {/* Admin routes */}
                <Route path="/admin" element={
                  <ProtectedRoute adminOnly>
                    <PageWrapper pageName="Admin">
                      <AdminPage />
                    </PageWrapper>
                  </ProtectedRoute>
                } />

                <Route path="/admin/plans" element={
                  <ProtectedRoute adminOnly>
                    <PageWrapper pageName="Plans Management">
                      <PlansManagePage />
                    </PageWrapper>
                  </ProtectedRoute>
                } />

                {/* Catch all route - redirect to home */}
                <Route path="*" element={
                  <PageWrapper pageName="Home">
                    <HomePage />
                  </PageWrapper>
                } />
              </Routes>
            </Layout>
            <Toaster />
          </Router>
        </AuthProvider>
      </QueryProvider>
    );
  } catch (error) {
    console.error('Error rendering App component:', error);
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-[#D3B869] mb-4">
            Error Fatal
          </h1>
          <p className="text-gray-300 mb-4">
            No se pudo cargar la aplicación correctamente.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-[#D3B869] text-black px-6 py-2 rounded hover:bg-[#D3B869]/90"
          >
            Recargar
          </button>
        </div>
      </div>
    );
  }
};

export default App;
