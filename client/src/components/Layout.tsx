import * as React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;
  
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-white shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-xl font-bold text-primary">
              Outdoor Team
            </Link>
            <div className="hidden md:flex items-center space-x-6">
              <Link to="/" className={`hover:text-primary ${isActive('/') ? 'text-primary font-medium' : ''}`}>
                Inicio
              </Link>
              <Link to="/planes" className={`hover:text-primary ${isActive('/planes') ? 'text-primary font-medium' : ''}`}>
                Planes
              </Link>
              
              {user ? (
                <div className="flex items-center space-x-4">
                  {user.role === 'admin' ? (
                    <Link to="/admin" className={`hover:text-primary ${isActive('/admin') ? 'text-primary font-medium' : ''}`}>
                      Panel Admin
                    </Link>
                  ) : (
                    <Link to="/dashboard" className={`hover:text-primary ${isActive('/dashboard') ? 'text-primary font-medium' : ''}`}>
                      Mi Panel
                    </Link>
                  )}
                  <span className="text-sm text-muted-foreground">
                    Hola, {user.full_name.split(' ')[0]}
                  </span>
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    Cerrar Sesión
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link to="/login">
                    <Button variant="outline" size="sm">Iniciar Sesión</Button>
                  </Link>
                  <Link to="/register">
                    <Button size="sm">Registrarse</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};

export default Layout;
