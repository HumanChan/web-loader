import { BrowserWindow, ipcMain } from 'electron';
import { IPC } from '../../shared/ipc';
import { SessionManager } from '../session/SessionManager';
import { ResourceCaptureService } from '../capture/ResourceCaptureService';
import fs from 'fs-extra';
import path from 'node:path';

let capture: ResourceCaptureService | null = null;

export function registerMainIpcHandlers(_win: BrowserWindow) {
  ipcMain.handle(IPC.NavigateTo, async (_event, args: { url: string }) => {
    const s = SessionManager.startNewSession(args.url);
    capture = new ResourceCaptureService({ sessionPartition: s.partition, tempDir: s.tempDir, mainDocumentUrl: args.url });
    await capture.start();
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
    if (capture) await capture.stop();
    return { ok: true };
  });

  ipcMain.handle('records:get', async () => {
    const s = SessionManager.getCurrent();
    if (!s) return { ok: false, records: [] };
    try {
      const idxPath = path.join(s.tempDir, 'index.json');
      if (await fs.pathExists(idxPath)) {
        const arr = await fs.readJson(idxPath);
        return { ok: true, records: arr };
      }
      return { ok: true, records: [] };
    } catch (e) {
      return { ok: false, records: [] };
    }
  });
}


