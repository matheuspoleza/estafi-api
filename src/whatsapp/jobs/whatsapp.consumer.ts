import { Processor, Process } from '@nestjs/bull';
import { Logger, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bull';

@Injectable()
@Processor('whatsapp')
export class WhatsappConsumer {
  private readonly logger = new Logger(WhatsappConsumer.name);

  constructor(private configService: ConfigService) {}

  @Process('messageReceived')
  async processMessage(job: Job<any>) {
    this.logger.debug(`Processing message... ${JSON.stringify(job.data)}`);

    try {
      const webhookUrl = `${this.configService.get('N8N_WEBHOOK_HOST')}/whatsapp/processar-mensagem`;

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(job.data),
      });

      if (!response.ok) {
        this.logger.error(
          `Failed to call process message: ${response.status} ${response.statusText}`,
        );
      } else {
        this.logger.debug('Process message called successfully');
      }
    } catch (error) {
      this.logger.error(`Error processing message: ${error.message}`);
    }

    return true;
  }
}
