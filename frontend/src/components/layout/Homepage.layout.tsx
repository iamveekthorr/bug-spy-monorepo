import type React from 'react';

import Footer from '../Footer';
import Header from '../Header';

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
