import * as React from 'react';

export function Empty({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: React.ReactNode }) {
  return (
    <div className="w-full h-full grid place-items-center text-slate-500">
      <div className="text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/10 text-slate-300">
          {icon}
        </div>
        <div className="text-sm">{title}</div>
        {subtitle && <div className="text-xs opacity-70 mt-1">{subtitle}</div>}
      </div>
    </div>
  );
}


