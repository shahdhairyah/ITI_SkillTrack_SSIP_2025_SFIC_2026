import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import Loader from '../common/Loader';
import { roleHome } from '../../lib/format';

export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <Loader label="Restoring your session…" fullScreen />;
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

export function RoleRoute({ roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={roleHome(user.role)} replace />;
  return <Outlet />;
}

