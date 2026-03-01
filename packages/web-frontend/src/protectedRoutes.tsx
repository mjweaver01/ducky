import { authAPI } from './api';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  element: React.ReactNode;
}

/** Protects authenticated routes: redirects to /login when not logged in. Use as the route element. */
export const ProtectedRoute = ({ element }: ProtectedRouteProps) => {
  const isAuthenticated = authAPI.isAuthenticated();
  return isAuthenticated ? <>{element}</> : <Navigate to="/login" replace />;
};

interface GuestOnlyRouteProps {
  element: React.ReactNode;
}

/** For login/signup: redirects to /dashboard when already logged in. */
export const GuestOnlyRoute = ({ element }: GuestOnlyRouteProps) => {
  const isAuthenticated = authAPI.isAuthenticated();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{element}</>;
};