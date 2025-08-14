import * as React from 'react';
import { Card, CardSubtitle, CardTitle } from '../ui/card';

interface Props {
  progress: { total: number; completed: number; failed: number; bytesTotal: number; bytesCompleted: number } | null;
}

export function ProgressCard({ progress }: Props) {
  const pct = progress && progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
  return (
    <Card>
      <CardTitle>导出进度</CardTitle>
      <CardSubtitle className="mb-3">{progress ? `${progress.completed}/${progress.total}（失败 ${progress.failed}）` : '未开始'}</CardSubtitle>
      <div className="w-full h-2 rounded bg-slate-700/40 overflow-hidden">
        <div className="h-full bg-[color:var(--accent)] transition-all" style={{ width: `${pct}%` }} />
      </div>
      {progress && (
        <div className="mt-2 text-[11px] text-slate-400">{(progress.bytesCompleted/1024/1024).toFixed(1)}MB / {(progress.bytesTotal/1024/1024).toFixed(1)}MB</div>
      )}
    </Card>
  );
}


