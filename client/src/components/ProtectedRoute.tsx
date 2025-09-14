import * as React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

type Role = 'admin' | 'user' | string;

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  requiredRole?: Role;       // mantiene compat
  allowedRoles?: Role[];     // nuevo: varios roles aceptados
  fallbackPath?: string;     // nuevo: adónde mandar si no alcanza
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  adminOnly,
  requiredRole,
  allowedRoles,
  fallbackPath = '/',
}) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const mustBeAdmin = adminOnly === true;
  const passesAdmin = !mustBeAdmin || user.role === 'admin';

  const passesRequired =
    !requiredRole || user.role === requiredRole;

  const passesAllowed =
    !allowedRoles || allowedRoles.includes(user.role);

  if (!passesAdmin || !passesRequired || !passesAllowed) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
