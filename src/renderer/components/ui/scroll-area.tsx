import * as React from 'react';
import * as RScroll from '@radix-ui/react-scroll-area';

export function ScrollArea({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <RScroll.Root className={className} type="auto">
      <RScroll.Viewport className="w-full h-full">
        {children}
      </RScroll.Viewport>
      <RScroll.Scrollbar orientation="vertical" className="w-2 bg-transparent">
        <RScroll.Thumb className="rounded-full" style={{ backgroundColor: 'var(--scroll-thumb)' }} />
      </RScroll.Scrollbar>
    </RScroll.Root>
  );
}


