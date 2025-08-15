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
  private downloadQueue: string[] = [];
  private activeDownloads = 0;
  private maxConcurrentDownloads = 4;
  private sizeScanTimer: NodeJS.Timeout | null = null;

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
        // 检查暂停状态，如果已暂停则跳过处理
        if (this.isPaused) return;
        
        const id = nanoid();
        const normalized = normalizeUrl(details.url, this.opts.mainDocumentUrl);
        // 仅统计静态资源，跳过 XHR/fetch/WebSocket 等
        const rtype = mapResourceType(details.resourceType);
        const urlLower = String(details.url || '').toLowerCase();
        // 跳过 WebSocket，仅记录静态资源与 XHR/JSON
        if (urlLower.startsWith('ws:') || urlLower.startsWith('wss:')) return;
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
          type: rtype,
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

        // 自动入队后台下载（仅当记录尚无本地文件时）
        if (rec.type !== 'document') {
          this.enqueueDownload(rec.id);
        }
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
          // 跳过主文档以及导航文档（同源同路径）
          const isMainDocument = reqUrl.href === mainUrl.href;
          if (isMainDocument) {
            callback({});
            return;
          }
          // 限制类型：只对常见静态资源流式写盘
          const pathname = reqUrl.pathname.toLowerCase();
          const allowExt = ['.js', '.css', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.woff', '.woff2', '.ttf', '.otf', '.mp3', '.m4a', '.ogg', '.json'];
          const hasAllowedExt = allowExt.some((e) => pathname.endsWith(e));
          if (!hasAllowedExt) {
            callback({});
            return;
          }
          const filesRoot = await ensureFilesDir();
          const normalized = normalizeUrl(request.url, this.opts.mainDocumentUrl);
          const id = nanoid();
          const ext = path.extname(new URL(request.url).pathname) || '';
          const rel = path.join('raw', `${id}${ext || ''}`);
          const outPath = path.join(filesRoot, rel);

          const clientReq = (ses as any).net?.request ? (ses as any).net.request({
            url: request.url,
            method: request.method as any,
            headers: (request as any).headers || {},
          }) : net.request({
            url: request.url,
            method: request.method as any,
            headers: (request as any).headers || {},
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

          clientReq.on('response', async (res: any) => {
            const pass = new PassThrough();
            res.on('data', (chunk: Buffer) => pass.write(chunk));
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
      await register('http');
      await register('https');
    }

    // 定时扫描本地缓存文件大小，避免拦截，满足"实时统计"诉求
    if (!this.sizeScanTimer) {
      this.sizeScanTimer = setInterval(async () => {
        // 检查暂停状态，如果已暂停则跳过扫描
        if (this.isPaused) return;
        
        const list = Array.from(this.records.values()).filter((r) => r.tempFilePath);
        for (const r of list) {
          try {
            const st = await fs.stat(r.tempFilePath!);
            if (!r.sizeOnDisk || r.sizeOnDisk !== st.size) {
              r.sizeOnDisk = st.size;
              this.schedulePersistIndex();
            }
          } catch { /* ignore */ }
        }
      }, 2000);
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
    if (this.sizeScanTimer) { clearInterval(this.sizeScanTimer); this.sizeScanTimer = null; }
  }

  getRecords(): ResourceRecord[] {
    return Array.from(this.records.values());
  }

  // 队列：基于已记录的 URL 后台下载至临时目录（不拦截）
  private enqueueDownload(recId: string) {
    this.downloadQueue.push(recId);
    this.processQueue();
  }

  private processQueue() {
    // 检查暂停状态，如果已暂停则不处理队列
    if (this.isPaused) return;
    
    while (this.activeDownloads < this.maxConcurrentDownloads && this.downloadQueue.length > 0) {
      const id = this.downloadQueue.shift()!;
      const rec = this.records.get(id);
      if (!rec) continue;
      if (rec.type === 'document') continue;
      if (rec.tempFilePath) continue;
      this.activeDownloads += 1;
      this.fetchToTemp(rec).finally(() => {
        this.activeDownloads -= 1;
        this.processQueue();
      });
    }
  }

  private async fetchToTemp(rec: ResourceRecord): Promise<void> {
    try {
      // 检查暂停状态，如果已暂停则跳过下载
      if (this.isPaused) return;
      
      const filesRoot = path.join(this.opts.tempDir, 'files');
      await fs.ensureDir(filesRoot);
      const ext = path.extname(new URL(rec.url).pathname) || '';
      const outPath = path.join(filesRoot, 'raw', `${rec.id}${ext}`);
      await fs.ensureDir(path.dirname(outPath));

      const ses = session.fromPartition(this.opts.sessionPartition) as any;
      const requester = (ses && ses.net && typeof ses.net.request === 'function') ? ses.net : (net as any);
      let urlToGet = rec.url;
      for (let i = 0; i < 3; i++) {
        const bytes = await new Promise<number>((resolve, reject) => {
          const req = requester.request({ url: urlToGet, method: 'GET', headers: rec.referrer ? { Referer: rec.referrer } : {} });
          const ws = fs.createWriteStream(outPath);
          let acc = 0;
          req.on('response', (res: any) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
              try { urlToGet = String(res.headers.location); req.abort(); ws.close(); } catch {}
              resolve(-1);
              return;
            }
            res.on('data', (c: Buffer) => (acc += c.length));
            res.on('error', reject); ws.on('error', reject);
            ws.on('finish', () => resolve(acc));
            res.pipe(ws);
          });
          req.on('error', reject);
          req.end();
        });
        if (bytes === -1) continue;
        if (bytes > 0) {
          rec.tempFilePath = outPath;
          rec.sizeOnDisk = bytes;
          this.schedulePersistIndex();
        }
        break;
      }
    } catch {
      // ignore
    }
  }
}



