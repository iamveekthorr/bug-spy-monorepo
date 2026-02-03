import type React from 'react';
import { cn } from '@/lib/utils';

interface PlatformCardProps extends React.PropsWithChildren {
  className?: string;
}

const PlatformCard = ({ children, className }: PlatformCardProps) => (
  <>
    <div className={cn("w-full max-w-[400px] h-[200px] md:h-[230px] flex flex-col justify-center items-center text-center text-sm p-4 md:p-6 border rounded-md bg-white/5 backdrop-blur-sm group", className)}>
      {children}
    </div>
  </>
);

export default PlatformCard;
