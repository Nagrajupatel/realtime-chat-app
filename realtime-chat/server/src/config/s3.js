import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Credentials are read from AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY
const s3 = new S3Client({ region: process.env.AWS_REGION });
const Bucket = process.env.AWS_S3_BUCKET;

// AES-256 encryption at rest (SSE-S3) + SHA-256 checksum verified by S3 on upload
export async function putObject(Key, Body, ContentType, sha256Base64) {
  await s3.send(
    new PutObjectCommand({
      Bucket,
      Key,
      Body,
      ContentType,
      ServerSideEncryption: 'AES256',
      ChecksumSHA256: sha256Base64,
    })
  );
}

export async function getObject(Key) {
  const res = await s3.send(new GetObjectCommand({ Bucket, Key }));
  return Buffer.from(await res.Body.transformToByteArray());
}

export async function deleteObject(Key) {
  await s3.send(new DeleteObjectCommand({ Bucket, Key }));
}
