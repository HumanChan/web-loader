import React, { useEffect, useMemo } from 'react';
import { IPC } from '../shared/ipc';

const styles = {
  root: {
    display: 'grid',
    gridTemplateColumns: 'minmax(480px, 1fr) 360px',
    gridTemplateRows: '100px 1fr',
    height: '100vh',
    width: '100vw',
    overflow: 'hidden' as const,
    background: '#0f1115',
    color: '#e6e6e6',
    fontFamily: 'ui-sans-serif, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
  },
  urlBar: {
    gridColumn: '1 / 2',
    gridRow: '1 / 2',
    height: 100,
    borderBottom: '1px solid #1e293b',
    boxSizing: 'border-box' as const,
    padding: '16px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
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
        <input
          style={styles.urlInput}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="输入 URL"
        />
        <button style={styles.button} onClick={async () => {
          const raw = url.trim();
          const finalUrl = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
          const res = await (window as any).api.invoke(IPC.NavigateTo, { url: finalUrl });
          if (res?.partition) setPartition(res.partition);
          setNavigatedUrl(finalUrl);
          setTimerMs(0);
          setIsRunning(true);
        }}>确定</button>
        <button style={styles.button} onClick={async () => {
          const res = await (window as any).api.invoke(IPC.ExportChooseTargetDir);
          if (!res?.canceled && res?.directory) setExportDir(res.directory);
        }}>选择目录</button>
        <button style={styles.button} onClick={async () => {
          setExportProgress({ total: 0, completed: 0, failed: 0, bytesTotal: 0, bytesCompleted: 0 });
          (window as any).api.on(IPC.ExportProgress, (p: any) => setExportProgress(p));
          await (window as any).api.invoke(IPC.ExportRun, {});
          setIsRunning(false);
          setTimerMs(0);
        }}>导出</button>
        <button style={styles.button} onClick={async () => {
          await (window as any).api.invoke(IPC.PauseCapture);
          setIsRunning(false);
        }}>暂停</button>
        <button style={styles.button} onClick={async () => {
          await (window as any).api.invoke(IPC.ResumeCapture);
          setIsRunning(true);
        }}>继续</button>
        <button style={styles.button} onClick={async () => {
          await (window as any).api.invoke(IPC.StopCapture);
          setIsRunning(false);
          setTimerMs(0);
        }}>停止</button>
      </div>
      <div style={styles.webPane}>
        <webview
          key={webviewPartition}
          style={styles.webview as any}
          partition={webviewPartition}
          src={navigatedUrl}
          allowpopups={true}
        ></webview>
      </div>
      <div style={styles.sidePanel}>
        <h3 style={styles.panelTitle as any}>控制与状态</h3>
        <p>计时器：{Math.floor(timerMs / 1000)} s</p>
        <p>导出目录：{exportDir || '未选择'}</p>
        {exportProgress && (
          <p>导出进度：{exportProgress.completed}/{exportProgress.total}（失败 {exportProgress.failed}）</p>
        )}
        <div style={{ marginTop: 12 }}>
          <span style={styles.badge as any}>视图：填满左侧窗口区域（自适应，无滚动）</span>
        </div>
        <p style={{ opacity: 0.75, marginTop: 16 }}>右侧面板将在后续阶段填充：导出、路径、筛选/搜索、列表、统计与进度。</p>
      </div>
    </div>
  );
}


