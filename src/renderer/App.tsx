import React, { useMemo } from 'react';

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

  const webviewPartition = useMemo(() => partition, [partition]);

  return (
    <div style={styles.root}>
      <div style={styles.urlBar}>
        <input
          style={styles.urlInput}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="输入 URL"
        />
        <button style={styles.button} onClick={() => {
          // 后续由 IPC 通知主进程创建会话并设置 partition
          setPartition(`persist:webloader-${Date.now()}`);
          const webview = document.querySelector('webview');
          if (webview) {
            // @ts-ignore
            webview.src = url;
          }
        }}>确定</button>
      </div>
      <div style={styles.webPane}>
        {/* 固定 720x1280 的 webview 容器 */}
        {/* eslint-disable-next-line react/no-unknown-property */}
        <webview style={styles.webview as any} partition={webviewPartition} src="about:blank" allowpopups></webview>
      </div>
      <div style={styles.sidePanel}>
        <h3>控制与状态（占位）</h3>
        <p>右侧面板将在后续阶段填充：导出、路径、筛选/搜索、列表、统计与进度。</p>
      </div>
    </div>
  );
}


