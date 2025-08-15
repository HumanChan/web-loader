import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { BarChart3 } from 'lucide-react';

interface Props {
  live: { total: number; ok: number; failed: number; bytes: number };
}

export function StatsCard({ live }: Props) {
  const total = live.total;
  const ok = live.ok;
  const failed = live.failed;
  const size = live.bytes;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <BarChart3 size={16}/> 统计
        </CardTitle>
        <CardDescription>实时捕获统计</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border bg-muted/50 p-3">
            <div className="text-muted-foreground text-xs">总数</div>
            <div className="text-foreground text-lg font-semibold">{total}</div>
          </div>
          <div className="rounded-md border bg-muted/50 p-3">
            <div className="text-muted-foreground text-xs flex items-center gap-1">
              成功 <Badge variant="secondary" className="h-4 text-xs px-1">✓</Badge>
            </div>
            <div className="text-foreground text-lg font-semibold">{ok}</div>
          </div>
          <div className="rounded-md border bg-muted/50 p-3">
            <div className="text-muted-foreground text-xs flex items-center gap-1">
              失败 <Badge variant="destructive" className="h-4 text-xs px-1">✗</Badge>
            </div>
            <div className="text-foreground text-lg font-semibold">{failed}</div>
          </div>
          <div className="rounded-md border bg-muted/50 p-3">
            <div className="text-muted-foreground text-xs">总大小</div>
            <div className="text-foreground text-lg font-semibold">{(size/1024/1024).toFixed(1)} MB</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


