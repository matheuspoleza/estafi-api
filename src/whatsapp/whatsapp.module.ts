import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { WhatsappConsumer } from './jobs/whatsapp.consumer';
import { WhatsappQueueService } from './jobs/whatsapp-queue.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'whatsapp',
    }),
  ],
  controllers: [WhatsappController],
  providers: [WhatsappService, WhatsappConsumer, WhatsappQueueService],
  exports: [WhatsappService, WhatsappQueueService],
})
export class WhatsappModule {}
