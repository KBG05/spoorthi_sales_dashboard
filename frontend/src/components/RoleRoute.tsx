import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, CircularProgress } from '@mui/material';

interface RoleRouteProps {
  children: React.ReactNode;
  requiredRole: string;
}

/**
 * A route guard that requires both authentication and a specific role.
 * Unauthenticated users are sent to /login.
 * Authenticated users without the required role are redirected to /dashboard.
 */
const RoleRoute = ({ children, requiredRole }: RoleRouteProps) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box
        sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default RoleRoute;
