import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  invoke: (channel: string, args?: any) => ipcRenderer.invoke(channel, args),
  on: (channel: string, listener: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => listener(...args));
  },
  removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel),
});


