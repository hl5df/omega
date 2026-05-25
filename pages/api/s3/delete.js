import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const client = new S3Client({ region: process.env.BUCKET_REGION });

export default async function handler(req, res) {
  try {
    const key = req.method === "GET" ? req.query.key : (typeof req.body === "string" ? JSON.parse(req.body) : req.body).key;
    if (!key) throw new Error("Missing key");
    await client.send(
      new DeleteObjectCommand({ Bucket: process.env.BUCKET_NAME, Key: key })
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
