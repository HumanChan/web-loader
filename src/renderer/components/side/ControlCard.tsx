import * as React from 'react';
import { Card, CardSubtitle, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Pause, Play, Square } from 'lucide-react';
import { IPC } from '../../../shared/ipc';

interface Props {
  timerSec: number;
  isRunning: boolean;
  setIsRunning: (v: boolean) => void;
}

export function ControlCard({ timerSec, isRunning, setIsRunning }: Props) {
  return (
    <Card className="mb-4">
      <CardTitle className="flex items-center gap-2"><Play size={16}/> 捕获控制</CardTitle>
      <CardSubtitle className="mb-3">计时：{timerSec}s</CardSubtitle>
      <div className="flex items-center gap-2">
        {isRunning ? (
          <Button onClick={async () => { await (window as any).api.invoke(IPC.PauseCapture); setIsRunning(false); }}><Pause size={16}/> 暂停</Button>
        ) : (
          <Button onClick={async () => { await (window as any).api.invoke(IPC.ResumeCapture); setIsRunning(true); }}><Play size={16}/> 继续</Button>
        )}
        <Button onClick={async () => { await (window as any).api.invoke(IPC.StopCapture); setIsRunning(false); }}><Square size={16}/> 停止</Button>
      </div>
    </Card>
  );
}


