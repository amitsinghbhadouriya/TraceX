import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAnalysisStore from './store/analysisStore';

import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage';
import UploadPage from './pages/UploadPage';
import DashboardPage from './pages/DashboardPage';
import GraphPage from './pages/GraphPage';
import NetworksPage from './pages/NetworksPage';
import EntitiesPage from './pages/EntitiesPage';
import AssistantPage from './pages/AssistantPage';

import ProtectedRoute from './components/layout/ProtectedRoute';
import Layout from './components/layout/Layout';

const App = () => {
  const { checkAuth } = useAnalysisStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<LoginPage initialMode="register" />} />
        
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <Layout>
                <UploadPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <DashboardPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/graph"
          element={
            <ProtectedRoute>
              <Layout>
                <GraphPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/networks"
          element={
            <ProtectedRoute>
              <Layout>
                <NetworksPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/entities"
          element={
            <ProtectedRoute>
              <Layout>
                <EntitiesPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/assistant"
          element={
            <ProtectedRoute>
              <Layout>
                <AssistantPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
