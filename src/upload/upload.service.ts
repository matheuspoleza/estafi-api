import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { MinioService } from 'nestjs-minio-client';

interface UploadResponse {
  url: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
}

@Injectable()
export class UploadService {
  private supabase;
  private readonly defaultBucketName = 'uploads';

  constructor(
    private configService: ConfigService,
    private readonly minioService: MinioService,
  ) {
    this.supabase = createClient(
      this.configService.get('SUPABASE_URL'),
      this.configService.get('SUPABASE_KEY'),
    );
  }

  private sanitizeFileName(fileName: string): string {
    const normalized = fileName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    const sanitized = normalized
      .replace(/[^a-z0-9.-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const timestamp = new Date().getTime();
    const uniqueId = Math.random().toString(36).substring(2, 8);
    const extension = fileName.split('.').pop()?.toLowerCase();

    return `${sanitized}-${timestamp}-${uniqueId}.${extension}`;
  }

  async uploadFile(file: Express.Multer.File): Promise<UploadResponse> {
    const fileExt = file.originalname.split('.').pop();
    const fileName = this.sanitizeFileName(file.originalname);
    const filePath = `${fileName}`;

    const { error: uploadError } = await this.supabase.storage
      .from(this.defaultBucketName)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype || `application/${fileExt}`,
      });

    if (uploadError) {
      throw new Error(`Erro ao fazer upload: ${uploadError.message}`);
    }

    const {
      data: { publicUrl },
    } = this.supabase.storage
      .from(this.defaultBucketName)
      .getPublicUrl(filePath);

    return {
      url: publicUrl,
      fileName: fileName,
      originalName: file.originalname,
      mimeType: file.mimetype || `application/${fileExt}`,
      size: file.size,
    };
  }

  async getFileUrl(bucketName: string, fileName: string): Promise<string> {
    try {
      const endPoint = this.configService.get('MINIO_ENDPOINT') || 'localhost';
      const port = this.configService.get('MINIO_PORT') || 9000;
      const useSSL = this.configService.get('MINIO_USE_SSL') === 'true';

      // Remove protocolo e porta se já existirem no endpoint
      const cleanEndpoint = endPoint
        .replace(/^https?:\/\//, '')
        .replace(/:\d+$/, '');

      const protocol = useSSL ? 'https' : 'http';
      const url = `${protocol}://${cleanEndpoint}:${port}/${bucketName}/${fileName}`;

      return url;
    } catch (error) {
      throw new Error(`Erro ao gerar URL do arquivo: ${error.message}`);
    }
  }
}
