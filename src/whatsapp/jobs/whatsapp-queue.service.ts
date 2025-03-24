import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Logger } from '@nestjs/common';

@Injectable()
export class WhatsappQueueService {
  private readonly logger = new Logger(WhatsappQueueService.name);

  constructor(
    @InjectQueue('whatsapp') private whatsappQueue: Queue,
    @InjectQueue('webhook') private webhookQueue: Queue,
  ) {}

  async addMessageToQueue(data: any) {
    return this.whatsappQueue.add('messageReceived', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
  }

  async debouncedBatchRespondMessages({
    sessionId,
    agentId,
    phoneNumber,
    instanceId,
    instanceName,
  }: {
    sessionId: string;
    agentId: string;
    phoneNumber: string;
    instanceId: string;
    instanceName: string;
  }) {
    const existingJobs = await this.webhookQueue.getJobs([
      'delayed',
      'active',
      'waiting',
    ]);

    const existingJob = existingJobs.find((job) => job.id === sessionId);

    if (existingJob) {
      await existingJob.remove();
    }

    const processMessagesJobs = await this.whatsappQueue.getJobs([
      'delayed',
      'active',
      'waiting',
      'completed',
    ]);

    const messagesData = processMessagesJobs
      .filter((job) => job.data.sessionId === sessionId)
      .map((job) => job.data);

    await this.webhookQueue.add('batch-respond-messages', {
      messages: messagesData ?? [],
      jobId: sessionId,
      agentId,
      phoneNumber,
      instanceId,
      instanceName,
      delay: 10000,
    });
  }
}
