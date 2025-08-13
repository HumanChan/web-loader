import crypto from 'node:crypto';

export interface Normalized {
  normalizedUrl: string;
  host: string;
  pathname: string;
  queryHashSuffix?: string;
  relativePathFromRoot: string;
}

function stableQueryHash(u: URL): string | undefined {
  if (!u.search || u.search === '?') return undefined;
  const params = new URLSearchParams(u.search);
  const entries = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b));
  const norm = new URLSearchParams(entries).toString();
  const h = crypto.createHash('md5').update(norm).digest('hex').slice(0, 8);
  return `__q_${h}`;
}

export function normalizeUrl(url: string, mainDocumentUrl: string): Normalized {
  const base = new URL(mainDocumentUrl);
  const u = new URL(url, base);
  u.hash = '';
  u.hostname = u.hostname.toLowerCase();
  if ((u.protocol === 'http:' && u.port === '80') || (u.protocol === 'https:' && u.port === '443')) {
    u.port = '';
  }
  const queryHashSuffix = stableQueryHash(u);
  const normalizedUrl = u.toString();
  const isExternal = u.hostname !== base.hostname;
  const pathname = u.pathname;
  const relativePathFromRoot = isExternal ? `external/${u.hostname}${pathname}` : pathname;
  return {
    normalizedUrl,
    host: u.hostname,
    pathname,
    queryHashSuffix,
    relativePathFromRoot,
  };
}


