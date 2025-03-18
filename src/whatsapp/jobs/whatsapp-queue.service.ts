import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class WhatsappQueueService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappQueueService.name);

  constructor(@InjectQueue('whatsapp') private whatsappQueue: Queue) {}

  async onModuleInit() {
    await this.checkRedisConnection();
  }

  private async checkRedisConnection(): Promise<void> {
    try {
      // Verifica se o cliente Redis está conectado usando a instância da fila
      const client = this.whatsappQueue.client;
      await client.ping();
      this.logger.log('Conexão com Redis estabelecida com sucesso');
    } catch (error) {
      this.logger.error(
        `Erro ao conectar com Redis: ${error.message}`,
        error.stack,
      );
      throw new Error(
        'Não foi possível conectar ao Redis. Verifique se o serviço está em execução.',
      );
    }
  }

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
