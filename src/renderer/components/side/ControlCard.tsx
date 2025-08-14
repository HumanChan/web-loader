import * as React from 'react';
import { Card, CardSubtitle, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { IPC } from '../../../shared/ipc';

interface Props {
  timerSec: number;
  setIsRunning: (v: boolean) => void;
}

export function ControlCard({ timerSec, setIsRunning }: Props) {
  return (
    <Card className="mb-4">
      <CardTitle>捕获控制</CardTitle>
      <CardSubtitle className="mb-3">计时：{timerSec}s</CardSubtitle>
      <div className="flex items-center gap-2">
        <Button onClick={async () => { await (window as any).api.invoke(IPC.PauseCapture); setIsRunning(false); }}>暂停</Button>
        <Button onClick={async () => { await (window as any).api.invoke(IPC.ResumeCapture); setIsRunning(true); }}>继续</Button>
        <Button onClick={async () => { await (window as any).api.invoke(IPC.StopCapture); setIsRunning(false); }}>停止</Button>
      </div>
    </Card>
  );
}


