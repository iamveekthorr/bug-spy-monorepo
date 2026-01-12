import { useUIStore } from '@/store';
import LoginModal from './LoginModal';
import SignupModal from './SignupModal';
import ForgotPasswordModal from './ForgotPasswordModal';

const AuthModals = () => {
  const { 
    authModals, 
    closeAuthModals, 
    openLoginModal, 
    openSignupModal, 
    openForgotPasswordModal 
  } = useUIStore();

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