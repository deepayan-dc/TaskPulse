import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ReactNode } from 'react';
import ForcePasswordReset from '../pages/ForcePasswordReset';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Onboarded employees must replace their temporary password before using the app.
  if (user?.mustResetPassword) {
    return <ForcePasswordReset />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
