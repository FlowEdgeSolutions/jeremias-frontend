import { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { 
  LayoutDashboard, 
  Users, 
  FolderKanban, 
  Receipt, 
  CheckCircle2, 
  LogOut,
  UserCircle2,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Sun,
  Moon,
  Mail,
  Archive,
  UsersRound,
  LucideIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

export const AppLayout = () => {
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = useState(true); // Start collapsed
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isMobileMenuOpen]);

  const isAdmin = currentUser?.role === "admin";
  const isProjectManager = currentUser?.role === "project_manager";

  // Menu categories with items
  type NavItem = { path: string; label: string; icon: LucideIcon };
  type NavCategory = { category: string; items: NavItem[] };

  const navCategories: NavCategory[] = [
    // Vertrieb - nur für Admin
    ...(isAdmin ? [{
      category: "Vertrieb",
      items: [
        { path: "/app/leads", label: "Leads", icon: LayoutDashboard },
        { path: "/app/customers", label: "Kunden", icon: Users },
      ]
    }] : []),
    // Projekte - für alle
    {
      category: "Projekte",
      items: [
        { path: "/app/projects", label: "Projekte", icon: FolderKanban },
        ...(isAdmin ? [{ path: "/app/quality", label: "Qualität", icon: CheckCircle2 }] : []),
        { path: "/app/archive", label: "Archiv", icon: Archive },
      ]
    },
    // Finanzen - nur für Admin
    ...(isAdmin ? [{
      category: "Finanzen",
      items: [
        { path: "/app/finance", label: "Rechnungen", icon: Receipt },
      ]
    }] : []),
    // Kommunikation - nur für Admin
    ...(isAdmin ? [{
      category: "Kommunikation",
      items: [
        { path: "/app/emails", label: "E-Mails", icon: Mail },
      ]
    }] : []),
    // Administration - nur für Admin
    ...(isAdmin ? [{
      category: "Administration",
      items: [
        { path: "/app/users", label: "Accounts", icon: UsersRound },
      ]
    }] : []),
  ];

  // Flatten for header title lookup
  const allNavItems = navCategories.flatMap(cat => cat.items);

  const isActive = (path: string) => location.pathname === path;

  const SidebarContent = () => (
    <>
      {/* Header with Toggle */}
      <div className="p-6 border-b border-sidebar-border flex items-center justify-between">
        <div className={`transition-opacity duration-200 ${(isCollapsed && !isHovered) && !isMobile ? "opacity-0 w-0" : "opacity-100"}`}>
          <img 
            src="/teamnoahLogo.png" 
            alt="Team Noah Logo" 
            className="h-8 w-auto dark:invert"
          />
          <p className="text-sm text-sidebar-foreground/70 mt-1 whitespace-nowrap">
            {isAdmin ? "Admin" : isProjectManager ? "Projektmanager" : ""}
          </p>
        </div>
        {isMobile ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-sidebar-foreground hover:bg-sidebar-accent flex-shrink-0"
          >
            <X className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-sidebar-foreground hover:bg-sidebar-accent flex-shrink-0"
            title={isCollapsed ? "Sidebar fixieren" : "Sidebar auto-minimieren"}
          >
            {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </Button>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
        {navCategories.map((category, catIndex) => (
          <div key={category.category} className="space-y-1">
            {/* Category Label - hidden when collapsed */}
            <div className={`px-4 py-1 transition-all duration-200 ${
              (isCollapsed && !isHovered) && !isMobile ? "opacity-0 h-0 overflow-hidden" : "opacity-100"
            }`}>
              <span className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                {category.category}
              </span>
            </div>
            {/* Divider line when collapsed */}
            {(isCollapsed && !isHovered) && !isMobile && catIndex > 0 && (
              <div className="border-t border-sidebar-border mx-2 my-2" />
            )}
            {/* Category Items */}
            {category.items.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-md transition-all duration-200 ${
                  isActive(item.path)
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                } ${(isCollapsed && !isHovered) && !isMobile ? "justify-center" : ""}`}
                title={(isCollapsed && !isHovered) && !isMobile ? item.label : undefined}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span className={`transition-all duration-200 whitespace-nowrap ${
                  (isCollapsed && !isHovered) && !isMobile ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
                }`}>
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-sidebar-border space-y-2">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          onClick={toggleTheme}
          className={`w-full text-sidebar-foreground hover:bg-sidebar-accent ${
            (isCollapsed && !isHovered) && !isMobile ? "justify-center px-2" : "justify-start"
          }`}
          title={(isCollapsed && !isHovered) && !isMobile ? (theme === "light" ? "Dark Mode" : "Light Mode") : undefined}
        >
          {theme === "light" ? (
            <Moon className={`h-5 w-5 flex-shrink-0 ${(isCollapsed && !isHovered) && !isMobile ? "" : "mr-2"}`} />
          ) : (
            <Sun className={`h-5 w-5 flex-shrink-0 ${(isCollapsed && !isHovered) && !isMobile ? "" : "mr-2"}`} />
          )}
          <span className={`transition-all duration-200 truncate ${
            (isCollapsed && !isHovered) && !isMobile ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
          }`}>
            {theme === "light" ? "Dark Mode" : "Light Mode"}
          </span>
        </Button>

        {/* Profile Link */}
        <Link
          to="/app/profile"
          className={`flex items-center w-full text-sidebar-foreground hover:bg-sidebar-accent rounded-md px-4 py-2 transition-colors ${
            (isCollapsed && !isHovered) && !isMobile ? "justify-center px-2" : "justify-start"
          } ${isActive("/app/profile") ? "bg-sidebar-accent" : ""}`}
          title={(isCollapsed && !isHovered) && !isMobile ? currentUser?.name : undefined}
        >
          <UserCircle2 className={`h-5 w-5 flex-shrink-0 ${(isCollapsed && !isHovered) && !isMobile ? "" : "mr-2"}`} />
          <span className={`transition-all duration-200 truncate ${
            (isCollapsed && !isHovered) && !isMobile ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
          }`}>
            {currentUser?.name}
          </span>
        </Link>

        {/* Logout Button */}
        <Button
          variant="ghost"
          onClick={logout}
          className={`w-full text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive ${
            (isCollapsed && !isHovered) && !isMobile ? "justify-center px-2" : "justify-start"
          }`}
          title={(isCollapsed && !isHovered) && !isMobile ? "Abmelden" : undefined}
        >
          <LogOut className={`h-5 w-5 flex-shrink-0 ${(isCollapsed && !isHovered) && !isMobile ? "" : "mr-2"}`} />
          <span className={`transition-all duration-200 truncate ${
            (isCollapsed && !isHovered) && !isMobile ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
          }`}>
            Abmelden
          </span>
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Mobile Overlay */}
      {isMobile && isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop */}
      {!isMobile && (
        <aside 
          className={`bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 ease-in-out h-screen flex-shrink-0 ${
            (isCollapsed && !isHovered) ? "w-20" : "w-64"
          }`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <SidebarContent />
        </aside>
      )}

      {/* Sidebar - Mobile (Drawer) */}
      {isMobile && (
        <aside 
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 ease-in-out ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <SidebarContent />
        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 md:px-8 flex-shrink-0">
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(true)}
              className="mr-2"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground truncate">
            {isActive("/app/profile") ? "Profil" : isActive("/app/users") ? "Accountverwaltung" : (allNavItems.find(item => isActive(item.path))?.label || "Dashboard")}
          </h2>
          <div className="w-10" /> {/* Spacer for centering on mobile */}
        </header>

        <div className="flex-1 p-4 md:p-8 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
