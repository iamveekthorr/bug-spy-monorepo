import { cn } from '@/lib/utils';
import { Button } from './ui/button';

const Header = () => {
  return (
    <header>
      <section className={cn('container m-auto py-[32px] px-[75px]')}>
        <div className={cn('flex justify-between items-center')}>
          <p className={cn('capitalize')}>BugSpy</p>

          <nav className={cn('flex gap-[2rem] items-center')}>
            <ul className={cn('flex gap-[24px] capitalize')}>
              <li>home</li>
              <li>features</li>
              <li>pricing</li>
              <li>about</li>
            </ul>

            <div className={cn('flex gap-[20px]')}>
              <Button className={cn('capitalize')}>start test</Button>
              <Button className={cn('capitalize')}>login</Button>
            </div>
          </nav>
        </div>
      </section>
    </header>
  );
};

export default Header;
