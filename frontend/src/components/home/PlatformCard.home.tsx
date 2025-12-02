import type React from 'react';

const PlatformCard = ({ children }: React.PropsWithChildren) => (
  <>
    <div className="w-[400px] h-[230px] flex flex-col justify-center align-center text-center text-sm p-3 border rounded-md">
      {children}
    </div>
  </>
);

export default PlatformCard;
