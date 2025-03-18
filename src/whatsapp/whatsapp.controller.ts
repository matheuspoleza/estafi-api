import { Body, Controller, Post } from '@nestjs/common';
import { WhatsappQueueService } from './jobs/whatsapp-queue.service';
import { WhatsappService } from './whatsapp.service';

@Controller('whatsapp')
export class WhatsappController {
  constructor(
    private readonly whatsappQueueService: WhatsappQueueService,
    private readonly whatsappService: WhatsappService,
  ) {}

  @Post('webhook/message-received')
  async messageReceived(@Body() body: any): Promise<any> {
    console.log(body);

    await this.whatsappQueueService.addMessageToQueue(body);

    return {
      message: 'Message received',
      status: 'success',
    };
  }
}
