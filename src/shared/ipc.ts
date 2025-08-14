export const IPC = {
  // navigation & capture
  NavigateTo: 'webview:navigate',
  StartCapture: 'capture:start',
  PauseCapture: 'capture:pause',
  ResumeCapture: 'capture:resume',
  StopCapture: 'capture:stop',
  RecordsGet: 'records:get',

  // export
  ExportRun: 'export:run',
  ExportChooseTargetDir: 'export:choose-target-dir',
  ExportProgress: 'export:progress',
  ExportDone: 'export:done',

  // settings
  SettingsGet: 'settings:get',
  SettingsSet: 'settings:set',
} as const;

export type IpcChannel = typeof IPC[keyof typeof IPC];


