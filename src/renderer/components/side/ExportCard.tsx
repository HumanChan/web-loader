import * as React from 'react';
import { Card, CardSubtitle, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { IPC } from '../../../shared/ipc';

interface Props {
  exportDir: string;
  setExportDir: (dir: string) => void;
  setExportProgress: (p: any) => void;
  setIsRunning: (v: boolean) => void;
  setTimerMs: (v: number) => void;
}

export function ExportCard({ exportDir, setExportDir, setExportProgress, setIsRunning, setTimerMs }: Props) {
  return (
    <Card className="mb-4">
      <CardTitle>导出与路径</CardTitle>
      <CardSubtitle className="mb-3">选择导出目录并执行导出</CardSubtitle>
      <div className="flex items-center gap-2">
        <div className="flex-1 text-xs text-slate-300 truncate px-2 py-2 rounded-md border border-[var(--border)] bg-[color:var(--panel)]">
          {exportDir || '未选择'}
        </div>
        <Button variant="outline" onClick={async () => {
          const res = await (window as any).api.invoke(IPC.ExportChooseTargetDir);
          if (!res?.canceled && res?.directory) setExportDir(res.directory);
        }}>选择</Button>
        <Button variant="primary" onClick={async () => {
          setExportProgress({ total: 0, completed: 0, failed: 0, bytesTotal: 0, bytesCompleted: 0 });
          (window as any).api.on(IPC.ExportProgress, (p: any) => setExportProgress(p));
          await (window as any).api.invoke(IPC.ExportRun, {});
          setIsRunning(false);
          setTimerMs(0);
        }}>导出</Button>
      </div>
    </Card>
  );
}


