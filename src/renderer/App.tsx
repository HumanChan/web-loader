import React, { useEffect, useMemo } from 'react';
import { IPC } from '../shared/ipc';
import { Toolbar } from './components/Toolbar';
import { ExportCard } from './components/side/ExportCard';
import { ControlCard } from './components/side/ControlCard';
import { ProgressCard } from './components/side/ProgressCard';

const styles = {
  root: {
    display: 'grid',
    gridTemplateColumns: 'minmax(520px, 1fr) 360px',
    gridTemplateRows: '56px 1fr',
    height: '100vh',
    width: '100vw',
    overflow: 'hidden' as const,
    background: '#0f1115',
    color: '#e6e6e6',
    fontFamily: 'ui-sans-serif, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
  },
  urlBar: {},
  webPane: {
    gridColumn: '1 / 2',
    gridRow: '2 / 3',
    borderRight: '1px solid #1e293b',
    boxSizing: 'border-box' as const,
    overflow: 'hidden' as const,
    background: 'linear-gradient(180deg, #0f1115 0%, #0b0d12 100%)',
  },
  sidePanel: {
    gridColumn: '2 / 3',
    gridRow: '1 / 3',
    minWidth: 360,
    borderLeft: '1px solid #1e293b',
    boxSizing: 'border-box' as const,
    padding: 16,
    background: '#0b0d12',
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
    background: '#0b1320',
    border: '1px solid #1e293b',
    color: '#e6e6e6',
    padding: '0 10px',
    borderRadius: 8,
    outline: 'none',
  },
  button: {
    height: 36,
    background: '#1e293b',
    border: '1px solid #2b3a52',
    color: '#e6e6e6',
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
  const [url, setUrl] = React.useState('https://example.com');
  const [partition, setPartition] = React.useState<string>('persist:webloader-init');
  const [navigatedUrl, setNavigatedUrl] = React.useState<string>('about:blank');
  const [timerMs, setTimerMs] = React.useState<number>(0);
  const [isRunning, setIsRunning] = React.useState<boolean>(false);
  const [exportDir, setExportDir] = React.useState<string>('');
  const [exportProgress, setExportProgress] = React.useState<{ total: number; completed: number; failed: number; bytesTotal: number; bytesCompleted: number } | null>(null);
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

  // 取消一切缩放/固定画布逻辑

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
          <div className="w-full h-full grid place-items-center text-slate-400">
            <div className="text-center">
              <div className="text-sm opacity-80">尚未加载页面</div>
              <div className="text-xs opacity-60 mt-2">请输入 URL 并点击“确定”开始捕获</div>
            </div>
          </div>
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
        <ExportCard
          exportDir={exportDir}
          setExportDir={setExportDir}
          setExportProgress={setExportProgress}
          setIsRunning={setIsRunning}
          setTimerMs={setTimerMs}
        />
        <ControlCard
          timerSec={Math.floor(timerMs / 1000)}
          setIsRunning={setIsRunning}
        />
        <ProgressCard progress={exportProgress} />
      </div>
    </div>
  );
}


