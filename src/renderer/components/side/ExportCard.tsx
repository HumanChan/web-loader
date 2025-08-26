import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { FolderOpen, Download } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { IPC } from '../../../shared/ipc';

interface Props {
  exportDir: string;
  setExportDir: (dir: string) => void;
  setExportProgress: (p: any) => void;
  setIsRunning: (v: boolean) => void;
  setTimerMs: (v: number) => void;
}

export function ExportCard({ exportDir, setExportDir, setExportProgress, setIsRunning, setTimerMs }: Props) {
  const [astcEnabled, setAstcEnabled] = React.useState<boolean>(true);
  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FolderOpen size={16}/> 导出与路径
        </CardTitle>
        <CardDescription>选择导出目录并执行导出</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 text-xs text-muted-foreground truncate px-3 py-2 rounded-md border bg-muted/50">
              {exportDir || '未选择'}
            </div>
            {exportDir && (
              <Badge variant="secondary" className="text-xs">
                已选择
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={async () => {
              const res = await (window as any).api.invoke(IPC.ExportChooseTargetDir);
              if (!res?.canceled && res?.directory) {
                setExportDir(res.directory);
                toast.success('已选择导出目录', {
                  description: res.directory,
                });
              }
            }}>
              <FolderOpen size={16}/> 选择目录
            </Button>
            <Button 
              size="sm" 
              disabled={!exportDir}
              onClick={async () => {
                setExportProgress({ total: 0, completed: 0, failed: 0, bytesTotal: 0, bytesCompleted: 0 });
                (window as any).api.on(IPC.ExportProgress, (p: any) => setExportProgress(p));
                (window as any).api.on(IPC.ExportDone, () => {
                  toast.success('导出完成', {
                    description: '文件已保存到目标目录',
                  });
                });
                await (window as any).api.invoke(IPC.ExportRun, { astcEnabled });
                setIsRunning(false);
                setTimerMs(0);
              }}
            >
              <Download size={16}/> 导出
            </Button>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              id="export-astc-toggle"
              type="checkbox"
              className="h-3.5 w-3.5 accent-foreground"
              checked={astcEnabled}
              onChange={(e) => setAstcEnabled(e.target.checked)}
            />
            <label htmlFor="export-astc-toggle" className="select-none cursor-pointer">
              同时导出同名 .astc（若存在）
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


