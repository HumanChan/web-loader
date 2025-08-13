export const IPC = {
  StartCapture: 'capture:start',
  PauseCapture: 'capture:pause',
  ResumeCapture: 'capture:resume',
  StopCapture: 'capture:stop',
} as const;

export type IpcChannel = typeof IPC[keyof typeof IPC];


