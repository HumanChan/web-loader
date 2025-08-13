import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('api', {
  // IPC stubs to be filled in later
});


