import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

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
  private readonly bucketName = 'uploads';

  constructor(private configService: ConfigService) {
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
      .from(this.bucketName)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype || `application/${fileExt}`,
      });

    if (uploadError) {
      throw new Error(`Erro ao fazer upload: ${uploadError.message}`);
    }

    const {
      data: { publicUrl },
    } = this.supabase.storage.from(this.bucketName).getPublicUrl(filePath);

    return {
      url: publicUrl,
      fileName: fileName,
      originalName: file.originalname,
      mimeType: file.mimetype || `application/${fileExt}`,
      size: file.size,
    };
  }
}
