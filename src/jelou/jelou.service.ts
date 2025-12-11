import { forwardRef, HttpException, Inject, Injectable } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { BitrixService } from 'src/bitrix/bitrix.service';

@Injectable()
export class JelouService {
  JELOU_API_BASE = 'https://api.jelou.ai';
  JELOU_BOT_ID = '2608e658-6100-41ec-905f-26eac23c47b8';
  JELOU_CLIENT_ID = 'S7U3JRPID6drZjpJJejDjznygNee8Qvw';
  JELOU_CLIENT_SECRET =
    'pfAJNqbmRFai2rtYtUgQVmzbf4MUgqd6dRwCgCg1RDUStLqfQQ7QJ8XAPRjD0OCe';
  JELOU_TIMEOUT_MS = 8000;
  private api;
  constructor(
    @Inject(forwardRef(() => BitrixService))
      private readonly bitrixService: BitrixService,
  ) {
    const basic =
      'Basic ' +
      Buffer.from(
        `${this.JELOU_CLIENT_ID}:${this.JELOU_CLIENT_SECRET}`,
      ).toString('base64');

    this.api = axios.create({
      baseURL: this.JELOU_API_BASE,
      timeout: this.JELOU_TIMEOUT_MS,
      headers: { Authorization: basic, 'Content-Type': 'application/json' },
    });
  }

  /*   async enviarMensaje(telefono: string, mensaje: string) {
    const response = await axios.post(
      this.apiUrl,
      { telefono, mensaje },
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      },
    );
    return response.data;
  } */

  async sendText(userId: string, text: string) {
    try {
      const body = { botId: this.JELOU_BOT_ID, userId, type: 'text', text };
    
      const { data } = await this.api.post('/v1/whatsapp/messages', body);
      return data;
    } catch (e) {
      console.log(e);
      const err = e as AxiosError;
      const status = err.response?.status ?? 500;
      const details = err.response?.data ?? err.message;
      throw new HttpException(
        { message: 'Jelou sendText failed', details },
        status,
      );
    }
  }

async closeConversation(userId: string) {
  try {
    console.time(`[Jelou][close] ${userId}`);

    const datos = await this.bitrixService.buscarNegociacionPorID(userId);
    const contactoId = datos?.contactoId;

    if (!contactoId) {
      console.warn('[Jelou][close] Faltan datos: contactoId indefinido');
      return;
    }

    let telefono = await this.bitrixService.obtenerTelefonoPorContactoId(contactoId);
    if (!telefono) {
      console.warn('[Jelou][close] Faltan datos: teléfono no encontrado');
      return;
    }

    // Normaliza: deja solo dígitos (quita +, espacios, guiones, etc.)
    const telefonoNorm = String(telefono).replace(/[^\d]/g, '');
    if (!telefonoNorm) {
      console.warn('[Jelou][close] Teléfono inválido tras normalizar:', telefono);
      return;
    }

    const path = `/v1/bots/${this.JELOU_BOT_ID}/conversations/external/close`;
    const body = { userId: telefonoNorm };

    // URL final (baseURL + path)
    const finalUrl = new URL(path, this.api.defaults.baseURL).toString();

    // Obtén headers por defecto del instance de axios (maneja AxiosHeaders v1 y objetos plain)
    const dft = this.api.defaults.headers as any;
    const baseHeaders = dft?.toJSON ? dft.toJSON() : (dft || {});
    // axios separa por método; mergeamos para POST
    const mergedHeaders = {
      ...(baseHeaders.common || {}),
      ...(baseHeaders.post || {}),
      ...(baseHeaders || {}),
      'Content-Type': 'application/json',
    };

    // Enmascara Authorization
    if (mergedHeaders.Authorization) {
      mergedHeaders.Authorization = String(mergedHeaders.Authorization).slice(0, 16) + '…(masked)';
    }
    if (mergedHeaders.authorization) {
      mergedHeaders.authorization = String(mergedHeaders.authorization).slice(0, 16) + '…(masked)';
    }

    // 🔎 Log de la petición completa
    console.log('[Jelou][REQ close]', {
      method: 'POST',
      url: finalUrl,
      headers: mergedHeaders,
      body,
    });

    // Llamada real
    const { data } = await this.api.post(path, body);

    console.log(`[Jelou][close] OK → contactoId=${contactoId} telefono=${telefonoNorm}`);
    console.timeEnd(`[Jelou][close] ${userId}`);
    return data;
  } catch (e) {
    const err = e as AxiosError;
    const status = err.response?.status ?? 500;
    const details = err.response?.data ?? err.message;

    // Log de error con URL final si está en el config
    const cfg = err.config;
    const errUrl = cfg?.url ? new URL(cfg.url, cfg.baseURL).toString() : '(desconocida)';
    console.error('[Jelou][ERR close]', { status, url: errUrl, details });

    throw new HttpException({ message: 'Jelou closeConversation failed', details }, status);
  }
}
}
