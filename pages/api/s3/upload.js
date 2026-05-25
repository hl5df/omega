import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const client = new S3Client({ region: process.env.BUCKET_REGION });

export default async function handler(req, res) {
  try {
    const { key, contentType } = req.query;
    if (!key) throw new Error("Missing key");
    const url = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: key,
        ContentType: contentType || "application/octet-stream",
      }),
      { expiresIn: 300 }
    );
    res.json({ url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
