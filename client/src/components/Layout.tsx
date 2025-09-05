
import * as React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  Home,
  Dumbbell,
  Apple,
  Brain,
  Coffee,
  Activity,
  CreditCard,
  User,
  Settings,
  LogOut,
} from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  React.useEffect(() => {
    // Role-based redirects after login
    if (user && location.pathname === "/login") {
      if (user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    }
  }, [user, location.pathname, navigate]);

  const isActive = (path: string) => location.pathname === path;

  // Check if user can access a specific feature
  const canAccessFeature = (feature: string) => {
    if (!user) return false;
    if (user.role === "admin") return true;

    switch (feature) {
      case "training":
        return user.features?.training || false;
      case "nutrition":
        return user.features?.nutrition || false;
      case "meditation":
        return user.features?.meditation || false;
      case "active_breaks":
        return user.features?.active_breaks || false;
      default:
        return true;
    }
  };

  // Navigation items configuration
  const getNavigationItems = () => {
    const items = [];

    // Dashboard - always available for logged-in users
    if (user) {
      items.push({
        path: "/dashboard",
        label: "Dashboard",
        icon: Home,
        available: true,
      });
    }

    // Training - show if user has training features or is admin
    if (user && (canAccessFeature("training") || user.role === "admin")) {
      items.push({
        path: "/training",
        label: "Entrenamiento",
        icon: Dumbbell,
        available: canAccessFeature("training"),
      });
    }

    // Nutrition - show if user has nutrition features or is admin
    if (user && (canAccessFeature("nutrition") || user.role === "admin")) {
      items.push({
        path: "/nutrition",
        label: "Nutrición",
        icon: Apple,
        available: canAccessFeature("nutrition"),
      });
    }

    // Meditation - show if user has meditation features or is admin
    if (user && (canAccessFeature("meditation") || user.role === "admin")) {
      items.push({
        path: "/meditation",
        label: "Meditación",
        icon: Brain,
        available: canAccessFeature("meditation"),
      });
    }

    // Active Breaks - show if user has active_breaks features or is admin
    if (user && (canAccessFeature("active_breaks") || user.role === "admin")) {
      items.push({
        path: "/active-breaks",
        label: "Pausas Activas",
        icon: Coffee,
        available: canAccessFeature("active_breaks"),
      });
    }

    // Exercises - show if user has training features or is admin
    if (user && (canAccessFeature("training") || user.role === "admin")) {
      items.push({
        path: "/exercises",
        label: "Ejercicios",
        icon: Activity,
        available: canAccessFeature("training"),
      });
    }

    // Plans - always available
    items.push({
      path: "/plans",
      label: "Planes",
      icon: CreditCard,
      available: true,
    });

    // Profile - always available for logged-in users
    if (user && user.role !== "admin") {
      items.push({
        path: "/profile",
        label: "Perfil",
        icon: User,
        available: true,
      });
    }

    // Admin Panel - only for admins
    if (user && user.role === "admin") {
      items.push({
        path: "/admin",
        label: "Admin",
        icon: Settings,
        available: true,
      });
    }

    return items;
  };

  const navigationItems = getNavigationItems();

  // Show full navigation for dashboard users too
  if (user && user.role === "user") {
    return (
      <div className="min-h-screen bg-background">
        {/* Top Navigation for Mobile */}
        <div className="md:hidden fixed top-0 left-0 right-0 bg-card border-b shadow-lg px-1 py-2 z-50">
          <div className="flex items-center overflow-x-auto whitespace-nowrap">
            {navigationItems.map((item) => (
              <Link
                key={item.path}
                to={item.available ? item.path : "#"}
                className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-colors relative ${
                  isActive(item.path)
                    ? "text-primary"
                    : item.available
                      ? "text-foreground hover:text-primary"
                      : "text-muted-foreground cursor-not-allowed"
                }`}
                onClick={(e) => {
                  if (!item.available) {
                    e.preventDefault();
                    alert(
                      "Esta funcionalidad no está disponible en tu plan actual",
                    );
                  }
                }}
              >
                <item.icon size={20} />
                {!item.available && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                )}
              </Link>
            ))}
            <button onClick={handleLogout} className="text-foreground hover:text-primary px-3">
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="border-b bg-card shadow-sm hidden md:block">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center">
                <img 
                  src="/assets/logo-with-text-black.png" 
                  alt="Outdoor Team Logo" 
                  className="h-10 w-auto"
                />
              </Link>

              {/* Desktop Navigation Links */}
              <div className="flex items-center space-x-6">
                {navigationItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.available ? item.path : "#"}
                    className={`hover:text-primary transition-colors font-medium ${
                      isActive(item.path)
                        ? "text-primary font-bold"
                        : item.available
                          ? "text-foreground"
                          : "text-muted-foreground cursor-not-allowed"
                    }`}
                    onClick={(e) => {
                      if (!item.available) {
                        e.preventDefault();
                        alert(
                          "Esta funcionalidad no está disponible en tu plan actual",
                        );
                      }
                    }}
                  >
                    {item.label}
                    {!item.available && (
                      <span className="text-red-500 ml-1">🔒</span>
                    )}
                  </Link>
                ))}

                <div className="flex items-center space-x-4">
                  <span className="text-sm text-foreground font-medium">
                    Hola, {user.full_name.split(" ")[0]}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    Cerrar Sesión
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </nav>

        <main className="flex-1 pt-20 md:pt-0">{children}</main>
      </div>
    );
  }

  // Default layout for non-logged in users and admins
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center">
              <img 
                src="/assets/logo-with-text-black.png" 
                alt="Outdoor Team Logo" 
                className="h-12 w-auto"
              />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              <Link
                to="/"
                className={`hover:text-primary transition-colors ${
                  isActive("/")
                    ? "text-primary font-medium"
                    : "text-foreground"
                }`}
              >
                Inicio
              </Link>

              <Link
                to="/plans"
                className={`hover:text-primary transition-colors ${
                  isActive("/plans")
                    ? "text-primary font-medium"
                    : "text-foreground"
                }`}
              >
                Planes
              </Link>

              {user ? (
                <div className="flex items-center space-x-4">
                  {user.role === "admin" ? (
                    <Link
                      to="/admin"
                      className={`hover:text-primary transition-colors ${
                        isActive("/admin")
                          ? "text-primary font-medium"
                          : "text-foreground"
                      }`}
                    >
                      Panel Admin
                    </Link>
                  ) : (
                    <Link
                      to="/dashboard"
                      className={`hover:text-primary transition-colors ${
                        isActive("/dashboard")
                          ? "text-primary font-medium"
                          : "text-foreground"
                      }`}
                    >
                      Mi Panel
                    </Link>
                  )}
                  <span className="text-sm text-muted-foreground">
                    Hola, {user.full_name.split(" ")[0]}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
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
                      className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                    >
                      Iniciar Sesión
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
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
                    {user.full_name.split(" ")[0]}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    Salir
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-1">
                  <Link to="/login">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                    >
                      Login
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button
                      size="sm"
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      Sign Up
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main className="flex-1">{children}</main>
    </div>
  );
};

export default Layout;
