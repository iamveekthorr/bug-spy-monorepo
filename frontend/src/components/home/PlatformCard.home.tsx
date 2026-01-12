import type React from 'react';

const PlatformCard = ({ children }: React.PropsWithChildren) => (
  <>
    <div className="w-full max-w-[400px] h-[200px] md:h-[230px] flex flex-col justify-center items-center text-center text-sm p-4 md:p-6 border rounded-md bg-white/5 backdrop-blur-sm">
      {children}
    </div>
  </>
);

export default PlatformCard;
