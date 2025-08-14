import * as React from 'react';
import * as RSeparator from '@radix-ui/react-separator';
import { twMerge } from 'tailwind-merge';

export function Separator({ className, ...props }: React.ComponentPropsWithoutRef<typeof RSeparator.Root>) {
  return (
    <RSeparator.Root
      className={twMerge('bg-[color:var(--border)] data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px', className)}
      {...props}
    />
  );
}


