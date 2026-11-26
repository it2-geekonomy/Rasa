import { randomUUID } from 'crypto';
import { extname } from 'path';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const ALLOWED_MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
};

const ALLOWED_FOLDERS = new Set(['events', 'artists', 'general']);

@Injectable()
export class UploadsService {
  constructor(private readonly config: ConfigService) {}

  async uploadImage(file: Express.Multer.File | undefined, folder = 'general') {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    const mime = file.mimetype?.toLowerCase();
    const fallbackExt = ALLOWED_MIME_EXT[mime];
    if (!fallbackExt) {
      throw new BadRequestException(
        'Unsupported image type. Use JPEG, PNG, WebP, GIF, or AVIF.',
      );
    }

    const accessKeyId = this.config.get<string>('r2.accessKeyId') ?? '';
    const secretAccessKey = this.config.get<string>('r2.secretAccessKey') ?? '';
    const bucketName = this.config.get<string>('r2.bucketName') ?? '';
    const endpoint = this.config.get<string>('r2.endpoint') ?? '';
    const publicUrl = this.config.get<string>('r2.publicUrl') ?? '';
    const region = this.config.get<string>('r2.region') ?? 'auto';

    if (!accessKeyId || !secretAccessKey || !bucketName || !endpoint || !publicUrl) {
      throw new ServiceUnavailableException('Cloudflare R2 storage is not configured');
    }

    const safeFolder = ALLOWED_FOLDERS.has(folder) ? folder : 'general';
    const rawExt = extname(file.originalname || '').toLowerCase();
    const ext = rawExt && /^\.[a-z0-9]{1,8}$/.test(rawExt) ? rawExt : fallbackExt;
    const baseName = (file.originalname || 'image')
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'image';

    const key = `rasa/${safeFolder}/${randomUUID()}-${baseName}${ext}`;

    const client = new S3Client({
      region,
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });

    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: mime,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    return {
      key,
      url: `${publicUrl}/${key}`,
      contentType: mime,
      size: file.size,
    };
  }
}
