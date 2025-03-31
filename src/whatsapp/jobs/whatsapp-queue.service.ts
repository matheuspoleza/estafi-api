import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class WhatsappQueueService {
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
    datetime,
  }: {
    sessionId: string;
    agentId: string;
    phoneNumber: string;
    instanceId: string;
    instanceName: string;
    datetime: string;
  }) {
    const existingJobs = await this.webhookQueue
      .getJobs(['active', 'delayed', 'completed', 'waiting'])
      .then((jobs) => jobs.filter((job) => job?.id));

    const existingJob = existingJobs.find((job) => job && job.id === sessionId);

    if (existingJob) {
      await existingJob.remove();
    }

    const processMessagesJobs = await this.whatsappQueue
      .getJobs(['delayed', 'active', 'waiting', 'completed'])
      .then((jobs) => jobs.filter((job) => job?.id));

    const messagesData = processMessagesJobs
      .filter((job) => job.data.sessionId === sessionId)
      .map((job) => job.data);

    await this.webhookQueue.add(
      'batch-respond-messages',
      {
        messages: messagesData ?? [],
        agentId,
        phoneNumber,
        instanceId,
        instanceName,
        sessionId,
        datetime,
        clientName: messagesData[0].clientName,
      },
      {
        jobId: sessionId,
        delay: 20000,
      },
    );
  }
}
