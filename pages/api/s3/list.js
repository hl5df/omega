import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const client = new S3Client({ region: process.env.BUCKET_REGION });

export default async function handler(req, res) {
  try {
    const prefix = req.query.prefix || "";
    const data = await client.send(
      new ListObjectsV2Command({
        Bucket: process.env.BUCKET_NAME,
        Prefix: prefix,
        Delimiter: "/",
      })
    );
    const folders = (data.CommonPrefixes || []).map((p) => p.Prefix);
    const objects = (data.Contents || [])
      .filter((o) => o.Key !== prefix) // exclude the prefix itself
      .map((o) => ({ key: o.Key, size: o.Size, lastModified: o.LastModified }))
      .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
    res.json({
      prefix,
      folders,
      objects,
      bucket: process.env.BUCKET_NAME,
      region: process.env.BUCKET_REGION,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
