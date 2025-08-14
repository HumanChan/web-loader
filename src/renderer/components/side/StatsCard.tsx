import * as React from 'react';
import { Card, CardSubtitle, CardTitle } from '../ui/card';
import { BarChart3 } from 'lucide-react';

interface Props {
  live: { total: number; ok: number; failed: number; bytes: number };
}

export function StatsCard({ live }: Props) {
  const total = live.total;
  const ok = live.ok;
  const failed = live.failed;
  const size = live.bytes;
  return (
    <Card>
      <CardTitle className="flex items-center gap-2"><BarChart3 size={16}/> 统计</CardTitle>
      <CardSubtitle className="mb-3">实时捕获统计</CardSubtitle>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-md border border-[var(--border)] bg-[color:var(--panel)] p-3">
          <div className="text-[color:var(--fg-muted)] text-[11px]">总数</div>
          <div className="text-[color:var(--fg)] text-base">{total}</div>
        </div>
        <div className="rounded-md border border-[var(--border)] bg-[color:var(--panel)] p-3">
          <div className="text-[color:var(--fg-muted)] text-[11px]">成功</div>
          <div className="text-[color:var(--fg)] text-base">{ok}</div>
        </div>
        <div className="rounded-md border border-[var(--border)] bg-[color:var(--panel)] p-3">
          <div className="text-[color:var(--fg-muted)] text-[11px]">失败</div>
          <div className="text-[color:var(--fg)] text-base">{failed}</div>
        </div>
        <div className="rounded-md border border-[var(--border)] bg-[color:var(--panel)] p-3">
          <div className="text-[color:var(--fg-muted)] text-[11px]">总大小</div>
          <div className="text-[color:var(--fg)] text-base">{(size/1024/1024).toFixed(1)} MB</div>
        </div>
      </div>
    </Card>
  );
}


