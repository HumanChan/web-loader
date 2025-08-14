import Store from 'electron-store';

type SettingsShape = {
  'export.baseDir'?: string;
  'capture.maxConcurrentWrites'?: number;
  'ui.statsThrottleMs'?: number;
  'startup.cleanupLastTemp'?: boolean;
};

const store = new Store<SettingsShape>({ name: 'settings' });

export const SettingsStore = {
  get<T = any>(key: keyof SettingsShape, defaultValue?: T): T {
    return (store.get(key as any) as any) ?? (defaultValue as any);
  },
  set(key: keyof SettingsShape, value: any): void {
    store.set(key as any, value);
  },
};


