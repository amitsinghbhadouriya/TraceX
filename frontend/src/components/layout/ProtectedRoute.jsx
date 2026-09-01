import React from 'react';
import { Navigate } from 'react-router-dom';
import useAnalysisStore from '../../store/analysisStore';

const ProtectedRoute = ({ children }) => {
  const { token } = useAnalysisStore();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
