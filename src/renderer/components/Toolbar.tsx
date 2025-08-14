import * as React from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { IPC } from '../../shared/ipc';

interface Props {
  url: string;
  setUrl: (v: string) => void;
  onNavigated: (finalUrl: string, partition?: string) => void;
  setIsRunning: (v: boolean) => void;
  setTimerMs: (v: number) => void;
  setExportDir: (v: string) => void;
  setExportProgress: (v: any) => void;
}

export function Toolbar({ url, setUrl, onNavigated, setIsRunning, setTimerMs, setExportDir, setExportProgress }: Props) {
  return (
    <div className="flex h-14 items-center gap-2 border-b border-[var(--border)] px-3 glass">
      <Input
        className="flex-1 h-9"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="输入 URL"
      />
      <Button size="sm" onClick={async () => {
        const raw = url.trim();
        const finalUrl = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
        const res = await (window as any).api.invoke(IPC.NavigateTo, { url: finalUrl });
        onNavigated(finalUrl, res?.partition);
        setTimerMs(0);
        setIsRunning(true);
      }}>确定</Button>
      <Button size="sm" variant="outline" onClick={async () => {
        const res = await (window as any).api.invoke(IPC.ExportChooseTargetDir);
        if (!res?.canceled && res?.directory) setExportDir(res.directory);
      }}>选择目录</Button>
      <Button size="sm" variant="primary" onClick={async () => {
        setExportProgress({ total: 0, completed: 0, failed: 0, bytesTotal: 0, bytesCompleted: 0 });
        (window as any).api.on(IPC.ExportProgress, (p: any) => setExportProgress(p));
        await (window as any).api.invoke(IPC.ExportRun, {});
        setIsRunning(false);
        setTimerMs(0);
      }}>导出</Button>
      <Button size="sm" onClick={async () => { await (window as any).api.invoke(IPC.PauseCapture); setIsRunning(false); }}>暂停</Button>
      <Button size="sm" onClick={async () => { await (window as any).api.invoke(IPC.ResumeCapture); setIsRunning(true); }}>继续</Button>
      <Button size="sm" onClick={async () => { await (window as any).api.invoke(IPC.StopCapture); setIsRunning(false); setTimerMs(0); }}>停止</Button>
    </div>
  );
}


