import type React from 'react';

import Footer from '@/components/Footer';
import Header from '@/components/Header';

const Homepage = ({ children }: React.PropsWithChildren) => {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
};

export default Homepage;
