import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getEnv } from "./env";

let client: S3Client | null = null;

export function getStorage(): S3Client {
  if (client) return client;
  const env = getEnv();
  client = new S3Client({
    region: env.STORAGE_REGION,
    endpoint: env.STORAGE_ENDPOINT,
    forcePathStyle: env.STORAGE_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.STORAGE_ACCESS_KEY,
      secretAccessKey: env.STORAGE_SECRET_KEY,
    },
  });
  return client;
}

export async function ensureBucket(): Promise<void> {
  const env = getEnv();
  const s3 = getStorage();
  try {
    await s3.send(new HeadBucketCommand({ Bucket: env.STORAGE_BUCKET }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: env.STORAGE_BUCKET }));
  }
}

export async function putObject(params: {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType: string;
}) {
  const env = getEnv();
  await getStorage().send(
    new PutObjectCommand({
      Bucket: env.STORAGE_BUCKET,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    }),
  );
  return { bucket: env.STORAGE_BUCKET, key: params.key };
}

export async function deleteObject(key: string) {
  const env = getEnv();
  await getStorage().send(new DeleteObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: key }));
}

export async function signedGetUrl(key: string, expiresIn = 3600) {
  const env = getEnv();
  return getSignedUrl(
    getStorage(),
    new GetObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: key }),
    { expiresIn },
  );
}
