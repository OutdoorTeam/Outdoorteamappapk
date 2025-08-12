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
import ExercisesPage from '@/pages/ExercisesPage';

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
      
      {/* Training Page - only accessible with training features */}
      <Route 
        path="/entrenamiento" 
        element={
          <ProtectedRoute>
            {user && user.features?.training ? (
              <TrainingPage />
            ) : (
              <Navigate to="/dashboard" replace />
            )}
          </ProtectedRoute>
        } 
      />

      {/* Nutrition Page - only accessible with nutrition features */}
      <Route 
        path="/nutricion" 
        element={
          <ProtectedRoute>
            {user && user.features?.nutrition ? (
              <NutritionPage />
            ) : (
              <Navigate to="/dashboard" replace />
            )}
          </ProtectedRoute>
        } 
      />

      {/* Active Breaks Page - only accessible with active_breaks features */}
      <Route 
        path="/pausas-activas" 
        element={
          <ProtectedRoute>
            {user && user.features?.active_breaks ? (
              <ActiveBreaksPage />
            ) : (
              <Navigate to="/dashboard" replace />
            )}
          </ProtectedRoute>
        } 
      />

      {/* Exercises (Meditation) Page - only accessible with meditation features */}
      <Route 
        path="/ejercicios" 
        element={
          <ProtectedRoute>
            {user && user.features?.meditation ? (
              <ExercisesPage />
            ) : (
              <Navigate to="/dashboard" replace />
            )}
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
      
      {/* Dashboard - redirect to plan selection if no plan */}
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