import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getEnv } from "./env";
import { getStorage } from "./storage";

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const env = getEnv();
  const response = await getStorage().send(
    new GetObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: key }),
  );
  const bytes = await response.Body?.transformToByteArray();
  return Buffer.from(bytes ?? []);
}

export async function getObjectText(key: string): Promise<string> {
  return (await getObjectBuffer(key)).toString("utf8");
}
