import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import log from 'electron-log/node';

// Server-side equivalent of the renderer's window.electron.makerworld.fetch IPC bridge
// (electron/main.ts's "makerworld:fetch" handler). This works - and only works - when
// Next.js's server is started in-process with Electron's main process (see
// startNextJSServer() in electron/main.ts, which calls next's startServer() directly rather
// than spawning a child process, and only in production - "next dev" runs as a genuinely
// separate plain Node process), so `session` here is the real Electron API, not the string
// the 'electron' package resolves to when required from a plain, non-Electron Node process.
// This lets MakerWorld actions be driven over plain HTTP (e.g. browser automation hitting the
// app's port directly) without needing the Electron renderer/preload context at all.
//
// `electron` MUST be imported dynamically (not as a static top-level import): Next's build step
// ("next build") and "next dev" both load this module in a plain Node process to statically
// analyze it, and a static `import ... from 'electron'` throws immediately in that context
// ("Electron failed to install correctly") - which would break the production build itself, not
// just dev. A dynamic import here defers that resolution to when a request actually invokes
// this function, which in production only happens inside Electron's own process.
async function getMakerWorldSession() {
  const electron = await import('electron');
  return electron.session.fromPartition('persist:makerworld');
}

const MW_API_URL = 'https://makerworld.com/api';

const ALLOWED_MAKERWORLD_DOMAINS = ['makerworld.com', 'api.bambulab.com', 'bambulab.com'];

function extractApiErrorDetail(responseBody) {
  if (!responseBody) return undefined;
  try {
    const parsed = JSON.parse(responseBody);
    if (typeof parsed?.error === 'string') return parsed.error;
    if (typeof parsed?.message === 'string') return parsed.message;
  } catch {
    // Not JSON - nothing to extract.
  }
  return undefined;
}

async function makerWorldSessionFetch(url, options = {}) {
  const parsedUrl = new URL(url);
  const isAllowedDomain = ALLOWED_MAKERWORLD_DOMAINS.some(
    (domain) => parsedUrl.hostname === domain || parsedUrl.hostname.endsWith(`.${domain}`)
  );
  if (!isAllowedDomain) {
    throw new Error(`Request to unauthorized domain: ${parsedUrl.hostname}`);
  }

  const method = options.method || 'GET';
  log.info(`[MakerWorld API server] >>> ${method} ${url}`);
  if (options.body) {
    log.info(`[MakerWorld API server] >>> Request body:`, options.body);
  }

  const sess = await getMakerWorldSession();
  const response = await sess.fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    body: options.body,
  });
  const body = await response.text();
  log.info(`[MakerWorld API server] <<< ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const detail = extractApiErrorDetail(body);
    const message = detail
      ? `MakerWorld API error: ${response.status} ${response.statusText} - ${detail}`
      : `MakerWorld API error: ${response.status} ${response.statusText}`;
    log.error(`[MakerWorld API server] Request failed: ${message} | url=${url} | responseBody=${body}`);
    throw new Error(message);
  }

  try {
    return body ? JSON.parse(body) : null;
  } catch {
    throw new Error('Failed to parse MakerWorld response as JSON');
  }
}

export async function getMakerWorldS3Config() {
  return makerWorldSessionFetch(`${MW_API_URL}/v1/user-service/my/s3config?useType=1`);
}

export async function createMakerWorldDraft(draftData) {
  return makerWorldSessionFetch(`${MW_API_URL}/v1/design-service/my/draft`, {
    method: 'POST',
    body: JSON.stringify(draftData),
  });
}

export async function updateMakerWorldDraft(draftId, draftData) {
  return makerWorldSessionFetch(`${MW_API_URL}/v1/design-service/my/draft/${draftId}`, {
    method: 'PUT',
    body: JSON.stringify(draftData),
  });
}

export async function submitMakerWorldDraft(draftId) {
  return makerWorldSessionFetch(`${MW_API_URL}/v1/design-service/my/draft/${draftId}/submit`, {
    method: 'POST',
  });
}

// Mirrors MakerWorldClientAPI.uploadFileToS3 - this part never needed Electron IPC even
// client-side, since presigned-URL S3 uploads go straight to AWS, not through MakerWorld's
// Cloudflare-fronted domains. Kept here too so the whole print-profile flow lives server-side.
export async function uploadFileToMakerWorldS3(fileName, fileBuffer, userId, s3Config) {
  const today = new Date().toISOString().slice(0, 10);
  const randomHex = crypto.randomBytes(8).toString('hex');
  const fileExt = fileName.includes('.') ? fileName.split('.').pop() : 'bin';
  const key = `makerworld/user/${userId}/draft/${today}_${randomHex}.${fileExt}`;

  log.info(`[MakerWorld S3 server] >>> PUT s3://${s3Config.bucketName}/${key} (${fileBuffer.length} bytes)`);

  const client = new S3Client({
    region: s3Config.region,
    endpoint: `https://${s3Config.endpoint}`,
    credentials: {
      accessKeyId: s3Config.accessKeyId,
      secretAccessKey: s3Config.accessKeySecret,
      sessionToken: s3Config.securityToken,
    },
  });

  // Sanitize filename for the Content-Disposition header to prevent header injection
  const sanitizedFileName = fileName.replace(/[\x00-\x1F\x7F"\\]/g, '_');

  await client.send(new PutObjectCommand({
    Bucket: s3Config.bucketName,
    Key: key,
    Body: fileBuffer,
    ContentDisposition: `attachment; filename="${sanitizedFileName}"`,
    ContentType: 'application/octet-stream',
  }));

  const url = `${s3Config.cdnUrl}/${key}`;
  log.info(`[MakerWorld S3 server] <<< Upload successful: ${url}`);
  return { url };
}
