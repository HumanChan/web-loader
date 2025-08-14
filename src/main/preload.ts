import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../shared/ipc';

const allowed = new Set<string>(Object.values(IPC));

contextBridge.exposeInMainWorld('api', {
  invoke: (channel: string, args?: any) => {
    if (!allowed.has(channel)) throw new Error(`Blocked IPC channel: ${channel}`);
    return ipcRenderer.invoke(channel, args);
  },
  on: (channel: string, listener: (...args: any[]) => void) => {
    if (!allowed.has(channel)) throw new Error(`Blocked IPC channel: ${channel}`);
    ipcRenderer.on(channel, (_event, ...args) => listener(...args));
  },
  removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel),
});


