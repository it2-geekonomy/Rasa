import * as fs from 'fs';
import * as path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';

// Load .env from backend
const envPath = path.resolve(__dirname, '..', '.env');
const env = dotenv.parse(fs.readFileSync(envPath, 'utf8'));

const bucketName = env.R2_BUCKET_NAME;
const publicUrl = (env.R2_PUBLIC_URL || '').replace(/\/+$/, '');
const endpoint = env.R2_ENDPOINT;
const accessKeyId = env.R2_ACCESS_KEY_ID;
const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
const region = env.R2_REGION || 'auto';

if (!bucketName || !publicUrl || !endpoint || !accessKeyId || !secretAccessKey) {
  console.error('Missing R2 environment variables in backend/.env');
  process.exit(1);
}

const s3 = new S3Client({
  region,
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
};

async function uploadImages() {
  const imagesDir = path.resolve(__dirname, '..', '..', 'frontend', 'public', 'images');
  if (!fs.existsSync(imagesDir)) {
    console.error('Images directory not found:', imagesDir);
    process.exit(1);
  }

  const files = fs.readdirSync(imagesDir);
  console.log(`Found ${files.length} images to upload to Cloudflare R2 bucket: ${bucketName}`);

  let uploaded = 0;
  for (const file of files) {
    const filePath = path.join(imagesDir, file);
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) continue;

    const ext = path.extname(file).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const key = `rasa/images/${file}`;

    const body = fs.readFileSync(filePath);
    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
    uploaded++;
    if (uploaded % 20 === 0 || uploaded === files.length) {
      console.log(`Uploaded ${uploaded}/${files.length} images...`);
    }
  }

  console.log(`\nAll ${uploaded} images uploaded to R2 under rasa/images/`);

  // Now update img-map.ts
  const imgMapPath = path.resolve(__dirname, '..', '..', 'frontend', 'lib', 'rasa', 'img-map.ts');
  const imgMapContent = fs.readFileSync(imgMapPath, 'utf8');

  // Replace "/images/" with `${publicUrl}/rasa/images/`
  const updatedContent = imgMapContent.replaceAll(
    '"/images/',
    `"${publicUrl}/rasa/images/`
  );

  fs.writeFileSync(imgMapPath, updatedContent, 'utf8');
  console.log(`Updated ${imgMapPath} with R2 URLs: ${publicUrl}/rasa/images/...`);
}

uploadImages().catch((err) => {
  console.error('Upload failed:', err);
  process.exit(1);
});
