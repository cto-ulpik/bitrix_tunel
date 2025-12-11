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
  
  // Endpoints de tareas (ulpik.bitrix24.es)
  private readonly bitrixTaskUrl = 'https://ulpik.bitrix24.es/rest/82772';
  private readonly taskAdd =
    `${this.bitrixTaskUrl}/kwsuzlaj934sqy9a/tasks.task.add.json`;
  private readonly taskList =
    `${this.bitrixTaskUrl}/kwsuzlaj934sqy9a/tasks.task.list.json`;
  private readonly taskGet =
    `${this.bitrixTaskUrl}/kwsuzlaj934sqy9a/tasks.task.get.json`;

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

  /**
   * Busca un contacto por nombre Y email (ambos deben coincidir)
   */
  async buscarContactoPorNombreYEmail(nombre: string, email: string) {
    try {
      if (!nombre || !email) {
        return null;
      }

      const { data } = await axios.post(this.contactList, {
        filter: { 
          NAME: nombre,
          EMAIL: email,
        },
        select: ['ID', 'NAME', 'EMAIL', 'PHONE'],
      });

      // Verificar que ambos coincidan exactamente
      if (data.result && data.result.length > 0) {
        const contacto = data.result[0];
        const nombreCoincide = contacto.NAME?.toLowerCase().trim() === nombre.toLowerCase().trim();
        const emailCoincide = contacto.EMAIL?.[0]?.VALUE?.toLowerCase().trim() === email.toLowerCase().trim();
        
        if (nombreCoincide && emailCoincide) {
          console.log(`Contacto encontrado: ID ${contacto.ID}, Nombre: ${contacto.NAME}, Email: ${email}`);
          return contacto;
        }
      }
      
      console.log(`No se encontró contacto con nombre "${nombre}" y email "${email}"`);
      return null;
    } catch (error) {
      console.error('Error buscando contacto por nombre y email:', error.message);
      return null;
    }
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

  /**
   * Crea una tarea en Bitrix24
   * @param taskData - Datos de la tarea
   * @returns ID de la tarea creada
   */
  async crearTarea(taskData: {
    title: string;
    description?: string;
    responsibleId?: number; // ID del usuario responsable
    deadline?: string; // Formato: YYYY-MM-DD o YYYY-MM-DD HH:mm:ss
    priority?: number; // 1=Baja, 2=Normal (default), 3=Alta
    dealId?: number; // ID de la negociación relacionada
    contactId?: number; // ID del contacto relacionado
    stageId?: string; // ID de la etapa (para tareas del CRM)
    categoryId?: number; // ID del embudo
  }) {
    try {
      const fields: any = {
        TITLE: taskData.title,
        RESPONSIBLE_ID: taskData.responsibleId || 138, // ID por defecto (puedes cambiarlo)
      };

      if (taskData.description) {
        fields.DESCRIPTION = taskData.description;
      }

      if (taskData.deadline) {
        fields.DEADLINE = taskData.deadline;
      }

      if (taskData.priority) {
        fields.PRIORITY = taskData.priority;
      }

      // Vincular con negociación (Deal)
      if (taskData.dealId) {
        fields.UF_CRM_TASK = [`D_${taskData.dealId}`];
      }

      // Vincular con contacto
      if (taskData.contactId) {
        if (!fields.UF_CRM_TASK) {
          fields.UF_CRM_TASK = [];
        }
        fields.UF_CRM_TASK.push(`C_${taskData.contactId}`);
      }

      console.log('Creando tarea con campos:', JSON.stringify(fields, null, 2));

      const { data } = await axios.post(this.taskAdd, {
        fields,
      });

      if (data.error) {
        console.error('Error de Bitrix al crear tarea:', data.error);
        throw new Error(`Error de Bitrix: ${data.error_description || data.error}`);
      }

      console.log('Tarea creada exitosamente. ID:', data.result.task.id);
      return data.result.task.id;
    } catch (error) {
      console.error('Error creando tarea:', error.message);
      throw error;
    }
  }

  /**
   * Crea una tarea vinculada a una negociación específica
   */
  async crearTareaParaNegociacion(
    dealId: number,
    title: string,
    description?: string,
    deadline?: string,
  ) {
    return this.crearTarea({
      title,
      description,
      dealId,
      deadline,
      priority: 2, // Normal
    });
  }

  /**
   * Obtiene información de una tarea
   */
  async obtenerTarea(taskId: number) {
    try {
      const { data } = await axios.post(this.taskGet, {
        taskId,
        select: ['*', 'UF_*'],
      });

      return data.result.task;
    } catch (error) {
      console.error('Error obteniendo tarea:', error.message);
      throw error;
    }
  }

  /**
   * Lista tareas con filtros
   */
  async listarTareas(filtros?: {
    responsibleId?: number;
    dealId?: number;
    status?: number; // 2=En progreso, 3=Esperando control, 4=Completada, 5=Diferida
  }) {
    try {
      const filter: any = {};

      if (filtros?.responsibleId) {
        filter.RESPONSIBLE_ID = filtros.responsibleId;
      }

      if (filtros?.dealId) {
        filter.UF_CRM_TASK = `D_${filtros.dealId}`;
      }

      if (filtros?.status) {
        filter.STATUS = filtros.status;
      }

      const { data } = await axios.post(this.taskList, {
        filter,
        select: ['*', 'UF_*'],
        order: { ID: 'DESC' },
      });

      return data.result.tasks;
    } catch (error) {
      console.error('Error listando tareas:', error.message);
      throw error;
    }
  }

}
