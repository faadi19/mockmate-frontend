import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ReactNode } from 'react';
import { isDemoMode } from '../utils/demoMode';

type PrivateRouteProps = {
  children: ReactNode;
};

const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Avoid flicker while auth is loading
  if (loading) return null;

  // Normal auth
  if (isAuthenticated) return <>{children}</>;

  // Demo mode: allow ONLY dashboard to be viewed without auth
  if (isDemoMode() && location.pathname === "/dashboard") {
    return <>{children}</>;
  }

  // If user is in demo mode and clicked a restricted feature → take them to signup with a friendly banner
  if (isDemoMode()) {
    return (
      <Navigate
        to="/signup"
        replace
        state={{ demoBlocked: true, from: location.pathname }}
      />
    );
  }

  // Not logged in → go to login
  return (
    <Navigate
      to="/login"
      replace
      state={{ from: location.pathname }}
    />
  );
};

export default PrivateRoute;