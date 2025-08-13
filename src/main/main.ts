import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  const preloadMjs = path.join(__dirname, '../preload/preload.mjs');
  const preloadJs = path.join(__dirname, '../preload/preload.js');
  const preloadPath = fs.existsSync(preloadJs) ? preloadJs : preloadMjs;
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 1380,
    minWidth: 1080,
    minHeight: 1380,
    show: false,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());

  if (!app.isPackaged) {
    await mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']!);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => (mainWindow = null));
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) void createWindow();
});

app.whenReady().then(() => createWindow());


