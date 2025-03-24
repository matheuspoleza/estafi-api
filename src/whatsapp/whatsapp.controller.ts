import { Body, Controller, Post } from '@nestjs/common';
import { WhatsappQueueService } from './jobs/whatsapp-queue.service';
import { Logger } from '@nestjs/common';

@Controller('whatsapp')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(private readonly whatsappQueueService: WhatsappQueueService) {}

  @Post('webhook/message-received')
  async messageReceived(@Body() body: any): Promise<any> {
    await this.whatsappQueueService.addMessageToQueue(body);

    this.logger.debug('Message received', {
      sessionId: body.sessionId,
      agentId: body.agentId,
      phoneNumber: body.phoneNumber,
      instanceId: body.instanceId,
      instanceName: body.instanceName,
      body,
    });

    await this.whatsappQueueService.debouncedBatchRespondMessages({
      sessionId: body.sessionId,
      agentId: body.agentId,
      phoneNumber: body.phoneNumber,
      instanceId: body.instanceId,
      instanceName: body.instanceName,
    });

    return {
      message: 'Message received',
      status: 'success',
    };
  }
}
