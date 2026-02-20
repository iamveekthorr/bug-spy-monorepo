import clsx from 'clsx';
import { type ComponentPropsWithRef, forwardRef } from 'react';

interface ISvgIcon extends ComponentPropsWithRef<'svg'> {
  iconName: string;
}

const SvgIcon = forwardRef<SVGSVGElement, ISvgIcon>(
  ({ iconName, ...otherProps }, ref) => {
    return (
      <svg ref={ref} {...otherProps} className={clsx('w-10 h-10')}>
        <use href={`/sprite.svg#${iconName}`} />
      </svg>
    );
  },
);

SvgIcon.displayName = 'SvgIcon';

export default SvgIcon;
