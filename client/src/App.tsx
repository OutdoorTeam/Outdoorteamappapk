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
import MeditationPage from '@/pages/MeditationPage';
import ProfilePage from '@/pages/ProfilePage';

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

      {/* Training Page - accessible to all logged-in users */}
      <Route 
        path="/training" 
        element={
          <ProtectedRoute>
            <TrainingPage />
          </ProtectedRoute>
        } 
      />

      {/* Nutrition Page - accessible to all logged-in users */}
      <Route 
        path="/nutrition" 
        element={
          <ProtectedRoute>
            <NutritionPage />
          </ProtectedRoute>
        } 
      />

      {/* Meditation Page - accessible to all logged-in users */}
      <Route 
        path="/meditation" 
        element={
          <ProtectedRoute>
            <MeditationPage />
          </ProtectedRoute>
        } 
      />

      {/* Active Breaks Page - accessible to all logged-in users */}
      <Route 
        path="/active-breaks" 
        element={
          <ProtectedRoute>
            <ActiveBreaksPage />
          </ProtectedRoute>
        } 
      />

      {/* Exercises Page - accessible to all logged-in users */}
      <Route 
        path="/exercises" 
        element={
          <ProtectedRoute>
            <ExercisesPage />
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