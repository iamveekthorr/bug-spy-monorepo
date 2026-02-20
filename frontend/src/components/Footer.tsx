import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-white">
      <section className={cn('container m-auto py-8 md:py-12 lg:py-[50px] px-4 md:px-8 lg:px-[75px] mt-10')}>
        <div className="flex flex-col md:flex-row capitalize items-center gap-4 md:gap-0">
          <h4 className="mr-auto font-bold text-lg">BugSpy</h4>
          <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-center">
            <ul className="flex flex-col md:flex-row justify-center md:justify-between gap-3 md:gap-6 text-center md:text-left text-sm">
              <li className="hover:text-blue-400 transition-colors">
                <Link to={'/about'}>about</Link>
              </li>
              <li className="hover:text-blue-400 transition-colors">
                <Link to={'/terms-of-use'}>terms of use</Link>
              </li>
              <li className="hover:text-blue-400 transition-colors">
                <Link to={'/privacy-policy'}>privacy policy</Link>
              </li>
            </ul>

            <Button variant="outline" className="capitalize text-sm border-white/20 hover:bg-white hover:text-black transition-colors">
              login
            </Button>
          </div>
        </div>
      </section>
    </footer>
  );
};

export default Footer;
