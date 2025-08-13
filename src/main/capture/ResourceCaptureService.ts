import path from 'node:path';
import fs from 'fs-extra';
import { session } from 'electron';
import { normalizeUrl } from './UrlNormalizer';
import { ResourceRecord } from '../../shared/types';
import { nanoid } from 'nanoid';

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

export class ResourceCaptureService {
  private records: Map<string, ResourceRecord> = new Map();

  constructor(private opts: { sessionPartition: string; tempDir: string; mainDocumentUrl: string }) {}

  private async persistIndex() {
    const idxPath = path.join(this.opts.tempDir, 'index.json');
    const arr = Array.from(this.records.values());
    await fs.ensureDir(this.opts.tempDir);
    await fs.writeJson(idxPath, arr, { spaces: 2 });
  }

  async start(): Promise<void> {
    const ses = session.fromPartition(this.opts.sessionPartition);
    const filter = { urls: ['*://*/*'] };
    const handler = async (details: any) => {
      try {
        const id = nanoid();
        const normalized = normalizeUrl(details.url, this.opts.mainDocumentUrl);
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
          method: details.method || 'GET',
          statusCode: details.statusCode,
          mimeType: details.responseHeaders && details.responseHeaders['content-type'] ? String(details.responseHeaders['content-type']) : undefined,
          contentLength: details.responseHeaders && details.responseHeaders['content-length'] ? Number(details.responseHeaders['content-length']) : undefined,
          sizeOnDisk: undefined,
          startedAt: Date.now(),
          finishedAt: Date.now(),
          state: details.statusCode && details.statusCode >= 200 && details.statusCode < 400 ? 'success' : 'failed',
          referrer: details.referrer || undefined,
          originHost: normalized.host,
        };
        this.records.set(id, rec);
        await this.persistIndex();
      } catch (e) {
        // swallow for now
      }
    };
    // store handler so we can remove later
    (this as any)._handler = handler;
    ses.webRequest.onCompleted(filter, handler as any);
  }

  async stop(): Promise<void> {
    const ses = session.fromPartition(this.opts.sessionPartition);
    const h = (this as any)._handler;
    if (h) ses.webRequest.onCompleted(null as any);
    await this.persistIndex();
  }

  getRecords(): ResourceRecord[] {
    return Array.from(this.records.values());
  }
}



