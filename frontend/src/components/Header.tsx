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
    <header>
      <section className={cn('container m-auto py-[32px] px-4 md:px-[75px]')}>
        <div className={cn('flex justify-between items-center')}>
          <Link to="/" className={cn('flex items-center')}>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
              <TestTube size={16} className="text-white" />
            </div>
            <p className={cn('capitalize font-bold text-lg')}>BugSpy</p>
          </Link>

          {/* Desktop Navigation */}
          <nav className={cn('hidden lg:flex gap-[2rem] items-center')}>
            <ul className={cn('flex gap-[24px] capitalize text-sm font-medium')}>
              <li>
                <Link to="/" className="hover:text-blue-600 cursor-pointer transition-colors">
                  home
                </Link>
              </li>
              <li className="hover:text-blue-600 cursor-pointer transition-colors">features</li>
              <li className="hover:text-blue-600 cursor-pointer transition-colors">pricing</li>
              <li className="hover:text-blue-600 cursor-pointer transition-colors">about</li>
            </ul>

            <div className={cn('flex gap-[20px]')}>
              {isAuthenticated ? (
                <div className="flex items-center gap-4">
                  <Link to="/dashboard">
                    <Button className={cn('capitalize text-sm')} variant="outline">
                      Dashboard
                    </Button>
                  </Link>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">Hi, {user?.name?.split(' ')[0]}</span>
                    <Button 
                      onClick={handleLogout}
                      className={cn('capitalize text-sm')} 
                      variant="ghost"
                      size="sm"
                    >
                      Logout
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <Button 
                    onClick={openSignupModal}
                    className={cn('capitalize text-sm')} 
                    variant="outline"
                  >
                    sign up
                  </Button>
                  <Button 
                    onClick={openLoginModal}
                    className={cn('capitalize text-sm')}
                  >
                    login
                  </Button>
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
