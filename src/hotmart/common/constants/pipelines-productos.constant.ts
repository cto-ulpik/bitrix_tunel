/* import { Pipelines } from "../enum/pepenlines.enum";


export const PRODUCTO_A_PIPELINE: Record<string, Pipelines> = {
  // LEGAL
  '123456': Pipelines.LEGAL,
  '123457': Pipelines.LEGAL,

  // EDUCACION_WEBINAR
  '223456': Pipelines.EDUCACION_WEBINAR,

  // COMUNIDAD
  '323456': Pipelines.COMUNIDAD,

  // EDUCACION_VENTA_DIRECTA
  '423456': Pipelines.EDUCACION_VENTA_DIRECTA,
};



export const STAGE_POR_PIPELINE: Record<Pipelines, string> = {
  [Pipelines.LEGAL]: 'C12:NEW',
  [Pipelines.EDUCACION_WEBINAR]: 'C13:NEW',
  [Pipelines.COMUNIDAD]: 'C14:NEW',
  [Pipelines.EDUCACION_VENTA_DIRECTA]: 'C15:NEW',
};

  private getPipelineByProductId(
    productId: number | string | undefined,
  ): Pipelines | null {
    if (productId === undefined || productId === null) return null;
    return this.PRODUCTO_A_PIPELINE[String(productId)] ?? null;
  }

// 🔥 Función para escoger la etapa (la que me pediste)
private getStageIdByPipeline(pipeline: Pipelines | null): string | null {
  if (!pipeline) return null;
  return STAGE_POR_PIPELINE[pipeline] ?? null;
} */