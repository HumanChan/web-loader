import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';

const buttonVariants = cva(
  'inline-flex items-center gap-1 justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-[color:var(--panel)] text-slate-100 border border-[var(--border)] hover:bg-slate-800/60',
        primary: 'text-white bg-gradient-to-r from-[#7c3aed] to-[#22d3ee] hover:brightness-110',
        ghost: 'bg-transparent hover:bg-white/5 border border-transparent',
        outline: 'bg-transparent border border-[var(--border)] hover:bg-white/5',
        destructive: 'bg-[#ef4444] text-white hover:brightness-110',
      },
      size: {
        sm: 'h-8 px-2',
        md: 'h-9 px-3',
        lg: 'h-10 px-4',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={twMerge(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = 'Button';


