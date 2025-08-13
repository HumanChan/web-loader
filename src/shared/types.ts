export type ResourceType =
  | 'document' | 'stylesheet' | 'script' | 'image' | 'font' | 'audio' | 'xhr' | 'fetch' | 'json' | 'other';

export interface NormalizedUrl {
  originalUrl: string;
  normalizedUrl: string;
  host: string;
  pathname: string;
  queryHashSuffix?: string;
  relativePathFromRoot: string;
}

export interface ResourceRecord {
  id: string;
  type: ResourceType;
  url: string;
  normalized: NormalizedUrl;
  method: 'GET' | 'POST' | 'OTHER';
  statusCode?: number;
  mimeType?: string;
  contentLength?: number;
  sizeOnDisk?: number;
  startedAt: number;
  finishedAt?: number;
  state: 'in-progress' | 'success' | 'failed' | 'skipped';
  referrer?: string;
  errorMessage?: string;
  tempFilePath?: string;
  finalFilePath?: string;
  originHost: string;
}

export interface CaptureSession {
  sessionId: string;
  partition: string;
  startedAt: number;
  state: 'idle' | 'capturing' | 'paused' | 'exporting';
  tempDir: string;
}

export interface ExportProgress {
  total: number;
  completed: number;
  failed: number;
  bytesTotal: number;
  bytesCompleted: number;
}


