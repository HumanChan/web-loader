import React, { useEffect, useMemo } from 'react';
import { IPC } from '../shared/ipc';
import { Toolbar } from './components/Toolbar';
import { ExportCard } from './components/side/ExportCard';
import { ControlCard } from './components/side/ControlCard';
import { ProgressCard } from './components/side/ProgressCard';
import { StatsCard } from './components/side/StatsCard';
import { Separator } from './components/ui/separator';
import { ScrollArea } from './components/ui/scroll-area';
import { Empty } from './components/ui/empty';
import { Toaster } from './components/ui/sonner';
import { Globe } from 'lucide-react';

const styles = {
  root: {
    display: 'grid',
    gridTemplateColumns: 'minmax(520px, 1fr) 360px',
    gridTemplateRows: '56px 1fr',
    height: '100vh',
    width: '100vw',
    overflow: 'hidden' as const,
    background: '#0f1115',
    color: 'var(--fg)' as any,
    fontFamily: 'ui-sans-serif, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
  },
  urlBar: {},
  webPane: {
    gridColumn: '1 / 2',
    gridRow: '2 / 3',
    borderRight: '1px solid var(--border)',
    boxSizing: 'border-box' as const,
    overflow: 'hidden' as const,
    background: 'var(--webpane-bg)'
  },
  sidePanel: {
    gridColumn: '2 / 3',
    gridRow: '1 / 3',
    minWidth: 360,
    borderLeft: '1px solid hsl(var(--border))',
    boxSizing: 'border-box' as const,
    padding: '0 16px 16px 16px',
    background: 'var(--panel)',
  },
  webview: {
    width: '100%',
    height: '100%',
    border: '0',
  },
  urlInput: {
    flex: 1,
    minWidth: 320,
    height: 36,
    marginRight: 8,
    background: 'hsl(var(--input))',
    border: '1px solid hsl(var(--border))',
    color: 'hsl(var(--foreground))',
    padding: '0 10px',
    borderRadius: 8,
    outline: 'none',
  },
  button: {
    height: 36,
    background: 'hsl(var(--secondary))',
    border: '1px solid hsl(var(--border))',
    color: 'hsl(var(--secondary-foreground))',
    padding: '0 12px',
    borderRadius: 8,
    cursor: 'pointer',
  },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 999,
    background: '#12253d',
    border: '1px solid #1e3a5f',
    color: '#9cc6ff',
    fontSize: 12,
  },
  panelTitle: {
    margin: '8px 0 12px 0',
    fontSize: 16,
    color: '#d9e6ff',
  },
} as const;

export function App() {
  const [url, setUrl] = React.useState('');
  const [partition, setPartition] = React.useState<string>('persist:webloader-init');
  const [navigatedUrl, setNavigatedUrl] = React.useState<string>('about:blank');
  const [timerMs, setTimerMs] = React.useState<number>(0);
  const [isRunning, setIsRunning] = React.useState<boolean>(false);
  const [exportDir, setExportDir] = React.useState<string>('');
  const [exportProgress, setExportProgress] = React.useState<{ total: number; completed: number; failed: number; bytesTotal: number; bytesCompleted: number } | null>(null);
  const [liveStats, setLiveStats] = React.useState<{ total: number; ok: number; failed: number; bytes: number }>({ total: 0, ok: 0, failed: 0, bytes: 0 });
  // 已不再需要缩放/固定画布逻辑，webview 直接填满左侧

  const webviewPartition = useMemo(() => partition, [partition]);

  useEffect(() => {
    let timer: any;
    if (isRunning) {
      const start = Date.now() - timerMs;
      timer = setInterval(() => {
        setTimerMs(Date.now() - start);
      }, 250);
    }
    return () => timer && clearInterval(timer);
  }, [isRunning]);

  // 启动时读取缓存的导出目录
  useEffect(() => {
    const loadCachedExportDir = async () => {
      try {
        const cachedDir = await (window as any).api.invoke(IPC.SettingsGet, 'export.baseDir');
        if (cachedDir && typeof cachedDir === 'string') {
          setExportDir(cachedDir);
        }
      } catch (error) {
        console.warn('Failed to load cached export directory:', error);
      }
    };
    loadCachedExportDir();
  }, []);

  // 取消一切缩放/固定画布逻辑

  // 周期性拉取 records 以更新实时统计（轻量轮询，后续可用事件推送替代）
  useEffect(() => {
    let mounted = true;
    const fetchLive = async () => {
      const res = await (window as any).api.invoke(IPC.RecordsGet);
      if (mounted && res?.live) setLiveStats(res.live);
    };
    const t = setInterval(fetchLive, 1000);
    fetchLive();
    return () => { mounted = false; clearInterval(t); };
  }, []);

  return (
    <div style={styles.root}>
      <div style={styles.urlBar}>
        <Toolbar
          url={url}
          setUrl={setUrl}
          onNavigated={(finalUrl, partitionId) => { if (partitionId) setPartition(partitionId); setNavigatedUrl(finalUrl); }}
          setIsRunning={setIsRunning}
          setTimerMs={setTimerMs}
          setExportDir={setExportDir}
          setExportProgress={setExportProgress}
        />
      </div>
      <div style={styles.webPane}>
        {navigatedUrl === 'about:blank' ? (
          <Empty title="尚未加载页面" subtitle="请输入 URL 并点击确定开始捕获" icon={<Globe size={16} />} />
        ) : (
          <webview
            key={webviewPartition}
            style={styles.webview as any}
            partition={webviewPartition}
            src={navigatedUrl}
            allowpopups={true}
          ></webview>
        )}
      </div>
      <div style={styles.sidePanel}>
        <ScrollArea className="w-full h-full pr-2">
          <div className="space-y-4 p-1">
            {/* 操作控制区域 */}
            <div className="space-y-4">
              <ExportCard
                exportDir={exportDir}
                setExportDir={setExportDir}
                setExportProgress={setExportProgress}
                setIsRunning={setIsRunning}
                setTimerMs={setTimerMs}
              />
              <ControlCard
                timerSec={Math.floor(timerMs / 1000)}
                isRunning={isRunning}
                setIsRunning={setIsRunning}
              />
            </div>
            
            <Separator className="mx-0" />
            
            {/* 数据展示区域 */}
            <div className="space-y-4">
              <StatsCard live={liveStats} />
              <ProgressCard progress={exportProgress} />
            </div>
          </div>
        </ScrollArea>
      </div>
      <Toaster />
    </div>
  );
}


