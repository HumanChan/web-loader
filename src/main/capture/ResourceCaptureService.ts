import path from 'node:path';
import fs from 'fs-extra';
import { session, net } from 'electron';
import { normalizeUrl } from './UrlNormalizer';
import { ResourceRecord } from '../../shared/types';
import { nanoid } from 'nanoid';
import { PassThrough } from 'node:stream';
import fsPromises from 'node:fs/promises';

function mapResourceType(rt: string): ResourceRecord['type'] {
  if (!rt) return 'other';
  const r = rt.toLowerCase();
  if (r.includes('stylesheet')) return 'stylesheet';
  if (r.includes('script')) return 'script';
  if (r.includes('image')) return 'image';
  if (r.includes('font')) return 'font';
  if (r.includes('media') || r.includes('audio') || r.includes('video')) return 'audio';
  if (r.includes('xhr') || r.includes('fetch')) return 'xhr';
  if (r.includes('document')) return 'document';
  return 'other';
}

function mapResourceTypeByMime(mime?: string): ResourceRecord['type'] {
  if (!mime) return 'other';
  const m = mime.toLowerCase();
  if (m.includes('text/html')) return 'document';
  if (m.includes('text/css')) return 'stylesheet';
  if (m.includes('javascript') || m.includes('application/x-javascript')) return 'script';
  if (m.startsWith('image/')) return 'image';
  if (m.startsWith('font/')) return 'font';
  if (m.startsWith('audio/')) return 'audio';
  if (m.includes('json')) return 'json';
  return 'other';
}

export class ResourceCaptureService {
  private records: Map<string, ResourceRecord> = new Map();
  private isPaused = false;
  private indexWriteTimer: NodeJS.Timeout | null = null;
  private bytesTotal = 0;

  constructor(private opts: { sessionPartition: string; tempDir: string; mainDocumentUrl: string; enableStreamingCapture?: boolean }) {}

  private async persistIndex() {
    const idxPath = path.join(this.opts.tempDir, 'index.json');
    const arr = Array.from(this.records.values());
    await fs.ensureDir(this.opts.tempDir);
    await fs.writeJson(idxPath, arr, { spaces: 2 });
  }

  private schedulePersistIndex() {
    if (this.indexWriteTimer) return;
    this.indexWriteTimer = setTimeout(async () => {
      this.indexWriteTimer = null;
      try { await this.persistIndex(); } catch {}
    }, 300);
  }

  async start(): Promise<void> {
    const ses = session.fromPartition(this.opts.sessionPartition);

    // webRequest onCompleted to capture metadata
    const filter = { urls: ['*://*/*'] };
    const handler = async (details: any) => {
      try {
        const id = nanoid();
        const normalized = normalizeUrl(details.url, this.opts.mainDocumentUrl);
        // normalize headers: case-insensitive and array handling
        const hdrs: Record<string, string | string[]> = (details.responseHeaders || {}) as any;
        const lower: Record<string, string | string[]> = {};
        for (const k of Object.keys(hdrs)) lower[k.toLowerCase()] = hdrs[k];
        const ctRaw = lower['content-type'];
        const clRaw = lower['content-length'];
        const mimeType = Array.isArray(ctRaw) ? String(ctRaw[0]) : (ctRaw ? String(ctRaw) : undefined);
        const contentLength = Array.isArray(clRaw) ? Number(clRaw[0]) : (clRaw ? Number(clRaw) : undefined);
        const rec: ResourceRecord = {
          id,
          type: mapResourceType(details.resourceType),
          url: details.url,
          normalized: {
            originalUrl: details.url,
            normalizedUrl: normalized.normalizedUrl || details.url,
            host: normalized.host,
            pathname: normalized.pathname,
            queryHashSuffix: normalized.queryHashSuffix,
            relativePathFromRoot: normalized.relativePathFromRoot,
          },
          method: (details.method || 'GET') as any,
          statusCode: details.statusCode,
          mimeType,
          contentLength,
          sizeOnDisk: contentLength,
          startedAt: Date.now(),
          finishedAt: Date.now(),
          state: details.statusCode && details.statusCode >= 200 && details.statusCode < 400 ? 'success' : 'failed',
          referrer: details.referrer || undefined,
          originHost: normalized.host,
        };
        this.records.set(id, rec);
        this.schedulePersistIndex();
      } catch {}
    };
    (this as any)._handler = handler;
    ses.webRequest.onCompleted(filter, handler as any);

    // interceptStreamProtocol for http/https streaming to disk (optional)
    const ensureFilesDir = async () => {
      const p = path.join(this.opts.tempDir, 'files');
      await fs.ensureDir(p);
      return p;
    };

    const pipeToFile = (
      readable: NodeJS.ReadableStream,
      filePath: string,
      onProgress?: (writtenBytes: number) => void,
    ): Promise<number> => {
      return new Promise((resolve, reject) => {
        const writable = fs.createWriteStream(filePath);
        let bytes = 0;
        readable.on('data', (chunk: Buffer) => {
          bytes += (chunk as Buffer).length;
          try { onProgress?.(bytes); } catch {}
        });
        readable.on('error', reject);
        writable.on('error', reject);
        writable.on('finish', () => resolve(bytes));
        readable.pipe(writable);
      });
    };

    const register = async (scheme: 'http' | 'https') => {
      await ses.protocol.interceptStreamProtocol(scheme, async (request, callback) => {
        if (this.isPaused) {
          // While paused, bypass interception and let network proceed normally
          callback({});
          return;
        }
        try {
          // 跳过主文档请求，避免拦截导致 webview 白屏
          const mainUrl = new URL(this.opts.mainDocumentUrl);
          const reqUrl = new URL(request.url);
          // ProtocolRequest 没有 resourceType 字段，保守判断 URL 是否与主文档一致
          const isMainDocument = (reqUrl.href === mainUrl.href);
          if (isMainDocument) {
            callback({});
            return;
          }
          const filesRoot = await ensureFilesDir();
          const normalized = normalizeUrl(request.url, this.opts.mainDocumentUrl);
          const id = nanoid();
          const ext = path.extname(new URL(request.url).pathname) || '';
          const rel = path.join('raw', `${id}${ext || ''}`);
          const outPath = path.join(filesRoot, rel);

          const clientReq = net.request({
            url: request.url,
            method: request.method as any,
            headers: (request as any).headers || {},
            session: ses as any,
          } as any);
          if (request.uploadData) {
            for (const part of request.uploadData) {
              if (part.bytes) clientReq.write(part.bytes);
              if (part.file) {
                const data = await fsPromises.readFile(part.file);
                clientReq.write(data);
              }
            }
          }
          clientReq.end();

          clientReq.on('response', async (res) => {
            const pass = new PassThrough();
            res.on('data', (chunk) => pass.write(chunk));
            res.on('end', () => pass.end());
            res.on('error', () => pass.destroy());

            // create or upsert record for this response
            const ct = res.headers['content-type'] as any;
            const cl = res.headers['content-length'] as any;
            const mime = Array.isArray(ct) ? String(ct[0]) : (ct ? String(ct) : undefined);
            const contentLength = Array.isArray(cl) ? Number(cl[0]) : (cl ? Number(cl) : undefined);
            const rec: ResourceRecord = {
              id,
              type: mapResourceTypeByMime(mime),
              url: request.url,
              normalized: {
                originalUrl: request.url,
                normalizedUrl: normalized.normalizedUrl || request.url,
                host: normalized.host,
                pathname: normalized.pathname,
                queryHashSuffix: normalized.queryHashSuffix,
                relativePathFromRoot: normalized.relativePathFromRoot,
              },
              method: (request.method || 'GET') as any,
              statusCode: res.statusCode,
              mimeType: mime,
              contentLength,
              sizeOnDisk: 0,
              startedAt: Date.now(),
              finishedAt: undefined,
              state: (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) ? 'in-progress' : 'failed',
              referrer: undefined,
              originHost: normalized.host,
              tempFilePath: outPath,
            };
            this.records.set(id, rec);
            this.schedulePersistIndex();

            // stream to disk with incremental progress
            let lastPersist = 0;
            pipeToFile(pass, outPath, (written) => {
              const r = this.records.get(id);
              if (r) r.sizeOnDisk = written;
              const now = Date.now();
              if (now - lastPersist > 300) { this.schedulePersistIndex(); lastPersist = now; }
            }).then(() => {
              const r = this.records.get(id);
              if (r) {
                r.finishedAt = Date.now();
                r.state = (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) ? 'success' : 'failed';
              }
              this.schedulePersistIndex();
            }).catch(() => {});

            // return stream to renderer
            callback({ statusCode: res.statusCode, headers: res.headers as any, data: pass });
          });
        } catch (e) {
          callback({});
        }
      });
    };

    if (this.opts.enableStreamingCapture) {
      // 暂时禁用，以保证页面稳定；我们稍后改为 webRequest + netLog 方式统计大小
      // await register('http');
      // await register('https');
    }
  }

  async pause(): Promise<void> {
    this.isPaused = true;
  }

  async resume(): Promise<void> {
    this.isPaused = false;
  }

  async stop(): Promise<void> {
    const ses = session.fromPartition(this.opts.sessionPartition);
    const h = (this as any)._handler;
    if (h) ses.webRequest.onCompleted(null as any);
    try { await ses.protocol.uninterceptProtocol('http'); } catch {}
    try { await ses.protocol.uninterceptProtocol('https'); } catch {}
    await this.persistIndex();
  }

  getRecords(): ResourceRecord[] {
    return Array.from(this.records.values());
  }
}



