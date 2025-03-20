import { Body, Controller, Post } from '@nestjs/common';
import { WhatsappQueueService } from './jobs/whatsapp-queue.service';

@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappQueueService: WhatsappQueueService) {}

  @Post('webhook/message-received')
  async messageReceived(@Body() body: any): Promise<any> {
    await this.whatsappQueueService.addMessageToQueue(body);

    return {
      message: 'Message received',
      status: 'success',
    };
  }
}
