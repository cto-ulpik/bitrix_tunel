import { forwardRef, Inject, Injectable } from '@nestjs/common';
import axios from 'axios';
import { JelouService } from 'src/jelou/jelou.service';

@Injectable()
export class BitrixService {


  constructor(
    //me da que es una dependencia circular agregar forwordRef
     @Inject(forwardRef(() => JelouService))
    private readonly jelouService: JelouService,
  ){

  }
  private readonly apiUrl = 'https://bitrix.elsagrario.fin.ec/rest/138';
  //concatena todo de una vez
  
  private readonly leadAdd =
  `${this.apiUrl}/yk2aztg75p2nn0ia/crm.lead.add.json`;
  private readonly activityAdd =
    `${this.apiUrl}/cfa8x0ca0m4euzxg/crm.activity.add.json`;
  private readonly dealUpdate =
    `${this.apiUrl}/18i0vg3zyg5kxi9v/crm.deal.update.json`;
  private readonly contactList =
    `${this.apiUrl}/fvpaq81k0yvk9eas/crm.contact.list.json`;
  private readonly contactAdd =
    `${this.apiUrl}/tnnabkmaf49qy5w8/crm.contact.add.json`;
  private readonly dealAdd =
    `${this.apiUrl}/wswyvle82l8ajlut/crm.deal.add.json`;
  private readonly dealList =
    `${this.apiUrl}/uu3tnphw928s8cxn/crm.deal.list.json`;

  async buscarLeadPorTelefono(telefono: string) {
    const { data } = await axios.post(this.contactList, {
      filter: { PHONE: telefono },
    });
    return data.result[0];
  }

  async crearContacto(nombre: string, telefono: string) {
    const { data } = await axios.post(this.contactAdd, {
      fields: {
        NAME: nombre,
        PHONE: [{ VALUE: telefono, VALUE_TYPE: 'WORK' }],
      },
    });
    return data.result;
  }

  async buscarNegociacionPorContacto(contactId: number) {
    const { data } = await axios.post(this.dealList, {
      filter: {
        CONTACT_ID: contactId,
        CATEGORY_ID: 6, // embudo Jelou
      },
      order: { ID: 'DESC' },
    });
    return data.result[0]; // la negociación más reciente
  }

  async crearLead(data: { nombre: string; telefono: string }) {
    const { data: res } = await axios.post(`${this.leadAdd}`, {
      fields: {
        TITLE: `Contacto desde Jelou`,
        NAME: data.nombre,
        PHONE: [{ VALUE: data.telefono, VALUE_TYPE: 'WORK' }],
        STATUS_ID: 'NEW',
      },
    });
    return res.result; // lead ID
  }
  async buscarContactoPorTelefono(telefono: string) {
    const { data } = await axios.post(this.contactList, {
      filter: { PHONE: telefono },
    });
    return data.result[0];
  }

  async registrarActividad(dealId: number, mensaje: string, tipo: string) {
    await axios.post(this.activityAdd, {
      fields: {
        TYPE_ID: 4,
        COMMUNICATIONS: [{ VALUE: dealId, ENTITY_TYPE: 'DEAL' }],
        SUBJECT: 'Mensaje desde WhatsApp (Jelou)',
        DESCRIPTION: tipo + mensaje,
        DESCRIPTION_TYPE: 1,
        OWNER_ID: dealId,
        OWNER_TYPE_ID: 2,
      },
    });
  }

  async crearNegociacionSiNoExiste(data: {
    nombre: string;
    telefono: string;
    mensaje: string;
  }) {
    // 1. Buscar contacto
    let contacto = await this.buscarContactoPorTelefono(data.telefono);
    let contactId = contacto?.ID;

    if (!contactId) {
      contactId = await this.crearContacto(data.nombre, data.telefono);
    }

    // 2. Buscar negociación existente
    const negociacionExistente =
      await this.buscarNegociacionPorContacto(contactId);

    let dealId: number;

    if (negociacionExistente) {
      dealId = negociacionExistente.ID;

      const actualizacion = await axios.post(this.dealUpdate, {
        id: dealId,
        fields: {
          CATEGORY_ID: 6,
          STAGE_ID: 'C6:NEW',
          // UF_CRM_1753983007521:''
        },
      });
    } else {
      // 3. Crear nueva negociación
      const { data: nuevaDeal } = await axios.post(this.dealAdd, {
        fields: {
          TITLE: `Contacto desde Jelou ${data.nombre}`,
          CONTACT_ID: contactId,
          CATEGORY_ID: '6',
          STAGE_ID: 'C6:NEW',
        },
      });
      dealId = nuevaDeal.result;
    }

    // 4. Registrar la actividad
    await this.registrarActividad(dealId, data.mensaje, 'cliente: ');

    return { ok: true, dealId };
  }
  //UF_CRM_1753983007521 campo de respuesta

  //responder negociacion

  async responderNegociacion(id: string) {
    const datos = await this.buscarNegociacionPorID(id);
    const mensaje = datos.mensaje;
    const contactoId = datos.contactoId;

    if (!mensaje || !contactoId) {
      console.log('Faltan datos de mensaje o contacto');
      return;
    }

    let telefono = await this.obtenerTelefonoPorContactoId(contactoId);
    //eliminar el +
    telefono = telefono.replace('+', '');
    console.log(`Mensaje: ${mensaje}`);
    console.log(`Teléfono: ${telefono}`);

    // Enviar a Jelou (aquí reemplaza por tu endpoint real)
  const sms = await  this.jelouService.sendText(telefono, mensaje);
    console.log(`Respuesta de Jelou: ${JSON.stringify(sms)}`);
    // Registrar actividad
    await axios.post(this.activityAdd, {
      fields: {
        TYPE_ID: 4,
        COMMUNICATIONS: [{ VALUE: id, ENTITY_TYPE: 'DEAL' }],
        SUBJECT: 'Mensaje desde Bitrix',
        DESCRIPTION: `Asesor respondió: ${mensaje}`,
        DESCRIPTION_TYPE: 1,
        OWNER_ID: id,
        OWNER_TYPE_ID: 2,
      },
    });

   

  }

  async buscarNegociacionPorID(id: string) {
    const { data } = await axios.post(this.dealList, {
      filter: { ID: id },
      select: ['ID', 'UF_CRM_1753983007521', 'CONTACT_ID'],
    });

    const negociacion = data.result?.[0];
    return {
      mensaje: negociacion?.UF_CRM_1753983007521?.[0] || '',
      contactoId: negociacion?.CONTACT_ID,
    };
  }

  async obtenerTelefonoPorContactoId(contactId: number) {
    console.log(`Obteniendo teléfono para contacto ID: ${contactId}`);
    const { data } = await axios.post(this.contactList, {
      filter: { ID: contactId },
      select: ['PHONE'], // para traer solo lo necesario
    });
    console.log(`Datos del contacto: ${JSON.stringify(data)}`);
   const phone = data?.result?.[0]?.PHONE?.[0]?.VALUE ?? '';
return phone; // "+12343233"
  }

}
