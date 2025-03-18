import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  processWhatsappMessage(messageData: any): void {
    this.logger.log(
      `Processando mensagem WhatsApp: ${JSON.stringify(messageData)}`,
    );

    // Implemente aqui a lógica para tratar a mensagem
    // Por exemplo: extrair informações, salvar em banco de dados, etc.
  }
}
