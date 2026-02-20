import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Menu, X, TestTube } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore, useUIStore } from '@/store';

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuthStore();
  const { openLoginModal, openSignupModal } = useUIStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <section className={cn('container m-auto py-4 px-4 md:px-[75px]')}>
        <div className={cn('flex justify-between items-center')}>
          <Link to="/" className={cn('flex items-center gap-2')}>
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
              <TestTube size={18} className="text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">
              <span className="text-foreground">Bug</span>
              <span className="text-primary">Spy</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className={cn('hidden lg:flex gap-8 items-center')}>
            <ul className={cn('flex gap-6 text-sm font-medium text-muted-foreground')}>
              <li>
                <Link to="/" className="hover:text-primary transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-primary transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-primary transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-primary transition-colors">
                  About
                </Link>
              </li>
            </ul>

            <div className={cn('flex gap-4 items-center')}>
              {isAuthenticated ? (
                <div className="flex items-center gap-4">
                  <Link to="/dashboard">
                    <Button variant="outline" size="sm">
                      Dashboard
                    </Button>
                  </Link>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">Hi, {user?.email?.split('@')[0]}</span>
                    <Button
                      onClick={handleLogout}
                      variant="ghost"
                      size="sm"
                    >
                      Logout
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <Button onClick={openSignupModal}>
                    Free Audit
                  </Button>
                  <button
                    onClick={() => openLoginModal()}
                    className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                  >
                    Login
                  </button>
                </>
              )}
            </div>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden mt-4 py-4 border-t border-gray-200">
            <nav className="flex flex-col space-y-4">
              <ul className="flex flex-col space-y-3 capitalize text-sm font-medium">
                <li>
                  <Link 
                    to="/" 
                    className="hover:text-blue-600 cursor-pointer transition-colors py-2 block"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    home
                  </Link>
                </li>
                <li className="hover:text-blue-600 cursor-pointer transition-colors py-2">features</li>
                <li className="hover:text-blue-600 cursor-pointer transition-colors py-2">pricing</li>
                <li className="hover:text-blue-600 cursor-pointer transition-colors py-2">about</li>
              </ul>

              <div className="flex flex-col space-y-3 pt-4 border-t border-gray-200">
                {isAuthenticated ? (
                  <>
                    <span className="text-sm text-gray-600 px-2">Hi, {user?.name?.split(' ')[0]}</span>
                    <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button className="capitalize text-sm w-full" variant="outline">
                        Dashboard
                      </Button>
                    </Link>
                    <Button 
                      onClick={() => {
                        handleLogout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="capitalize text-sm w-full" 
                      variant="ghost"
                    >
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      onClick={() => {
                        openSignupModal();
                        setIsMobileMenuOpen(false);
                      }}
                      className="capitalize text-sm w-full" 
                      variant="outline"
                    >
                      sign up
                    </Button>
                    <Button 
                      onClick={() => {
                        openLoginModal();
                        setIsMobileMenuOpen(false);
                      }}
                      className="capitalize text-sm w-full"
                    >
                      login
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </section>
    </header>
  );
};

export default Header;
