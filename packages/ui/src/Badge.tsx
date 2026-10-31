import * as React from 'react';
import { cn } from './utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'pink' | 'veg' | 'non_veg';
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const variants = {
    default: 'bg-gray-100 text-gray-800 border-gray-200',
    success: 'bg-[#E7F7F4] text-[#0E937E] border-[#12B39A]/20',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-[#EBF0FF] text-[#3B4FE0] border-[#3B4FE0]/20',
    pink: 'bg-[#FDEBF3] text-[#E91E7B] border-[#E91E7B]/20',
    veg: 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold',
    non_veg: 'bg-red-50 text-red-700 border-red-300 font-bold',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border select-none',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

