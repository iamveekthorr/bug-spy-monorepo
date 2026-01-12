import type React from 'react';

import Footer from '@/components/Footer';
import Header from '@/components/Header';
import AuthModals from '@/components/auth/AuthModals';

const Homepage = ({ children }: React.PropsWithChildren) => {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
      <AuthModals />
    </>
  );
};

export default Homepage;
