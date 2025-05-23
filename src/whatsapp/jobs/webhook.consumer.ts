import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Logger, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Queue } from 'bull';

@Injectable()
@Processor('webhook')
export class WebhookConsumer {
  private readonly logger = new Logger(WebhookConsumer.name);

  constructor(
    private configService: ConfigService,
    @InjectQueue('whatsapp') private whatsappQueue: Queue,
  ) {}

  @Process('batch-respond-messages')
  async batchRespondMessages(job: Job<any>) {
    const messagesQueueJobs = await this.whatsappQueue
      .getJobs(['active', 'delayed', 'completed', 'waiting'])
      .then((jobs) => jobs.filter((job) => job?.id && job.id === job.id));

    try {
      const webhookUrl = `${this.configService.get('N8N_WEBHOOK_HOST')}/whatsapp/messages`;

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(job.data),
      });

      if (!response.ok) {
        this.logger.error(
          `Failed to call batch respond messages: ${response.status} ${response.statusText}`,
        );
      } else {
        this.logger.debug('Batch respond messages called successfully');
        messagesQueueJobs.forEach(async (job) => {
          await job.remove();
        });
      }
    } catch (error) {
      this.logger.error(`Error batch respond messages: ${error.message}`);
    }

    return true;
  }
}
