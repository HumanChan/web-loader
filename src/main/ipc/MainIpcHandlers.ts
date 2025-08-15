import { BrowserWindow, dialog, ipcMain } from 'electron';
import { IPC } from '../../shared/ipc';
import { SessionManager } from '../session/SessionManager';
import { ResourceCaptureService } from '../capture/ResourceCaptureService';
import fs from 'fs-extra';
import path from 'node:path';
import { ExportService } from '../export/ExportService';
import { SettingsStore } from '../store/SettingsStore';

let capture: ResourceCaptureService | null = null;

export function registerMainIpcHandlers(_win: BrowserWindow) {
  ipcMain.handle(IPC.NavigateTo, async (_event, args: { url: string }) => {
    // 停止上一轮捕获，避免重复监听与定时器泄漏
    if (capture) {
      try { await capture.stop(); } catch {}
      capture = null;
    }
    const s = SessionManager.startNewSession(args.url);
    // 永久关闭流式拦截，避免影响请求；改为 webRequest + 导出回写策略
    capture = new ResourceCaptureService({ sessionPartition: s.partition, tempDir: s.tempDir, mainDocumentUrl: args.url, enableStreamingCapture: false });
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

  ipcMain.handle(IPC.RecordsGet, async () => {
    const s = SessionManager.getCurrent();
    if (!s) return { ok: false, records: [] };
    try {
      const idxPath = path.join(s.tempDir, 'index.json');
      if (await fs.pathExists(idxPath)) {
        const arr = await fs.readJson(idxPath);
        const okCount = arr.filter((r: any) => r.state === 'success').length;
        const failedCount = arr.filter((r: any) => r.state === 'failed').length;
        const bytes = arr.reduce((sum: number, r: any) => sum + (Number(r.sizeOnDisk ?? 0) || Number(r.contentLength ?? 0) || 0), 0);
        return { ok: true, records: arr, live: { total: arr.length, ok: okCount, failed: failedCount, bytes } };
      }
      return { ok: true, records: [], live: { total: 0, ok: 0, failed: 0, bytes: 0 } };
    } catch (e) {
      return { ok: false, records: [], live: { total: 0, ok: 0, failed: 0, bytes: 0 } };
    }
  });

  // settings
  ipcMain.handle(IPC.SettingsGet, async (event, key: string) => {
    return SettingsStore.get(key as any);
  });

  ipcMain.handle(IPC.SettingsSet, async (event, key: string, value: any) => {
    SettingsStore.set(key as any, value);
    return { ok: true };
  });

  // choose export target directory
  ipcMain.handle(IPC.ExportChooseTargetDir, async () => {
    const res = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] });
    if (res.canceled || !res.filePaths[0]) return { canceled: true };
    const dir = res.filePaths[0];
    SettingsStore.set('export.baseDir', dir);
    return { canceled: false, directory: dir };
  });

  // run export all
  ipcMain.handle(IPC.ExportRun, async (event, args?: { targetDir?: string }) => {
    const s = SessionManager.getCurrent();
    if (!s) return { ok: false, message: 'no session' };
    const targetDir = args?.targetDir || SettingsStore.get('export.baseDir');
    if (!targetDir) return { ok: false, message: 'no targetDir' };
    // 清理目标目录，防止上次导出残留
    try { await fs.emptyDir(targetDir); } catch {}
    const idxPath = path.join(s.tempDir, 'index.json');
    const records = (await fs.pathExists(idxPath)) ? await fs.readJson(idxPath) : [];
    // 按资源类型过滤导出目标：跳过 'document'，导出其它静态资源
    const exportable = Array.isArray(records)
      ? records.filter((r: any) => r && r.type !== 'document')
      : [];
    const onProgress = (p: any) => {
      event?.sender?.send(IPC.ExportProgress, p);
    };
    await ExportService.exportAll({ tempDir: s.tempDir, records: exportable, targetDir, onProgress, sessionPartition: s.partition });
    event?.sender?.send(IPC.ExportDone, { ok: true, targetDir });
    return { ok: true };
  });

  // settings get/set
  ipcMain.handle(IPC.SettingsGet, async (_event, args: { key: string; defaultValue?: any }) => {
    const value = SettingsStore.get(args.key as any, args.defaultValue);
    return { ok: true, value };
  });
  ipcMain.handle(IPC.SettingsSet, async (_event, args: { key: string; value: any }) => {
    SettingsStore.set(args.key as any, args.value);
    return { ok: true };
  });
}


