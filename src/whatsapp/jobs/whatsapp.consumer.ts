import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { WhatsappService } from '../whatsapp.service';

@Processor('whatsapp')
export class WhatsappConsumer {
  private readonly logger = new Logger(WhatsappConsumer.name);

  constructor(private readonly whatsappService: WhatsappService) {}

  @Process('messageReceived')
  async processMessage(job: Job<any>) {
    this.logger.debug(`Processando mensagem... ${JSON.stringify(job.data)}`);

    try {
      const webhookUrl = `${process.env.N8N_WEBHOOK_HOST}/whatsapp/processar-mensagem`;

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(job.data),
      });

      if (!response.ok) {
        this.logger.error(
          `Erro ao chamar webhook: ${response.status} ${response.statusText}`,
        );
      } else {
        this.logger.debug('Webhook chamado com sucesso');
      }
    } catch (error) {
      this.logger.error(`Erro ao processar mensagem: ${error.message}`);
    }

    return true;
  }
}
