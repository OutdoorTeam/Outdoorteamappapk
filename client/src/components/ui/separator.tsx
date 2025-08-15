import * as React from 'react';

import { cn } from '@/lib/utils';

const Separator = React.forwardRef<
  HTMLHRElement,
  React.HTMLAttributes<HTMLHRElement>
>(({ className, ...props }, ref) => (
  <hr
    ref={ref}
    className={cn('border-t border-gray-200 dark:border-gray-700', className)}
    {...props}
  />
));
Separator.displayName = 'Separator';

export { Separator };
