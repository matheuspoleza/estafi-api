import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class WhatsappQueueService {
  constructor(@InjectQueue('whatsapp') private whatsappQueue: Queue) {}

  async addMessageToQueue(data: any) {
    console.log('data', data);

    return this.whatsappQueue.add('messageReceived', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
  }
}
