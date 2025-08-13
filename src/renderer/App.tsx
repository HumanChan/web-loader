import React, { useEffect, useMemo } from 'react';
import { IPC } from '../shared/ipc';

const styles = {
  root: {
    display: 'grid',
    gridTemplateColumns: '720px 1fr',
    gridTemplateRows: '100px 1280px',
    height: '100vh',
    width: '100vw',
    overflow: 'hidden' as const,
  },
  urlBar: {
    gridColumn: '1 / 2',
    gridRow: '1 / 2',
    width: 720,
    height: 100,
    borderBottom: '1px solid #eee',
    boxSizing: 'border-box' as const,
    padding: '12px 12px',
  },
  webPane: {
    gridColumn: '1 / 2',
    gridRow: '2 / 3',
    width: 720,
    height: 1280,
    borderRight: '1px solid #eee',
    boxSizing: 'border-box' as const,
  },
  sidePanel: {
    gridColumn: '2 / 3',
    gridRow: '1 / 3',
    minWidth: 360,
    borderLeft: '1px solid #eee',
    boxSizing: 'border-box' as const,
    padding: 12,
  },
  webview: {
    width: 720,
    height: 1280,
    border: '0',
  },
  urlInput: {
    width: 560,
    height: 36,
    marginRight: 8,
  },
  button: {
    height: 36,
  },
} as const;

export function App() {
  const [url, setUrl] = React.useState('https://example.com');
  const [partition, setPartition] = React.useState<string>('persist:webloader-init');
  const [timerMs, setTimerMs] = React.useState<number>(0);
  const [isRunning, setIsRunning] = React.useState<boolean>(false);

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
          const res = await (window as any).api.invoke(IPC.NavigateTo, { url });
          if (res?.partition) setPartition(res.partition);
          const webview = document.querySelector('webview') as any;
          if (webview) webview.src = url;
          setTimerMs(0);
          setIsRunning(true);
        }}>确定</button>
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
        {/* 固定 720x1280 的 webview 容器 */}
        {/* eslint-disable-next-line react/no-unknown-property */}
        <webview style={styles.webview as any} partition={webviewPartition} src="about:blank" allowpopups></webview>
      </div>
      <div style={styles.sidePanel}>
        <h3>控制与状态（占位）</h3>
        <p>计时器：{Math.floor(timerMs / 1000)} s</p>
        <p>右侧面板将在后续阶段填充：导出、路径、筛选/搜索、列表、统计与进度。</p>
      </div>
    </div>
  );
}


