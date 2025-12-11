import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { JelouService } from './jelou.service';
import { BitrixService } from '../bitrix/bitrix.service';
import { ApiBody } from '@nestjs/swagger';

@Controller('jelou')
export class JelouController {
  constructor(
    private readonly jelouService: JelouService,
    private readonly bitrixService: BitrixService,
  ) {}

  @Post('webhook')
  @ApiBody({
    description: 'Recibe mensajes de Jelou y los procesa',
    type: Object,
    required: true,
    examples: {
      example1: {
        summary: 'Ejemplo de mensaje recibido',
        value: {
          telefono: '+1234567890',
          mensaje: 'Hola, este es un mensaje de prueba',
          nombre: 'Juan Perez',
        },
      },
    },
  })
  async recibirMensaje(@Body() body: any) {
    const { telefono, mensaje, nombre } = body;

    const result = await this.bitrixService.crearNegociacionSiNoExiste({
      nombre,
      telefono,
      mensaje,
    });

    console.log('Negociación procesada:', result);

    return {
      status: 'mensaje recibido y registrado en Bitrix',
      dealId: result.dealId,
    };
  }

  //responder mensaje
  @Post('responder')
  async responderMensaje(@Query('id') id: string) {
    console.log(id);
    const result = this.bitrixService.responderNegociacion(id);

    return {
      status: 'mensaje recibido y registrado en Bitrix',
    };
  }

   @Post('terminar/chat')
  async terminarChat(@Query('id') id: string) {
    console.log('terminando chat con ' + id);
    await this.jelouService.closeConversation(id);
    return {
      status: 'mensaje recibido y registrado en jelou',
    };
  } 

}
