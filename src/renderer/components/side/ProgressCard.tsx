import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Progress } from '../ui/progress';

interface Props {
  progress: { total: number; completed: number; failed: number; bytesTotal: number; bytesCompleted: number } | null;
}

export function ProgressCard({ progress }: Props) {
  const pct = progress && progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">导出进度</CardTitle>
        <CardDescription>
          {progress ? `${progress.completed}/${progress.total}（失败 ${progress.failed}）` : '未开始'}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Progress value={pct} className="h-2" />
        {progress && (
          <div className="mt-2 text-xs text-muted-foreground">
            {(progress.bytesCompleted/1024/1024).toFixed(1)}MB / {(progress.bytesTotal/1024/1024).toFixed(1)}MB
          </div>
        )}
      </CardContent>
    </Card>
  );
}


