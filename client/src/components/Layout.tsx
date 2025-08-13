import * as React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Home, 
  Dumbbell, 
  Apple, 
  Brain, 
  Coffee, 
  Activity, 
  CreditCard, 
  User,
  Settings
} from 'lucide-react';

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
    // Minimal header for dashboard with bottom navigation
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
        <main className="pb-20">
          {children}
        </main>
        
        {/* Bottom Navigation for logged-in users */}
        <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 px-4 py-2 z-50">
          <div className="flex justify-around max-w-md mx-auto">
            <Link 
              to="/dashboard" 
              className={`flex flex-col items-center space-y-1 px-2 py-1 rounded-lg transition-colors ${
                isActive('/dashboard') ? 'text-[#D3B869]' : 'text-gray-400 hover:text-[#D3B869]'
              }`}
            >
              <Home size={20} />
              <span className="text-xs">Dashboard</span>
            </Link>

            {user.features?.training && (
              <Link 
                to="/training" 
                className={`flex flex-col items-center space-y-1 px-2 py-1 rounded-lg transition-colors ${
                  isActive('/training') ? 'text-[#D3B869]' : 'text-gray-400 hover:text-[#D3B869]'
                }`}
              >
                <Dumbbell size={20} />
                <span className="text-xs">Training</span>
              </Link>
            )}

            {user.features?.nutrition && (
              <Link 
                to="/nutrition" 
                className={`flex flex-col items-center space-y-1 px-2 py-1 rounded-lg transition-colors ${
                  isActive('/nutrition') ? 'text-[#D3B869]' : 'text-gray-400 hover:text-[#D3B869]'
                }`}
              >
                <Apple size={20} />
                <span className="text-xs">Nutrition</span>
              </Link>
            )}

            {user.features?.meditation && (
              <Link 
                to="/meditation" 
                className={`flex flex-col items-center space-y-1 px-2 py-1 rounded-lg transition-colors ${
                  isActive('/meditation') ? 'text-[#D3B869]' : 'text-gray-400 hover:text-[#D3B869]'
                }`}
              >
                <Brain size={20} />
                <span className="text-xs">Meditation</span>
              </Link>
            )}

            {user.features?.active_breaks && (
              <Link 
                to="/active-breaks" 
                className={`flex flex-col items-center space-y-1 px-2 py-1 rounded-lg transition-colors ${
                  isActive('/active-breaks') ? 'text-[#D3B869]' : 'text-gray-400 hover:text-[#D3B869]'
                }`}
              >
                <Coffee size={20} />
                <span className="text-xs">Breaks</span>
              </Link>
            )}

            {user.features?.meditation && (
              <Link 
                to="/exercises" 
                className={`flex flex-col items-center space-y-1 px-2 py-1 rounded-lg transition-colors ${
                  isActive('/exercises') ? 'text-[#D3B869]' : 'text-gray-400 hover:text-[#D3B869]'
                }`}
              >
                <Activity size={20} />
                <span className="text-xs">Exercises</span>
              </Link>
            )}

            <Link 
              to="/plans" 
              className={`flex flex-col items-center space-y-1 px-2 py-1 rounded-lg transition-colors ${
                isActive('/plans') ? 'text-[#D3B869]' : 'text-gray-400 hover:text-[#D3B869]'
              }`}
            >
              <CreditCard size={20} />
              <span className="text-xs">Plans</span>
            </Link>

            <Link 
              to="/profile" 
              className={`flex flex-col items-center space-y-1 px-2 py-1 rounded-lg transition-colors ${
                isActive('/profile') ? 'text-[#D3B869]' : 'text-gray-400 hover:text-[#D3B869]'
              }`}
            >
              <User size={20} />
              <span className="text-xs">Profile</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // For other logged-in users (non-dashboard pages) or admin users
  if (user && user.role === 'user') {
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
                  to="/dashboard" 
                  className={`hover:text-brand-gold transition-colors ${
                    isActive('/dashboard') ? 'text-brand-gold font-medium' : 'text-brand-black'
                  }`}
                >
                  Dashboard
                </Link>

                {user.features?.training && (
                  <Link 
                    to="/training" 
                    className={`hover:text-brand-gold transition-colors ${
                      isActive('/training') ? 'text-brand-gold font-medium' : 'text-brand-black'
                    }`}
                  >
                    Training
                  </Link>
                )}

                {user.features?.nutrition && (
                  <Link 
                    to="/nutrition" 
                    className={`hover:text-brand-gold transition-colors ${
                      isActive('/nutrition') ? 'text-brand-gold font-medium' : 'text-brand-black'
                    }`}
                  >
                    Nutrition
                  </Link>
                )}

                {user.features?.meditation && (
                  <Link 
                    to="/meditation" 
                    className={`hover:text-brand-gold transition-colors ${
                      isActive('/meditation') ? 'text-brand-gold font-medium' : 'text-brand-black'
                    }`}
                  >
                    Meditation
                  </Link>
                )}

                {user.features?.active_breaks && (
                  <Link 
                    to="/active-breaks" 
                    className={`hover:text-brand-gold transition-colors ${
                      isActive('/active-breaks') ? 'text-brand-gold font-medium' : 'text-brand-black'
                    }`}
                  >
                    Active Breaks
                  </Link>
                )}

                {user.features?.meditation && (
                  <Link 
                    to="/exercises" 
                    className={`hover:text-brand-gold transition-colors ${
                      isActive('/exercises') ? 'text-brand-gold font-medium' : 'text-brand-black'
                    }`}
                  >
                    Exercises
                  </Link>
                )}
                
                <Link 
                  to="/plans" 
                  className={`hover:text-brand-gold transition-colors ${
                    isActive('/plans') ? 'text-brand-gold font-medium' : 'text-brand-black'
                  }`}
                >
                  Plans
                </Link>

                <Link 
                  to="/profile" 
                  className={`hover:text-brand-gold transition-colors ${
                    isActive('/profile') ? 'text-brand-gold font-medium' : 'text-brand-black'
                  }`}
                >
                  Profile
                </Link>
                
                <div className="flex items-center space-x-4">
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
              </div>

              {/* Mobile Navigation */}
              <div className="md:hidden">
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
              </div>
            </div>
          </div>
        </nav>
        
        <main className="flex-1 pb-20 md:pb-0">
          {children}
        </main>

        {/* Bottom Navigation for Mobile */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg px-2 py-2 z-50">
          <div className="grid grid-cols-4 gap-1">
            <Link 
              to="/dashboard" 
              className={`flex flex-col items-center space-y-1 px-1 py-2 rounded-lg transition-colors ${
                isActive('/dashboard') ? 'text-brand-gold bg-brand-gold/10' : 'text-brand-black hover:text-brand-gold'
              }`}
            >
              <Home size={18} />
              <span className="text-xs">Dashboard</span>
            </Link>

            {user.features?.training && (
              <Link 
                to="/training" 
                className={`flex flex-col items-center space-y-1 px-1 py-2 rounded-lg transition-colors ${
                  isActive('/training') ? 'text-brand-gold bg-brand-gold/10' : 'text-brand-black hover:text-brand-gold'
                }`}
              >
                <Dumbbell size={18} />
                <span className="text-xs">Training</span>
              </Link>
            )}

            {user.features?.nutrition && (
              <Link 
                to="/nutrition" 
                className={`flex flex-col items-center space-y-1 px-1 py-2 rounded-lg transition-colors ${
                  isActive('/nutrition') ? 'text-brand-gold bg-brand-gold/10' : 'text-brand-black hover:text-brand-gold'
                }`}
              >
                <Apple size={18} />
                <span className="text-xs">Nutrition</span>
              </Link>
            )}

            {user.features?.meditation && (
              <Link 
                to="/meditation" 
                className={`flex flex-col items-center space-y-1 px-1 py-2 rounded-lg transition-colors ${
                  isActive('/meditation') ? 'text-brand-gold bg-brand-gold/10' : 'text-brand-black hover:text-brand-gold'
                }`}
              >
                <Brain size={18} />
                <span className="text-xs">Meditation</span>
              </Link>
            )}

            {user.features?.active_breaks && (
              <Link 
                to="/active-breaks" 
                className={`flex flex-col items-center space-y-1 px-1 py-2 rounded-lg transition-colors ${
                  isActive('/active-breaks') ? 'text-brand-gold bg-brand-gold/10' : 'text-brand-black hover:text-brand-gold'
                }`}
              >
                <Coffee size={18} />
                <span className="text-xs">Breaks</span>
              </Link>
            )}

            {user.features?.meditation && (
              <Link 
                to="/exercises" 
                className={`flex flex-col items-center space-y-1 px-1 py-2 rounded-lg transition-colors ${
                  isActive('/exercises') ? 'text-brand-gold bg-brand-gold/10' : 'text-brand-black hover:text-brand-gold'
                }`}
              >
                <Activity size={18} />
                <span className="text-xs">Exercises</span>
              </Link>
            )}

            <Link 
              to="/plans" 
              className={`flex flex-col items-center space-y-1 px-1 py-2 rounded-lg transition-colors ${
                isActive('/plans') ? 'text-brand-gold bg-brand-gold/10' : 'text-brand-black hover:text-brand-gold'
              }`}
            >
              <CreditCard size={18} />
              <span className="text-xs">Plans</span>
            </Link>

            <Link 
              to="/profile" 
              className={`flex flex-col items-center space-y-1 px-1 py-2 rounded-lg transition-colors ${
                isActive('/profile') ? 'text-brand-gold bg-brand-gold/10' : 'text-brand-black hover:text-brand-gold'
              }`}
            >
              <User size={18} />
              <span className="text-xs">Profile</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Default layout for non-logged in users and admins
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
              
              <Link 
                to="/planes" 
                className={`hover:text-brand-gold transition-colors ${
                  isActive('/planes') ? 'text-brand-gold font-medium' : 'text-brand-black'
                }`}
              >
                Planes
              </Link>
              
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
        </div>
      </nav>
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};

export default Layout;