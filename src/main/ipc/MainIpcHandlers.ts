import { BrowserWindow, ipcMain } from 'electron';
import { IPC } from '../../shared/ipc';
import { SessionManager } from '../session/SessionManager';

export function registerMainIpcHandlers(_win: BrowserWindow) {
  ipcMain.handle(IPC.NavigateTo, async (_event, args: { url: string }) => {
    const s = SessionManager.startNewSession(args.url);
    return { sessionId: s.sessionId, partition: s.partition };
  });

  ipcMain.handle(IPC.StartCapture, async () => {
    const s = SessionManager.getCurrent();
    if (s && s.state !== 'capturing') SessionManager.resume();
    return { ok: true };
  });

  ipcMain.handle(IPC.PauseCapture, async () => {
    SessionManager.pause();
    return { ok: true };
  });

  ipcMain.handle(IPC.ResumeCapture, async () => {
    SessionManager.resume();
    return { ok: true };
  });

  ipcMain.handle(IPC.StopCapture, async () => {
    SessionManager.stop();
    return { ok: true };
  });
}


