import { Module } from '@nestjs/common';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: process.env.REDISHOST,
        port: process.env.REDISPORT as unknown as number,
        password: process.env.REDIS_PASSWORD,
      },
    }),
    WhatsappModule,
  ],
})
export class AppModule {}
