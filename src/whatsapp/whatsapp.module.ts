import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappConsumer } from './jobs/whatsapp.consumer';
import { WhatsappQueueService } from './jobs/whatsapp-queue.service';
import { WebhookConsumer } from './jobs/webhook.consumer';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'whatsapp',
    }),
    BullModule.registerQueue({
      name: 'webhook',
    }),
  ],
  controllers: [WhatsappController],
  providers: [WhatsappConsumer, WhatsappQueueService, WebhookConsumer],
  exports: [WhatsappQueueService],
})
export class WhatsappModule {}
