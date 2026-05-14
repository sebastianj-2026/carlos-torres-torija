// ================================================================
// OFICINA TS — Módulo de Préstamos
// Interfaces TypeScript para las tablas de la base de datos
// ================================================================

export type EstatusPrestamo = 'activo' | 'atrasado' | 'en_juicio' | 'liquidado' | 'cancelado' | 'documentos_incompletos';

export type TipoPago = 'interes' | 'capital' | 'moratorio' | 'interes_anticipado';

export type FormaPago = 'efectivo' | 'deposito' | 'transferencia';

export type TipoGarantia = 'hipotecaria' | 'pagare' | 'otra';

export type TipoDocumentoPrestamo =
  | 'constancia_no_adeudo'
  | 'predial'
  | 'titulo_propiedad'
  | 'escrituras'
  | 'ine'
  | 'comprobante_domicilio'
  | 'curp'
  | 'constancia_fiscal'
  | 'acta_nacimiento'
  | 'acta_matrimonio'
  | 'contrato';

// ----------------------------------------------------------------
// Préstamo
// ----------------------------------------------------------------
export interface Prestamo {
  id: string;
  cliente_id: string;
  folio: string | null;
  tipo_garantia: TipoGarantia;
  monto_prestado: string;
  saldo_pendiente: string;
  valor_propiedad: string | null;
  tasa_interes_mensual: string;
  tasa_moratoria_mensual: string;
  comision_gestion_pct: string;
  plazo_meses: number;
  interes_anticipado: string | null;
  cantidad_entregada: string | null;
  apertura: string;
  avaluo: string;
  gastos_notariales: string;
  fecha_inicio: string;
  fecha_vencimiento: string;
  notaria: string | null;
  url_contrato: string | null;
  aval_nombre: string | null;
  descripcion_garantia: string | null;
  url_evidencia_garantia: string | null;
  estatus: EstatusPrestamo;
  renovado: boolean;
  prestamo_anterior_id: string | null;
  url_contrato_renovacion: string | null;
  notas: string | null;
  registrado_por: string | null;
  fecha_registro: string;
  fecha_actualizacion: string;
}

export type TipoArchivoPrestamo =
  | 'avaluo'
  | 'gastos_notariales'
  | 'escritura'
  | 'contrato_firmado'
  | 'pagare_firmado'
  | 'documento_propiedad'
  | 'contrato_terminos';

export interface ArchivoPrestamoMeta {
  id: string;
  prestamo_id: string;
  tipo: TipoArchivoPrestamo;
  nombre_original: string | null;
  tamano_bytes: number | null;
  fecha_registro: string;
}

export interface PrestamoResumen {
  id: string;
  folio: string | null;
  cliente_id: string;
  cliente_nombre: string;
  monto_prestado: string;
  saldo_pendiente: string;
  tasa_interes_mensual: string;
  interes_mensual: string;
  dia_pago: number;
  fecha_inicio: string;
  fecha_vencimiento: string;
  plazo_meses: number;
  estatus: EstatusPrestamo;
}

// ----------------------------------------------------------------
// Participantes del préstamo (inversionistas + Oficina TS)
// ----------------------------------------------------------------
export interface ParticipantePrestamo {
  id: string;
  prestamo_id: string;
  inversionista_id: string | null;
  es_oficina: boolean;
  monto_aportado: string;
  tasa_rendimiento: string;
  interes_mensual: string | null;
  inversionista_nombre: string | null;
  registrado_por: string | null;
  fecha_registro: string;
}

// ----------------------------------------------------------------
// Documentos del préstamo
// ----------------------------------------------------------------
export interface DocumentoPrestamo {
  id: string;
  prestamo_id: string;
  tipo: TipoDocumentoPrestamo;
  entregado: boolean;
  digitalizado: boolean;
  url_archivo: string | null;
  registrado_por: string | null;
  fecha_registro: string;
}

// ----------------------------------------------------------------
// Historial de pagos
// ----------------------------------------------------------------
export interface PagoPrestamo {
  id: string;
  prestamo_id: string;
  tipo_pago: TipoPago;
  monto: string;
  moratorio_perdonado: string;
  forma_pago: FormaPago | null;
  periodo_mes: number | null;
  periodo_anio: number | null;
  notas: string | null;
  url_evidencia: string | null;
  registrado_por: string | null;
  perdonado_por: string | null;
  fecha_pago: string;
}

// ----------------------------------------------------------------
// Moratorios
// ----------------------------------------------------------------
export interface MoratorioPrestamo {
  id: string;
  prestamo_id: string;
  monto_calculado: string;
  monto_perdonado: string;
  monto_cobrado: string;
  mes_atraso: number | null;
  anio_atraso: number | null;
  perdonado: boolean;
  perdonado_por: string | null;
  fecha_perdon: string | null;
  fecha_calculo: string;
}

// ----------------------------------------------------------------
// Expediente completo del préstamo
// ----------------------------------------------------------------
export interface ExpedientePrestamo extends Prestamo {
  cliente_nombre: string;
  cliente_telefono: string | null;
  participantes: ParticipantePrestamo[];
  documentos: DocumentoPrestamo[];
  pagos: PagoPrestamo[];
  moratorios: MoratorioPrestamo[];
}

// ----------------------------------------------------------------
// DTOs
// ----------------------------------------------------------------
export interface ParticipanteDto {
  inversionista_id?: string | null;
  es_oficina: boolean;
  monto_aportado: number;
  tasa_rendimiento: number;
}

export interface CrearPrestamoDto {
  cliente_id: string;
  tipo_garantia?: TipoGarantia;
  monto_prestado: number;
  valor_propiedad?: number;
  tasa_interes_mensual: number;
  tasa_moratoria_mensual?: number;
  plazo_meses: number;
  fecha_inicio: string;
  apertura?: number;
  avaluo?: number;
  gastos_notariales?: number;
  notaria?: string;
  url_contrato?: string;
  aval_nombre?: string;
  descripcion_garantia?: string;
  url_evidencia_garantia?: string;
  notas?: string;
  participantes?: ParticipanteDto[];
  comision_gestion_pct?: number;
}

export interface EditarPrestamoDto {
  tipo_garantia?: TipoGarantia;
  valor_propiedad?: number | null;
  tasa_interes_mensual?: number;
  tasa_moratoria_mensual?: number;
  fecha_inicio?: string;
  plazo_meses?: number;
  apertura?: number;
  avaluo?: number;
  gastos_notariales?: number;
  notaria?: string | null;
  url_contrato?: string | null;
  aval_nombre?: string | null;
  descripcion_garantia?: string | null;
  url_evidencia_garantia?: string | null;
  notas?: string | null;
  participantes?: ParticipanteDto[];
}

export interface RegistrarPagoDto {
  tipo_pago: TipoPago;
  monto: number;
  forma_pago?: FormaPago;
  periodo_mes?: number;
  periodo_anio?: number;
  notas?: string;
  url_evidencia?: string;
}

export interface ActualizarDocumentosDto {
  documentos: Array<{
    tipo: TipoDocumentoPrestamo;
    entregado?: boolean;
    digitalizado?: boolean;
    url_archivo?: string;
  }>;
}

export interface RenovarPrestamoDto {
  monto_prestado: number;
  tasa_interes_mensual: number;
  tasa_moratoria_mensual?: number;
  plazo_meses: number;
  fecha_inicio: string;
  notaria?: string;
  url_contrato?: string;
  notas?: string;
}

export interface PaginacionPrestamos {
  prestamos: PrestamoResumen[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}
