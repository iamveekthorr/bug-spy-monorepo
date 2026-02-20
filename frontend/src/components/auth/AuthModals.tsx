import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUIStore } from '@/store';
import LoginModal from './LoginModal';
import SignupModal from './SignupModal';
import ForgotPasswordModal from './ForgotPasswordModal';

const AuthModals = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    authModals,
    closeAuthModals,
    openLoginModal,
    openSignupModal,
    openForgotPasswordModal
  } = useUIStore();

  // Check if user was redirected from a protected route
  useEffect(() => {
    const state = location.state as { showLogin?: boolean; from?: { pathname: string } } | null;
    if (state?.showLogin) {
      const redirectPath = state.from?.pathname || '/dashboard';
      openLoginModal(redirectPath);
      // Clear the state using React Router's navigate to prevent modal from reopening
      navigate('/', { replace: true });
    }
  }, [location.state, navigate, openLoginModal]);

  return (
    <>
      <LoginModal
        isOpen={authModals.loginOpen}
        onClose={closeAuthModals}
        onSwitchToSignup={openSignupModal}
        onSwitchToForgotPassword={openForgotPasswordModal}
      />
      
      <SignupModal
        isOpen={authModals.signupOpen}
        onClose={closeAuthModals}
        onSwitchToLogin={openLoginModal}
      />
      
      <ForgotPasswordModal
        isOpen={authModals.forgotPasswordOpen}
        onClose={closeAuthModals}
        onSwitchToLogin={openLoginModal}
      />
    </>
  );
};

export default AuthModals;