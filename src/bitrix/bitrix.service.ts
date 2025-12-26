import { forwardRef, Inject, Injectable } from '@nestjs/common';
import axios from 'axios';
import { JelouService } from 'src/jelou/jelou.service';

@Injectable()
export class BitrixService {
  constructor(
    //me da que es una dependencia circular agregar forwordRef
    @Inject(forwardRef(() => JelouService))
    private readonly jelouService: JelouService,
  ) {}
  // SOLO ULPIK.BITRIX24.ES
  private readonly apiUrl = 'https://ulpik.bitrix24.es/rest/82772';
  private readonly webhookToken = 'kwsuzlaj934sqy9a'; // Token con permisos completos

  // Endpoints de CRM
  private readonly leadAdd = `${this.apiUrl}/${this.webhookToken}/crm.lead.add.json`;
  private readonly activityAdd = `${this.apiUrl}/${this.webhookToken}/crm.activity.add.json`;
  private readonly dealUpdate = `${this.apiUrl}/${this.webhookToken}/crm.deal.update.json`;
  private readonly contactList = `${this.apiUrl}/${this.webhookToken}/crm.contact.list.json`;
  private readonly contactAdd = `${this.apiUrl}/${this.webhookToken}/crm.contact.add.json`;
  private readonly dealAdd = `${this.apiUrl}/${this.webhookToken}/crm.deal.add.json`;
  private readonly dealList = `${this.apiUrl}/${this.webhookToken}/crm.deal.list.json`;

  // Endpoints de tareas
  private readonly taskAdd = `${this.apiUrl}/${this.webhookToken}/tasks.task.add.json`;
  private readonly taskList = `${this.apiUrl}/${this.webhookToken}/tasks.task.list.json`;
  private readonly taskGet = `${this.apiUrl}/${this.webhookToken}/tasks.task.get.json`;

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

  async buscarNegociacionPorContacto(
    contactId: number,
    pipeline: string = '10', // ej: 'C44', 'C12'
  ) {
    const { data } = await axios.post(this.dealList, {
      filter: {
        CONTACT_ID: contactId,
      },
      order: { ID: 'DESC' }, // más reciente primero
    });

    const deals = data.result || [];

    console.log(
      `Negociaciones encontradas para contacto ${contactId}: ${deals.length}`,
    );

    // ✅ FILTRAR por pipeline usando STAGE_ID
    const dealDelPipeline = deals.find((deal: any) =>
      deal.STAGE_ID?.startsWith(`${pipeline}:`),
    );

    console.log(
      `Negociación encontrada para pipeline ${pipeline}:`,
      dealDelPipeline ? dealDelPipeline.ID : 'NINGUNA',
    );

    return dealDelPipeline || null;
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
  async buscarContactoPorTelefonoOEmail(campo: string) {
    try {
      // 1) Buscar por teléfono
      const phoneResponse = await axios.post(this.contactList, {
        filter: { PHONE: campo },
      });
  
      if (phoneResponse?.data?.result?.length > 0) {
        return phoneResponse.data.result[0];
      }
  
      // 2) Buscar por email
      const emailResponse = await axios.post(this.contactList, {
        filter: { EMAIL: campo },
      });
  
      return emailResponse?.data?.result?.[0] ?? null;
    } catch (error) {
      console.error("❌ Error buscando contacto:", error?.response?.data || error);
      return null;
    }
  }

  /**
   * Busca un contacto SOLO por email (más confiable para cancelaciones)
   */
  async buscarContactoPorEmail(email: string) {
    try {
      if (!email) {
        return null;
      }

      const { data } = await axios.post(this.contactList, {
        filter: {
          EMAIL: email,
        },
        select: ['ID', 'NAME', 'EMAIL', 'PHONE'],
      });

      if (data.result && data.result.length > 0) {
        console.log(
          `✅ Contacto encontrado por email "${email}": ID ${data.result[0].ID}`,
        );
        return data.result[0];
      }

      console.log(`No se encontró contacto con email "${email}"`);
      return null;
    } catch (error) {
      console.error(`Error buscando contacto por email: ${error.message}`);
      return null;
    }
  }

  /**
   * Busca un contacto por nombre Y email (ambos deben coincidir)
   */
  private normalizarEmail(email: string) {
    return (email || '').trim().toLowerCase();
  }

  private normalizarTelefono(tel: string) {
    // deja solo dígitos (ej: +593 99-999-9999 => 593999999999)
    return (tel || '').replace(/\D/g, '');
  }

  async buscarContactoPorEmailOTelefono(email?: string, telefono?: string) {
    try {
      const emailN = this.normalizarEmail(email || '');
      const telN = this.normalizarTelefono(telefono || '');

      if (!emailN && !telN) return null;

      const select = ['ID', 'NAME', 'EMAIL', 'PHONE'];

      // 1) Buscar por EMAIL (si viene)
      if (emailN) {
        const { data } = await axios.post(this.contactList, {
          filter: { EMAIL: emailN },
          select,
        });

        const result = data?.result || [];
        if (result.length) {
          // elegir match exacto por email si existe
          const exacto = result.find((c: any) =>
            (c.EMAIL || []).some(
              (e: any) => this.normalizarEmail(e?.VALUE) === emailN,
            ),
          );
          return exacto || result[0];
        }
      }

      // 2) Buscar por TELÉFONO (si viene)
      if (telN) {
        const { data } = await axios.post(this.contactList, {
          // Bitrix suele matchear por VALUE, pero con filter PHONE funciona en muchos casos
          filter: { PHONE: telN },
          select,
        });

        const result = data?.result || [];
        if (result.length) {
          // elegir match exacto por teléfono si existe
          const exacto = result.find((c: any) =>
            (c.PHONE || []).some(
              (p: any) => this.normalizarTelefono(p?.VALUE) === telN,
            ),
          );
          return exacto || result[0];
        }
      }

      return null;
    } catch (error: any) {
      const msg = error?.response?.data
        ? JSON.stringify(error.response.data)
        : error?.message;

      console.error('Error buscando contacto por email/teléfono:', msg);
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
    let contacto = await this.buscarContactoPorTelefonoOEmail(data.telefono);
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
    const sms = await this.jelouService.sendText(telefono, mensaje);
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
        throw new Error(
          `Error de Bitrix: ${data.error_description || data.error}`,
        );
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

  /**
   * Crea un deal específico para Hotmart en el embudo correcto
   */
  async crearDealHotmart(
    contactId: number | null,
    nombre: string,
    producto: string,
    precio: number,
    moneda: string,
  ): Promise<number> {
    try {
      const fields: any = {
        TITLE: `Hotmart: ${producto} - ${nombre}`,
        OPPORTUNITY: precio,
        CURRENCY_ID: moneda,
        // Embudo y etapa específicos de Hotmart (compras)
        CATEGORY_ID: '44',
        STAGE_ID: 'C44:UC_QHQCN9',
      };

      // Solo agregar contacto si existe
      if (contactId) {
        fields.CONTACT_ID = contactId;
        console.log(`Creando deal con contacto vinculado: ${contactId}`);
      } else {
        console.log('Creando deal SIN contacto vinculado (campo vacío)');
      }

      const { data } = await axios.post(this.dealAdd, { fields });

      if (data.error) {
        console.error('Error de Bitrix al crear deal:', data.error);
        throw new Error(
          `Error de Bitrix: ${data.error_description || data.error}`,
        );
      }

      console.log(
        `✅ Deal creado: ID ${data.result}, Embudo: 44, Etapa: C44:UC_QHQCN9`,
      );
      return data.result;
    } catch (error) {
      console.error('Error creando deal Hotmart:', error.message);
      throw error;
    }
  }

  /**
   * Crea un deal para CANCELACIÓN de suscripción en Hotmart
   * Etapa: C44:UC_Z9UPZW (etapa de cancelaciones)
   */
  async crearDealCancelacion(
    contactId: number | null,
    nombre: string,
    producto: string,
    telefono: string,
    email: string,
  ): Promise<number> {
    try {
      const fields: any = {
        TITLE: `Hotmart - Cancelación: ${producto} - ${nombre}`,
        // Embudo 44, etapa de CANCELACIÓN
        CATEGORY_ID: '44',
        STAGE_ID: 'C44:UC_Z9UPZW', // Etapa específica de cancelaciones
      };

      // Solo agregar contacto si existe
      if (contactId) {
        fields.CONTACT_ID = contactId;
        console.log(
          `Creando deal de cancelación con contacto vinculado: ${contactId}`,
        );
      } else {
        console.log(
          'Creando deal de cancelación SIN contacto vinculado (campo vacío)',
        );
        // Agregar datos en el título si no hay contacto
        fields.TITLE += ` | Tel: ${telefono} | Email: ${email}`;
      }

      const { data } = await axios.post(this.dealAdd, { fields });

      if (data.error) {
        console.error(
          'Error de Bitrix al crear deal de cancelación:',
          data.error,
        );
        throw new Error(
          `Error de Bitrix: ${data.error_description || data.error}`,
        );
      }

      console.log(
        `✅ Deal de cancelación creado: ID ${data.result}, Embudo: 44, Etapa: C44:UC_Z9UPZW`,
      );
      return data.result;
    } catch (error) {
      console.error('Error creando deal de cancelación:', error.message);
      throw error;
    }
  }



  // Método para actualizar etapa + campos Hotmart en un deal
async actualizarEtapaNegociacion(
  dealId: number,
  stageId: string,
  data?: {
    producto?: string;
    transaccion?: string;
    estadoCompra?: string; // aquí irá "APROBADA"
    tipoPago?: string;
    cuotas?: number;
    precioOriginal?: number;
    cupon?: string;
    plan?: string;
    amount?: number; // monto final
  },
): Promise<any> {
  try {
    const fields: any = {
      STAGE_ID: stageId,

      // 🔹 ESTADO COMPRA (forzado a APROBADA si no viene)
      UF_CRM_1765826428263: data?.estadoCompra || 'APROBADA',
    };

    // 🔹 Campos Hotmart (solo si vienen)
    if (data?.producto) {
      fields.UF_CRM_1765826177781 = data.producto;
    }

    if (data?.transaccion) {
      fields.UF_CRM_1765826398784 = data.transaccion;
    }

    if (data?.tipoPago) {
      fields.UF_CRM_1765826500370 = data.tipoPago;
    }

    if (data?.cuotas !== undefined) {
      fields.UF_CRM_1765826527201 = data.cuotas;
    }

    if (data?.precioOriginal !== undefined) {
      fields.UF_CRM_1765826544532 = data.precioOriginal;
    }

    if (data?.cupon) {
      fields.UF_CRM_1765826557847 = data.cupon;
    }

    if (data?.plan) {
      fields.UF_CRM_1765826623412 = data.plan;
    }

    // 🔹 Monto final del deal
    if (data?.amount !== undefined) {
      fields.OPPORTUNITY = data.amount;
    }

    console.log(
      `Actualizando deal ${dealId} con fields:`,
      JSON.stringify(fields, null, 2),
    );

    const { data: res } = await axios.post(this.dealUpdate, {
      id: dealId,
      fields,
    });

    if (res.error) {
      console.error('Error de Bitrix al actualizar deal:', res.error);
      throw new Error(
        `Error de Bitrix: ${res.error_description || res.error}`,
      );
    }

    console.log(
      `✅ Deal actualizado: ID ${dealId}, Etapa: ${stageId}, Estado: APROBADA`,
    );

    return res.result;
  } catch (error) {
    console.error('Error actualizando deal:', error.message);
    throw error;
  }
}

async crearDealPackMarcas(params: {
  contactId: number;
  nombre: string;
  producto: string;
}): Promise<number> {
  const { contactId, nombre, producto } = params;

  const fields = {
    TITLE: `Pack Marcas: ${producto} - ${nombre}`,
    CONTACT_ID: contactId,
    CATEGORY_ID: '3',     // 👈 MARCAS
    STAGE_ID: 'C3:NEW',   // 👈 etapa inicial (ajusta si usas otra)
  };

  const { data } = await axios.post(this.dealAdd, { fields });

  if (data.error) {
    throw new Error(data.error_description || data.error);
  }

  return data.result;
}


}
