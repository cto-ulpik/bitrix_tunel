import { ApiProperty } from '@nestjs/swagger';

// Primero declaramos HotmartEventData
export class HotmartEventData {
  // Información del producto
  product?: {
    id?: number;
    name?: string;
    ucode?: string;
  };

  // Información del comprador
  buyer?: {
    name?: string;
    email?: string;
    checkout_phone?: string;
    phone?: string;
    address?: {
      country?: string;
      state?: string;
      city?: string;
      neighborhood?: string;
      street?: string;
      number?: string;
      zip_code?: string;
    };
  };

  // Información del productor
  producer?: {
    name?: string;
    ucode?: string;
  };

  // Información de la compra/comisión
  purchase?: {
    order_date?: number;
    price?: {
      value?: number;
      currency_code?: string;
    };
    payment?: {
      method?: string;
      type?: string;
    };
    status?: string;
    transaction?: string;
    recurrency_number?: number;
  };

  // Información de suscripción
  subscription?: {
    status?: string;
    subscriber?: {
      name?: string;
      email?: string;
      phone?: string;
    };
    plan?: {
      name?: string;
    };
    recurrency_number?: number;
  };

  // Información del afiliado
  commissions?: Array<{
    name?: string;
    email?: string;
    value?: number;
  }>;
}

// Luego declaramos HotmartWebhookDto que usa HotmartEventData
export class HotmartWebhookDto {
  @ApiProperty({ description: 'ID del evento' })
  id?: string;

  @ApiProperty({ description: 'Tipo de evento' })
  event?: string;

  @ApiProperty({ description: 'Versión del webhook' })
  version?: string;

  @ApiProperty({ description: 'Fecha de creación' })
  creation_date?: number;

  @ApiProperty({ 
    description: 'Token de seguridad de Hotmart',
    required: false,
    example: 'ktCAmqR5vpcqxdtWKSqhLA9EQON1NRc4662751-fa3b-493b-8204-13f8721091dc'
  })
  hottok?: string;

  @ApiProperty({ description: 'Datos del evento' })
  data?: HotmartEventData;
}

