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

  React.useEffect(() => {
    // Role-based redirects after login
    if (user && location.pathname === '/login') {
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, location.pathname, navigate]);

  const isActive = (path: string) => location.pathname === path;
  
  // Don't show navigation on dashboard for users
  const showFullNav = !user || user.role === 'admin' || !location.pathname.startsWith('/dashboard');
  
  if (user && user.role === 'user' && location.pathname === '/dashboard') {
    // Minimal header for dashboard
    return (
      <div className="min-h-screen">
        <nav className="bg-black border-b border-gray-800 px-4 py-2">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <Link to="/" className="text-xl font-bold text-[#D3B869]">
              Outdoor Team
            </Link>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-300">
                {user.full_name.split(' ')[0]}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="border-[#D3B869] text-[#D3B869] hover:bg-[#D3B869] hover:text-black"
              >
                Salir
              </Button>
            </div>
          </div>
        </nav>
        <main>
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-white shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-xl font-bold text-brand-black">
              Outdoor Team
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              <Link 
                to="/" 
                className={`hover:text-brand-gold transition-colors ${
                  isActive('/') ? 'text-brand-gold font-medium' : 'text-brand-black'
                }`}
              >
                Inicio
              </Link>

              {/* Training Tab - visible for users with training feature */}
              {user && user.features?.training && (
                <Link 
                  to="/entrenamiento" 
                  className={`hover:text-brand-gold transition-colors ${
                    isActive('/entrenamiento') ? 'text-brand-gold font-medium' : 'text-brand-black'
                  }`}
                >
                  Entrenamiento
                </Link>
              )}

              {/* Nutrition Tab - visible for users with nutrition feature */}
              {user && user.features?.nutrition && (
                <Link 
                  to="/nutricion" 
                  className={`hover:text-brand-gold transition-colors ${
                    isActive('/nutricion') ? 'text-brand-gold font-medium' : 'text-brand-black'
                  }`}
                >
                  Nutrición
                </Link>
              )}

              {/* Active Breaks Tab - visible for users with active_breaks feature */}
              {user && user.features?.active_breaks && (
                <Link 
                  to="/pausas-activas" 
                  className={`hover:text-brand-gold transition-colors ${
                    isActive('/pausas-activas') ? 'text-brand-gold font-medium' : 'text-brand-black'
                  }`}
                >
                  Pausas Activas
                </Link>
              )}

              {/* Meditation Tab - visible for users with meditation feature */}
              {user && user.features?.meditation && (
                <Link 
                  to="/ejercicios" 
                  className={`hover:text-brand-gold transition-colors ${
                    isActive('/ejercicios') ? 'text-brand-gold font-medium' : 'text-brand-black'
                  }`}
                >
                  Ejercicios
                </Link>
              )}
              
              <Link 
                to="/planes" 
                className={`hover:text-brand-gold transition-colors ${
                  isActive('/planes') ? 'text-brand-gold font-medium' : 'text-brand-black'
                }`}
              >
                Planes
              </Link>

              {user && user.role === 'user' && (
                <Link 
                  to="/planes-manage" 
                  className={`hover:text-brand-gold transition-colors ${
                    isActive('/planes-manage') ? 'text-brand-gold font-medium' : 'text-brand-black'
                  }`}
                >
                  Ver Planes
                </Link>
              )}
              
              {user ? (
                <div className="flex items-center space-x-4">
                  {user.role === 'admin' ? (
                    <Link 
                      to="/admin" 
                      className={`hover:text-brand-gold transition-colors ${
                        isActive('/admin') ? 'text-brand-gold font-medium' : 'text-brand-black'
                      }`}
                    >
                      Panel Admin
                    </Link>
                  ) : (
                    <Link 
                      to="/dashboard" 
                      className={`hover:text-brand-gold transition-colors ${
                        isActive('/dashboard') ? 'text-brand-gold font-medium' : 'text-brand-black'
                      }`}
                    >
                      Mi Panel
                    </Link>
                  )}
                  <span className="text-sm text-muted-foreground">
                    Hola, {user.full_name.split(' ')[0]}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleLogout}
                    className="border-brand-gold text-brand-black hover:bg-brand-gold hover:text-brand-black"
                  >
                    Cerrar Sesión
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link to="/login">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-brand-gold text-brand-black hover:bg-brand-gold hover:text-brand-black"
                    >
                      Iniciar Sesión
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button 
                      size="sm"
                      className="bg-brand-gold hover:bg-brand-gold/90 text-brand-black"
                    >
                      Registrarse
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Navigation */}
            <div className="md:hidden">
              {user ? (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground">
                    {user.full_name.split(' ')[0]}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleLogout}
                    className="border-brand-gold text-brand-black hover:bg-brand-gold hover:text-brand-black"
                  >
                    Salir
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-1">
                  <Link to="/login">
                    <Button variant="outline" size="sm">Login</Button>
                  </Link>
                  <Link to="/register">
                    <Button size="sm" className="bg-brand-gold text-brand-black">Sign Up</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu */}
          {user && showFullNav && (
            <div className="md:hidden mt-4 pb-4 border-t pt-4">
              <div className="flex flex-col space-y-2">
                <Link 
                  to="/" 
                  className={`px-3 py-2 rounded-md text-sm ${
                    isActive('/') ? 'bg-brand-gold text-brand-black' : 'text-brand-black hover:bg-gray-100'
                  }`}
                >
                  Inicio
                </Link>

                {/* Mobile: Training */}
                {user.features?.training && (
                  <Link 
                    to="/entrenamiento" 
                    className={`px-3 py-2 rounded-md text-sm ${
                      isActive('/entrenamiento') ? 'bg-brand-gold text-brand-black' : 'text-brand-black hover:bg-gray-100'
                    }`}
                  >
                    Entrenamiento
                  </Link>
                )}

                {/* Mobile: Nutrition */}
                {user.features?.nutrition && (
                  <Link 
                    to="/nutricion" 
                    className={`px-3 py-2 rounded-md text-sm ${
                      isActive('/nutricion') ? 'bg-brand-gold text-brand-black' : 'text-brand-black hover:bg-gray-100'
                    }`}
                  >
                    Nutrición
                  </Link>
                )}

                {/* Mobile: Active Breaks */}
                {user.features?.active_breaks && (
                  <Link 
                    to="/pausas-activas" 
                    className={`px-3 py-2 rounded-md text-sm ${
                      isActive('/pausas-activas') ? 'bg-brand-gold text-brand-black' : 'text-brand-black hover:bg-gray-100'
                    }`}
                  >
                    Pausas Activas
                  </Link>
                )}

                {/* Mobile: Meditation/Exercises */}
                {user.features?.meditation && (
                  <Link 
                    to="/ejercicios" 
                    className={`px-3 py-2 rounded-md text-sm ${
                      isActive('/ejercicios') ? 'bg-brand-gold text-brand-black' : 'text-brand-black hover:bg-gray-100'
                    }`}
                  >
                    Ejercicios
                  </Link>
                )}
                
                <Link 
                  to="/planes" 
                  className={`px-3 py-2 rounded-md text-sm ${
                    isActive('/planes') ? 'bg-brand-gold text-brand-black' : 'text-brand-black hover:bg-gray-100'
                  }`}
                >
                  Planes
                </Link>
                
                {user.role === 'admin' ? (
                  <Link 
                    to="/admin" 
                    className={`px-3 py-2 rounded-md text-sm ${
                      isActive('/admin') ? 'bg-brand-gold text-brand-black' : 'text-brand-black hover:bg-gray-100'
                    }`}
                  >
                    Panel Admin
                  </Link>
                ) : (
                  <>
                    <Link 
                      to="/dashboard" 
                      className={`px-3 py-2 rounded-md text-sm ${
                        isActive('/dashboard') ? 'bg-brand-gold text-brand-black' : 'text-brand-black hover:bg-gray-100'
                      }`}
                    >
                      Mi Panel
                    </Link>
                    <Link 
                      to="/planes-manage" 
                      className={`px-3 py-2 rounded-md text-sm ${
                        isActive('/planes-manage') ? 'bg-brand-gold text-brand-black' : 'text-brand-black hover:bg-gray-100'
                      }`}
                    >
                      Ver Planes
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};

export default Layout;