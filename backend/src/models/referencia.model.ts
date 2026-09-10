// ================================================================
// OFICINA TS — Módulo de Referenciadores
// Interfaces TypeScript para la tabla `referencias` (M2).
// Qué trajo cada referenciador: una inversión o un préstamo.
// Un solo referenciador por origen (P3, UNIQUE en la tabla).
// ================================================================

export type TipoReferido = 'inversion' | 'prestamo';

export type EstadoReferencia = 'activa' | 'terminada' | 'cancelada';

// ----------------------------------------------------------------
// Referencia — el vínculo referenciador ↔ inversión|préstamo
// ----------------------------------------------------------------
export interface Referencia {
  id: string;
  referenciador_id: string;
  tipo_referido: TipoReferido;
  inversion_id: string | null;
  prestamo_id: string | null;
  // Tasa mensual en PORCENTAJE con 2 decimales: 0.50 = 0.5%. String en pg.
  tasa: string;
  estado: EstadoReferencia;
  fecha_inicio: string;
  fecha_fin: string | null;
  notas: string | null;
  registrado_por: string | null;
  fecha_registro: string;
}

// Fila de referencia con el nombre de su origen (inversionista de la
// inversión o cliente del préstamo), para el detalle del referenciador (M23).
export interface ReferenciaConOrigen extends Referencia {
  origen_nombre: string;
  // Dueño de la inversión ligada, para navegar a su perfil (M24).
  // NULL en referencias de préstamo: ahí navega prestamo_id.
  origen_inversionista_id: string | null;
}

// ----------------------------------------------------------------
// DTOs para creación y edición
// ----------------------------------------------------------------
export interface CrearReferenciaDto {
  referenciador_id: string;
  tipo_referido: TipoReferido;
  inversion_id?: string;
  prestamo_id?: string;
  // Tasa como string para conservar precisión (el motor la opera con Decimal).
  tasa: string;
  notas?: string;
}

// La edición sólo toca estado, tasa, fecha_fin y notas (R9). Nunca el origen
// ni el referenciador: una referencia no se muda, se cambia de estado.
export interface EditarReferenciaDto {
  estado?: EstadoReferencia;
  tasa?: string;
  fecha_fin?: string;
  notas?: string;
}
