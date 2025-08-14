import * as React from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Search } from 'lucide-react';
import { ThemeToggle } from './ui/theme-toggle';
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
      }}><Search size={16}/> 跳转</Button>
      <div className="ml-1" />
      <ThemeToggle />
    </div>
  );
}


