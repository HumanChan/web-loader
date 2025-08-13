export {};

declare global {
  interface Window {
    api: {
      invoke: (channel: string, args?: any) => Promise<any>;
      on: (channel: string, listener: (...args: any[]) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}

declare namespace JSX {
  interface IntrinsicElements {
    webview: any;
  }
}


