import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Pause, Play } from 'lucide-react';
import { IPC } from '../../../shared/ipc';

interface Props {
  timerSec: number;
  isRunning: boolean;
  setIsRunning: (v: boolean) => void;
}

export function ControlCard({ timerSec, isRunning, setIsRunning }: Props) {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Play size={16}/> 捕获控制
        </CardTitle>
        <CardDescription className="flex items-center gap-2">
          计时：{timerSec}s
          <Badge variant={isRunning ? "default" : "secondary"} className="text-xs">
            {isRunning ? "运行中" : "已暂停"}
          </Badge>
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-2">
          {isRunning ? (
            <Button size="sm" variant="outline" onClick={async () => { await (window as any).api.invoke(IPC.PauseCapture); setIsRunning(false); }}>
              <Pause size={16}/> 暂停
            </Button>
          ) : (
            <Button size="sm" onClick={async () => { await (window as any).api.invoke(IPC.ResumeCapture); setIsRunning(true); }}>
              <Play size={16}/> 继续
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


