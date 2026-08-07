import { S3Client } from "@aws-sdk/client-s3";

// Railway Storage Buckets (and any S3-compatible provider) expose S3
// credentials as env vars. `railway bucket credentials` prints exactly the
// AWS_* names below, so those are what we read first; a few common aliases
// are accepted too in case the variables were wired up by hand or the
// bucket was renamed as a Railway "reference variable".
const endpoint = process.env.AWS_ENDPOINT_URL || process.env.BUCKET_ENDPOINT;
const bucketName = process.env.AWS_S3_BUCKET_NAME || process.env.BUCKET_NAME;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.BUCKET_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.BUCKET_SECRET_ACCESS_KEY;
const region = process.env.AWS_DEFAULT_REGION || process.env.AWS_REGION || "auto";

// Railway Buckets use virtual-hosted-style URLs (bucket name as subdomain of
// storage.railway.app) by default. Older buckets may need path-style — the
// bucket's Credentials tab says which. AWS_S3_URL_STYLE=path opts into that.
const urlStyle = (process.env.AWS_S3_URL_STYLE || "virtual").toLowerCase();

/** True once every credential needed to talk to a bucket is present. */
export const bucketConfigured = Boolean(endpoint && bucketName && accessKeyId && secretAccessKey);

export const BUCKET_NAME = bucketName;

/**
 * S3 client for the configured bucket, or null when bucket env vars aren't
 * set (e.g. local development without a bucket). Callers should check
 * `bucketConfigured` / fall back to disk storage when this is null — see
 * routes/uploads.ts.
 */
export const s3Client = bucketConfigured
  ? new S3Client({
      region,
      endpoint,
      credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
      forcePathStyle: urlStyle === "path",
    })
  : null;
