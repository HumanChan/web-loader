import * as React from 'react';

export function Toast({ open, title, subtitle, onClose }: { open: boolean; title: string; subtitle?: string; onClose?: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 pointer-events-none">
      <div className="absolute right-4 bottom-4 pointer-events-auto">
        <div className="card shadow-lg p-4 min-w-[240px]">
          <div className="text-sm text-[color:var(--fg)]">{title}</div>
          {subtitle && <div className="text-xs text-[color:var(--fg-muted)] mt-1">{subtitle}</div>}
          <div className="mt-3 text-right">
            <button className="btn h-8 px-3" onClick={onClose}>知道了</button>
          </div>
        </div>
      </div>
    </div>
  );
}


