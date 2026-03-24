/**
 * S3-compatible file storage with local filesystem fallback.
 *
 * Set S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY to use S3.
 * Otherwise falls back to local ./data/uploads/ directory.
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { log } from "@/lib/logger";

interface UploadResult {
  key: string;
  size: number;
  contentType: string;
}

interface StorageBackend {
  upload(key: string, buffer: Buffer, contentType: string): Promise<void>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getUrl(key: string): string;
}

// ─── Local Filesystem Backend ──────────────────────────────────────────────

const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

const localBackend: StorageBackend = {
  async upload(key, buffer) {
    ensureUploadsDir();
    fs.writeFileSync(path.join(UPLOADS_DIR, key), buffer);
  },
  async download(key) {
    return fs.readFileSync(path.join(UPLOADS_DIR, key));
  },
  async delete(key) {
    const filePath = path.join(UPLOADS_DIR, key);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  },
  getUrl(key) {
    return `/api/files/${key}`;
  },
};

// ─── S3 Backend ─────────────────────────────────────────────────────────────

function getS3Backend(): StorageBackend | null {
  const endpoint = process.env.S3_ENDPOINT;
  const bucket = process.env.S3_BUCKET;
  const accessKey = process.env.S3_ACCESS_KEY;
  const secretKey = process.env.S3_SECRET_KEY;

  if (!endpoint || !bucket || !accessKey || !secretKey) return null;

  return {
    async upload(key, buffer, contentType) {
      const date = new Date().toUTCString();
      const resource = `/${bucket}/${key}`;
      const stringToSign = `PUT\n\n${contentType}\n${date}\n${resource}`;
      const signature = crypto
        .createHmac("sha1", secretKey)
        .update(stringToSign)
        .digest("base64");

      const url = `${endpoint}/${bucket}/${key}`;
      const res = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": contentType,
          Date: date,
          Authorization: `AWS ${accessKey}:${signature}`,
        },
        body: new Uint8Array(buffer),
      });

      if (!res.ok) throw new Error(`S3 upload failed: ${res.status}`);
    },

    async download(key) {
      const date = new Date().toUTCString();
      const resource = `/${bucket}/${key}`;
      const stringToSign = `GET\n\n\n${date}\n${resource}`;
      const signature = crypto
        .createHmac("sha1", secretKey)
        .update(stringToSign)
        .digest("base64");

      const url = `${endpoint}/${bucket}/${key}`;
      const res = await fetch(url, {
        headers: {
          Date: date,
          Authorization: `AWS ${accessKey}:${signature}`,
        },
      });

      if (!res.ok) throw new Error(`S3 download failed: ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    },

    async delete(key) {
      const date = new Date().toUTCString();
      const resource = `/${bucket}/${key}`;
      const stringToSign = `DELETE\n\n\n${date}\n${resource}`;
      const signature = crypto
        .createHmac("sha1", secretKey)
        .update(stringToSign)
        .digest("base64");

      const url = `${endpoint}/${bucket}/${key}`;
      await fetch(url, {
        method: "DELETE",
        headers: {
          Date: date,
          Authorization: `AWS ${accessKey}:${signature}`,
        },
      });
    },

    getUrl(key) {
      return `${endpoint}/${bucket}/${key}`;
    },
  };
}

// ─── Exports ────────────────────────────────────────────────────────────────

function getBackend(): StorageBackend {
  return getS3Backend() || localBackend;
}

/**
 * Generate a unique storage key for a file.
 */
export function generateFileKey(filename: string): string {
  const ext = path.extname(filename);
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  return `${hash}${ext}`;
}

/**
 * Upload a file buffer and return metadata.
 */
export async function uploadFile(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<UploadResult> {
  const key = generateFileKey(filename);
  const backend = getBackend();
  await backend.upload(key, buffer, contentType);
  log.info("File uploaded", { key, size: buffer.length, contentType });
  return { key, size: buffer.length, contentType };
}

/**
 * Download a file by key.
 */
export async function downloadFile(key: string): Promise<Buffer> {
  return getBackend().download(key);
}

/**
 * Delete a file by key.
 */
export async function deleteFile(key: string): Promise<void> {
  await getBackend().delete(key);
  log.info("File deleted", { key });
}

/**
 * Get a URL for accessing a file.
 */
export function getFileUrl(key: string): string {
  return getBackend().getUrl(key);
}

/**
 * Get the current storage backend name.
 */
export function getStorageBackendName(): string {
  return getS3Backend() ? "s3" : "local";
}
