import { Body, Controller, Post } from '@nestjs/common';

@Controller('whatsapp')
export class WhatsappController {
  @Post('webhook/message-received')
  async messageReceived(@Body() body: any): Promise<any> {
    console.log(body);

    return {
      message: 'Message received',
      status: 'success',
    };
  }
}
