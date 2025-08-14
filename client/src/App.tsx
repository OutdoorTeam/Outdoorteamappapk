import * as React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { QueryProvider } from '@/providers/QueryProvider';
import { Toaster } from '@/components/ui/toaster';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';

// Pages
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
import PlansManagePage from '@/pages/PlansManagePage';
import ProfilePage from '@/pages/ProfilePage';
import PlanSelectionPage from '@/pages/PlanSelectionPage';

const App: React.FC = () => {
  return (
    <QueryProvider>
      <AuthProvider>
        <Router>
          <Layout>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/plans" element={<PlansPage />} />
              <Route path="/planes" element={<PlansPage />} />

              {/* Protected user routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } />
              
              <Route path="/plan-selection" element={
                <ProtectedRoute>
                  <PlanSelectionPage />
                </ProtectedRoute>
              } />

              <Route path="/training" element={
                <ProtectedRoute>
                  <TrainingPage />
                </ProtectedRoute>
              } />

              <Route path="/nutrition" element={
                <ProtectedRoute>
                  <NutritionPage />
                </ProtectedRoute>
              } />

              <Route path="/meditation" element={
                <ProtectedRoute>
                  <MeditationPage />
                </ProtectedRoute>
              } />

              <Route path="/active-breaks" element={
                <ProtectedRoute>
                  <ActiveBreaksPage />
                </ProtectedRoute>
              } />

              <Route path="/exercises" element={
                <ProtectedRoute>
                  <ExercisesPage />
                </ProtectedRoute>
              } />

              <Route path="/profile" element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } />

              {/* Admin routes */}
              <Route path="/admin" element={
                <ProtectedRoute adminOnly>
                  <AdminPage />
                </ProtectedRoute>
              } />

              <Route path="/admin/plans" element={
                <ProtectedRoute adminOnly>
                  <PlansManagePage />
                </ProtectedRoute>
              } />

              {/* Catch all route - redirect to home */}
              <Route path="*" element={<HomePage />} />
            </Routes>
          </Layout>
          <Toaster />
        </Router>
      </AuthProvider>
    </QueryProvider>
  );
};

export default App;
