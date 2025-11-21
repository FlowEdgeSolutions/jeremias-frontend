import { useState, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { 
  LayoutDashboard, 
  Users, 
  FolderKanban, 
  Receipt, 
  CheckCircle2, 
  Settings,
  LogOut,
  UserCircle2,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Sun,
  Moon,
  FlaskConical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";

export const AppLayout = () => {
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
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
  const isProjectMember = currentUser?.role === "project_member";

  const navItems = [
    ...(isAdmin ? [
      { path: "/app/leads", label: "Leads", icon: LayoutDashboard },
      { path: "/app/customers", label: "Kunden", icon: Users },
    ] : []),
    { path: "/app/projects", label: "Projekte", icon: FolderKanban },
    ...(isAdmin ? [
      { path: "/app/finance", label: "Finanzen", icon: Receipt },
    ] : []),
    { path: "/app/quality", label: "Qualität", icon: CheckCircle2 },
    ...(isAdmin ? [
      { path: "/app/rules", label: "Projektregeln", icon: Settings },
      { path: "/app/api-test", label: "API Test", icon: FlaskConical },
    ] : []),
  ];

  const isActive = (path: string) => location.pathname === path;

  const SidebarContent = () => (
    <>
      {/* Header with Toggle */}
      <div className="p-6 border-b border-sidebar-border flex items-center justify-between">
        <div className={`transition-opacity duration-200 ${(isCollapsed && !isHovered) && !isMobile ? "opacity-0 w-0" : "opacity-100"}`}>
          <h1 className="text-xl font-bold text-sidebar-foreground whitespace-nowrap">CRM System</h1>
          <p className="text-sm text-sidebar-foreground/70 mt-1 whitespace-nowrap">
            {isAdmin ? "Admin" : isProjectMember ? "Team" : ""}
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

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 ${
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

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className={`w-full text-sidebar-foreground hover:bg-sidebar-accent ${
                (isCollapsed && !isHovered) && !isMobile ? "justify-center px-2" : "justify-start"
              }`}
              title={(isCollapsed && !isHovered) && !isMobile ? currentUser?.name : undefined}
            >
              <UserCircle2 className={`h-5 w-5 flex-shrink-0 ${(isCollapsed && !isHovered) && !isMobile ? "" : "mr-2"}`} />
              <span className={`transition-all duration-200 truncate ${
                (isCollapsed && !isHovered) && !isMobile ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
              }`}>
                {currentUser?.name}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 z-50">
            <DropdownMenuLabel>Mein Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/app/profile" className="cursor-pointer">
                <UserCircle2 className="mr-2 h-4 w-4" />
                Profil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Abmelden
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
            {navItems.find(item => isActive(item.path))?.label || "Dashboard"}
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
