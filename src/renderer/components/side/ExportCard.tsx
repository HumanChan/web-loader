import * as React from 'react';
import { Card, CardSubtitle, CardTitle } from '../ui/card';
import { FolderOpen, Download } from 'lucide-react';
import { Button } from '../ui/button';
import { Toast } from '../ui/toast';
import { IPC } from '../../../shared/ipc';

interface Props {
  exportDir: string;
  setExportDir: (dir: string) => void;
  setExportProgress: (p: any) => void;
  setIsRunning: (v: boolean) => void;
  setTimerMs: (v: number) => void;
}

export function ExportCard({ exportDir, setExportDir, setExportProgress, setIsRunning, setTimerMs }: Props) {
  const [showToast, setShowToast] = React.useState(false);
  return (
    <Card className="mb-4">
      <CardTitle className="flex items-center gap-2"><FolderOpen size={16}/> 导出与路径</CardTitle>
      <CardSubtitle className="mb-3">选择导出目录并执行导出</CardSubtitle>
      <div className="flex items-center gap-2">
        <div className="flex-1 text-xs text-slate-300 truncate px-2 py-2 rounded-md border border-[var(--border)] bg-[color:var(--panel)]">
          {exportDir || '未选择'}
        </div>
        <Button variant="outline" onClick={async () => {
          const res = await (window as any).api.invoke(IPC.ExportChooseTargetDir);
          if (!res?.canceled && res?.directory) setExportDir(res.directory);
        }}><FolderOpen size={16}/> 选择</Button>
        <Button variant="primary" onClick={async () => {
          setExportProgress({ total: 0, completed: 0, failed: 0, bytesTotal: 0, bytesCompleted: 0 });
          (window as any).api.on(IPC.ExportProgress, (p: any) => setExportProgress(p));
          (window as any).api.on(IPC.ExportDone, () => {
            setShowToast(true);
          });
          await (window as any).api.invoke(IPC.ExportRun, {});
          setIsRunning(false);
          setTimerMs(0);
        }}><Download size={16}/> 导出</Button>
      </div>
      <Toast open={showToast} title="导出完成" subtitle="文件已保存到目标目录" onClose={() => setShowToast(false)} />
    </Card>
  );
}


