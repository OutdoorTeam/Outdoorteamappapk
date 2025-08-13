import * as React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import HomePage from '@/pages/HomePage';
import PlansPage from '@/pages/PlansPage';
import PlansManagePage from '@/pages/PlansManagePage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import PlanSelectionPage from '@/pages/PlanSelectionPage';
import AdminPage from '@/pages/AdminPage';
import TrainingPage from '@/pages/TrainingPage';
import NutritionPage from '@/pages/NutritionPage';
import ActiveBreaksPage from '@/pages/ActiveBreaksPage';
import MeditationPage from '@/pages/MeditationPage';
import ProfilePage from '@/pages/ProfilePage';

// Protected Route Wrapper with feature checking
interface FeatureProtectedRouteProps {
  children: React.ReactNode;
  feature?: string;
}

const FeatureProtectedRoute: React.FC<FeatureProtectedRouteProps> = ({ children, feature }) => {
  const { user } = useAuth();
  
  // Allow access if no feature specified, user is admin, or user has the required feature
  if (!feature || user?.role === 'admin' || (user?.features as any)?.[feature]) {
    return <>{children}</>;
  }
  
  // Redirect to dashboard with error message
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Acceso Restringido</h1>
        <p className="text-muted-foreground mb-4">
          Esta funcionalidad no está disponible en tu plan actual.
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          Contacta al administrador para habilitar esta característica o considera actualizar tu plan.
        </p>
        <div className="space-x-4">
          <button 
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Volver
          </button>
          <a 
            href="/plans" 
            className="px-4 py-2 border border-primary text-primary rounded-md"
          >
            Ver Planes
          </a>
        </div>
      </div>
    </div>
  );
};

const AppRoutes: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/planes" element={<PlansPage />} />
      <Route 
        path="/planes-manage" 
        element={
          <ProtectedRoute>
            <PlansManagePage />
          </ProtectedRoute>
        } 
      />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      {/* Dashboard */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            {user && user.role === 'user' && (!user.plan_type || Object.values(user.features).every(f => !f)) ? (
              <Navigate to="/plan-selection" replace />
            ) : (
              <DashboardPage />
            )}
          </ProtectedRoute>
        } 
      />

      {/* Training Page - requires training feature */}
      <Route 
        path="/training" 
        element={
          <ProtectedRoute>
            <FeatureProtectedRoute feature="training">
              <TrainingPage />
            </FeatureProtectedRoute>
          </ProtectedRoute>
        } 
      />

      {/* Nutrition Page - requires nutrition feature */}
      <Route 
        path="/nutrition" 
        element={
          <ProtectedRoute>
            <FeatureProtectedRoute feature="nutrition">
              <NutritionPage />
            </FeatureProtectedRoute>
          </ProtectedRoute>
        } 
      />

      {/* Meditation Page - requires meditation feature */}
      <Route 
        path="/meditation" 
        element={
          <ProtectedRoute>
            <FeatureProtectedRoute feature="meditation">
              <MeditationPage />
            </FeatureProtectedRoute>
          </ProtectedRoute>
        } 
      />

      {/* Active Breaks Page - requires active_breaks feature */}
      <Route 
        path="/active-breaks" 
        element={
          <ProtectedRoute>
            <FeatureProtectedRoute feature="active_breaks">
              <ActiveBreaksPage />
            </FeatureProtectedRoute>
          </ProtectedRoute>
        } 
      />

      {/* Profile Page - accessible to all logged-in users */}
      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        } 
      />
      
      {/* Plan selection - only for users without a plan */}
      <Route 
        path="/plan-selection" 
        element={
          <ProtectedRoute>
            {user && (!user.plan_type || Object.values(user.features).every(f => !f)) ? (
              <PlanSelectionPage />
            ) : (
              <Navigate to="/dashboard" replace />
            )}
          </ProtectedRoute>
        } 
      />
      
      {/* Admin Panel - only for admins */}
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminPage />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <AppRoutes />
        </Layout>
      </Router>
    </AuthProvider>
  );
}

export default App;