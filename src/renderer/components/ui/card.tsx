import * as React from 'react';
import { twMerge } from 'tailwind-merge';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={twMerge('card p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={twMerge('text-sm mb-2 font-medium text-[color:var(--fg)]', className)} {...props} />;
}

export function CardSubtitle({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={twMerge('text-xs text-[color:var(--fg-muted)]', className)} {...props} />;
}


