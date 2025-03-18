import { Module } from '@nestjs/common';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: process.env.REDISHOST || 'localhost',
        port: parseInt(process.env.REDISPORT) || 6379,
      },
    }),
    WhatsappModule,
  ],
})
export class AppModule {}
