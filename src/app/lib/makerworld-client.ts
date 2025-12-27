/**
 * Client-side MakerWorld API that uses Electron IPC to bypass Cloudflare
 * This routes all requests through Electron's authenticated session
 */

import { z } from 'zod';
import log from 'electron-log/renderer';

// Window.electron types are defined in MakerWorldAuthContext.tsx

// Schemas
export const UserInfoResponseSchema = z.object({
  uid: z.number(),
  name: z.string(),
  handle: z.string(),
  avatar: z.string(),
  backgroundUrl: z.string(),
}).passthrough();

export const DraftDetailResponseSchema = z.object({
  id: z.number(),
  designId: z.number(),
  title: z.string(),
  summary: z.string(),
  categoryId: z.number(),
  tags: z.array(z.string()),
  cover: z.string(),
  updateTime: z.string(),
  createTime: z.string(),
  status: z.number(),
  license: z.string(),
  nsfw: z.boolean(),
}).passthrough();

export class MakerWorldClientAPIError extends Error {
  url?: string;
  method?: string;
  requestBody?: string;
  responseStatus?: number;
  responseStatusText?: string;
  responseBody?: string;

  constructor(params: {
    message: string;
    url?: string;
    method?: string;
    requestBody?: string;
    responseStatus?: number;
    responseStatusText?: string;
    responseBody?: string;
  }) {
    super(params.message);
    this.name = 'MakerWorldClientAPIError';
    Object.assign(this, params);
  }
}

export class MakerWorldClientAPI {
  private accessToken: string;
  private bblApiUrl = 'https://api.bambulab.com';
  private mwApiUrl = 'https://makerworld.com/api';

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async fetch(url: string, options: { method?: string; body?: string } = {}): Promise<unknown> {
    if (!window.electron?.makerworld?.fetch) {
      throw new Error('MakerWorld IPC not available - are you running in Electron?');
    }

    // session.fetch() automatically includes cookies from the persist:makerworld partition
    // The 'token' cookie handles authentication for all MakerWorld/BambuLab API requests
    // No Authorization header needed - session cookies are used instead
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const response = await window.electron.makerworld.fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body,
    });

    if (!response.ok) {
      const error = new MakerWorldClientAPIError({
        message: `MakerWorld API error: ${response.status} ${response.statusText}`,
        url,
        method: options.method || 'GET',
        requestBody: options.body,
        responseStatus: response.status,
        responseStatusText: response.statusText,
        responseBody: response.body,
      });
      log.error('MakerWorld API request failed:', {
        url,
        method: options.method || 'GET',
        status: response.status,
        statusText: response.statusText,
        responseBody: response.body,
        requestBody: options.body?.substring(0, 500), // Truncate for logging
      });
      throw error;
    }

    try {
      return response.body ? JSON.parse(response.body) : null;
    } catch {
      throw new MakerWorldClientAPIError({
        message: 'Failed to parse response',
        url,
        method: options.method || 'GET',
        responseStatus: response.status,
        responseBody: response.body,
      });
    }
  }

  async getUserInfo() {
    const url = `${this.bblApiUrl}/v1/design-user-service/my/preference`;
    const res = await this.fetch(url);
    const parsed = UserInfoResponseSchema.safeParse(res);
    if (!parsed.success) {
      throw new MakerWorldClientAPIError({
        message: 'Invalid user info response',
        url,
        responseBody: JSON.stringify(res),
      });
    }
    return parsed.data;
  }

  async getS3Config() {
    const url = `${this.mwApiUrl}/v1/user-service/my/s3config?useType=1`;
    return await this.fetch(url);
  }

  async createDraft(draftData: Record<string, unknown>) {
    const url = `${this.mwApiUrl}/v1/design-service/my/draft`;
    return await this.fetch(url, {
      method: 'POST',
      body: JSON.stringify(draftData),
    });
  }

  async updateDraft(draftId: string | number, draftData: Record<string, unknown>) {
    const url = `${this.mwApiUrl}/v1/design-service/my/draft/${draftId}`;
    await this.fetch(url, {
      method: 'PUT',
      body: JSON.stringify(draftData),
    });
    return null;
  }

  async getDraftById(draftId: string | number) {
    const url = `${this.mwApiUrl}/v1/design-service/my/draft/${draftId}`;
    const res = await this.fetch(url);
    const parsed = DraftDetailResponseSchema.safeParse(res);
    if (!parsed.success) {
      log.warn('Draft validation issues:', parsed.error.issues);
    }
    return res as z.infer<typeof DraftDetailResponseSchema>;
  }

  async publishDraft(draftId: string | number) {
    const url = `${this.mwApiUrl}/v1/design-service/my/draft/${draftId}/submit`;
    await this.fetch(url, { method: 'POST' });
    return null;
  }

  async uploadFileToS3(
    fileName: string,
    fileData: ArrayBuffer,
    userId: number,
    s3Config: {
      region: string;
      endpoint: string;
      accessKeyId: string;
      accessKeySecret: string;
      securityToken: string;
      bucketName: string;
      cdnUrl: string;
    }
  ): Promise<{ url: string }> {
    // Generate the S3 key (matching the original format)
    const today = new Date().toISOString().slice(0, 10);
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const fileExt = fileName.split('.').pop();
    const key = `makerworld/user/${userId}/draft/${today}_${randomHex}.${fileExt}`;

    // For S3 upload, we need to use AWS SDK on the client side
    // Since we're in a browser context, we'll use a simpler approach with presigned URLs
    // or route through a minimal server endpoint just for S3 uploads

    // Actually, for S3 uploads we can use the AWS SDK in the browser
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');

    const client = new S3Client({
      region: s3Config.region,
      endpoint: `https://${s3Config.endpoint}`,
      credentials: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.accessKeySecret,
        sessionToken: s3Config.securityToken,
      },
    });

    const command = new PutObjectCommand({
      Bucket: s3Config.bucketName,
      Key: key,
      Body: new Uint8Array(fileData),
      ContentDisposition: `attachment; filename="${fileName}"`,
      ContentType: 'application/octet-stream',
    });

    await client.send(command);

    return {
      url: `${s3Config.cdnUrl}/${key}`,
    };
  }

  async uploadFile(fileName: string, fileData: ArrayBuffer, userId: number): Promise<{ url: string }> {
    const s3Config = await this.getS3Config() as {
      region: string;
      endpoint: string;
      accessKeyId: string;
      accessKeySecret: string;
      securityToken: string;
      bucketName: string;
      cdnUrl: string;
    };

    if (!s3Config || !s3Config.bucketName) {
      throw new MakerWorldClientAPIError({
        message: 'Failed to get S3 configuration',
        url: `${this.mwApiUrl}/v1/user-service/my/s3config?useType=1`,
      });
    }

    return await this.uploadFileToS3(fileName, fileData, userId, s3Config);
  }
}
