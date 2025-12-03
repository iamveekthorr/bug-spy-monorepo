import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-white">
      <section className={cn('container m-auto py-[50px] px-[75px] mt-10')}>
        <div className="flex capitalize items-center">
          <h4 className="mr-auto">BugSpy</h4>
          <div className="flex gap-3 items-center">
            <ul className="flex justify-between gap-3">
              <li>
                <Link to={'/about'}>about</Link>
              </li>
              <li>
                <Link to={'/terms-of-use'}>terms of use</Link>
              </li>
              <li>
                <Link to={'/privacy-policy'}>privacy policy</Link>
              </li>
            </ul>
            <Button variant="ghost" className="capitalize">
              login
            </Button>
          </div>
        </div>
      </section>
    </footer>
  );
};

export default Footer;
