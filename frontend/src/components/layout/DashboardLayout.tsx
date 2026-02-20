import { useState, useEffect } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import {
  Home,
  TestTube,
  FileText,
  Calendar,
  Settings,
  User,
  Bell,
  Menu,
  X,
  LogOut,
  ChevronDown,
  History,
  BarChart3,
  Layers,
} from 'lucide-react';
import { useAuthStore, useUIStore } from '@/store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/types';
import { useTestSync } from '@/hooks/useTestSync';

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: 'Home' },
  { name: 'Tests', href: '/dashboard/tests', icon: 'TestTube' },
  { name: 'History', href: '/dashboard/history', icon: 'History' },
  { name: 'Analytics', href: '/dashboard/analytics', icon: 'BarChart3' },
  { name: 'Scheduled', href: '/dashboard/scheduled', icon: 'Calendar' },
  { name: 'Batch Tests', href: '/dashboard/batch-tests', icon: 'Layers' },
  { name: 'Settings', href: '/dashboard/settings', icon: 'Settings' },
];

const iconMap = {
  Home,
  TestTube,
  FileText,
  Calendar,
  Settings,
  History,
  BarChart3,
  Layers,
};

const DashboardLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useUIStore();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Sync IndexedDB tests with backend when user logs in
  const { isSyncing, syncError, syncStats } = useTestSync();

  // Show sync notification
  useEffect(() => {
    if (syncStats && syncStats.syncedCount > 0) {
      console.log(`✅ Synced ${syncStats.syncedCount} local tests to your account`);
    }
    if (syncError) {
      console.error('❌ Failed to sync local tests:', syncError);
    }
  }, [syncStats, syncError]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="h-screen flex bg-background">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-border transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-border">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
                <TestTube size={18} className="text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">
                <span className="text-foreground">Bug</span>
                <span className="text-primary">Spy</span>
              </span>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden"
            >
              <X size={20} />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navigation.map((item) => {
              const Icon = iconMap[item.icon as keyof typeof iconMap];
              const active = isActive(item.href);
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200',
                    active
                      ? 'bg-secondary text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                  onClick={() => {
                    if (window.innerWidth < 1024) {
                      setSidebarOpen(false);
                    }
                  }}
                >
                  <Icon size={20} className="mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-border">
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center w-full px-3 py-2.5 text-sm rounded-xl hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
              >
                <div className="w-9 h-9 bg-secondary rounded-xl flex items-center justify-center">
                  <User size={18} className="text-primary" />
                </div>
                <div className="ml-3 flex-1 text-left">
                  <p className="text-sm font-medium text-foreground">{user?.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{user?.plan} Plan</p>
                </div>
                <ChevronDown size={16} className={cn('text-muted-foreground transition-transform', userDropdownOpen && 'rotate-180')} />
              </button>

              {/* User dropdown */}
              {userDropdownOpen && (
                <div className="absolute bottom-full left-0 w-full mb-2 bg-white border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="py-1">
                    <Link
                      to="/dashboard/profile"
                      className="flex items-center px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                      onClick={() => setUserDropdownOpen(false)}
                    >
                      <User size={16} className="mr-2" />
                      Profile
                    </Link>
                    <Link
                      to="/dashboard/settings"
                      className="flex items-center px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                      onClick={() => setUserDropdownOpen(false)}
                    >
                      <Settings size={16} className="mr-2" />
                      Settings
                    </Link>
                    <div className="border-t border-border">
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          handleLogout();
                        }}
                        className="flex items-center w-full px-4 py-2.5 text-sm text-destructive hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={16} className="mr-2" />
                        Sign out
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-border h-16 sticky top-0 z-10">
          <div className="flex items-center justify-between px-6 h-full">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebar}
                className="lg:hidden mr-2"
              >
                <Menu size={20} />
              </Button>
              
              <div className="hidden lg:block">
                <h1 className="text-lg font-semibold text-foreground">
                  {navigation.find(item => isActive(item.href))?.name || 'Dashboard'}
                </h1>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Notifications */}
              <Button variant="ghost" size="icon-sm" className="relative">
                <Bell size={20} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>
              </Button>

              {/* User menu for larger screens */}
              <div className="hidden lg:flex items-center text-sm">
                <div className="w-9 h-9 bg-secondary rounded-xl flex items-center justify-center mr-3">
                  <User size={18} className="text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{user?.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{user?.plan} Plan</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-muted/30">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;