export const IPC = {
  NavigateTo: 'webview:navigate',
  StartCapture: 'capture:start',
  PauseCapture: 'capture:pause',
  ResumeCapture: 'capture:resume',
  StopCapture: 'capture:stop',
  RecordsGet: 'records:get',
} as const;

export type IpcChannel = typeof IPC[keyof typeof IPC];


