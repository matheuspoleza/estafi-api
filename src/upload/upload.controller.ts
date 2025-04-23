import {
  Controller,
  Post,
  Get,
  UploadedFile,
  UseInterceptors,
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File): Promise<any> {
    return this.uploadService.uploadFile(file);
  }

  @Get(':bucketName/:fileName')
  async getFileUrl(
    @Param('bucketName') bucketName: string,
    @Param('fileName') fileName: string,
  ): Promise<{ url: string }> {
    const url = await this.uploadService.getFileUrl(bucketName, fileName);
    return { url };
  }
}
