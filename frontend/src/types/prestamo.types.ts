// ================================================================
// OFICINA TS — Módulo de Préstamos
// Tipos e interfaces para el frontend
// ================================================================

export type EstatusPrestamo = 'activo' | 'atrasado' | 'en_juicio' | 'liquidado' | 'cancelado' | 'documentos_incompletos';

export type TipoPago = 'interes' | 'capital' | 'moratorio' | 'interes_anticipado';

export type FormaPago = 'efectivo' | 'deposito' | 'transferencia';

export type TipoGarantia = 'hipotecaria' | 'pagare' | 'otra';

export const ETIQUETAS_TIPO_GARANTIA: Record<TipoGarantia, string> = {
  hipotecaria: 'Garantía Hipotecaria',
  pagare:      'Pagaré',
  otra:        'Otra Garantía',
};

export const COLORES_TIPO_GARANTIA: Record<TipoGarantia, string> = {
  hipotecaria: 'bg-blue-100 text-blue-700',
  pagare:      'bg-green-100 text-green-700',
  otra:        'bg-slate-100 text-slate-600',
};

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

export const ETIQUETAS_DOCUMENTO_PRESTAMO: Record<TipoDocumentoPrestamo, string> = {
  constancia_no_adeudo: 'Constancia de no adeudo',
  predial:              'Predial',
  titulo_propiedad:     'Título de propiedad',
  escrituras:           'Escrituras',
  ine:                  'INE',
  comprobante_domicilio:'Comprobante de domicilio',
  curp:                 'CURP',
  constancia_fiscal:    'Constancia fiscal (R-2)',
  acta_nacimiento:      'Acta de nacimiento',
  acta_matrimonio:      'Acta de matrimonio',
  contrato:             'Contrato de préstamo',
};

export const TIPOS_DOCUMENTO_PRESTAMO: TipoDocumentoPrestamo[] = [
  'ine',
  'curp',
  'comprobante_domicilio',
  'constancia_fiscal',
  'acta_nacimiento',
  'acta_matrimonio',
  'titulo_propiedad',
  'escrituras',
  'predial',
  'constancia_no_adeudo',
  'contrato',
];

export const COLORES_ESTATUS_PRESTAMO: Record<EstatusPrestamo, string> = {
  activo:                 'bg-green-100  text-green-700',
  atrasado:               'bg-yellow-100 text-yellow-700',
  en_juicio:              'bg-red-100    text-red-700',
  liquidado:              'bg-slate-100  text-slate-600',
  cancelado:              'bg-neutral-900 text-white',
  documentos_incompletos: 'bg-orange-100 text-orange-700',
};

export const ETIQUETAS_ESTATUS_PRESTAMO: Record<EstatusPrestamo, string> = {
  activo:                 'Activo',
  atrasado:               'Atrasado',
  en_juicio:              'En juicio',
  liquidado:              'Liquidado',
  cancelado:              'Cancelado',
  documentos_incompletos: 'Docs. Incompletos',
};

// ----------------------------------------------------------------
// Préstamo resumido para la lista
// ----------------------------------------------------------------
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
  pagos_realizados: number;
  meses_sin_pago: number;
}

// ----------------------------------------------------------------
// Documentos
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
// Participantes del préstamo
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
// Expediente completo
// ----------------------------------------------------------------
export interface ExpedientePrestamo {
  id: string;
  folio: string | null;
  cliente_id: string;
  cliente_nombre: string;
  cliente_telefono: string | null;
  tipo_garantia: TipoGarantia | null;
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
  descripcion_garantia: string | null;
  aval_nombre: string | null;
  url_evidencia_garantia: string | null;
  estatus: EstatusPrestamo;
  renovado: boolean;
  prestamo_anterior_id: string | null;
  url_contrato_renovacion: string | null;
  notas: string | null;
  registrado_por: string | null;
  fecha_registro: string;
  fecha_actualizacion: string;
  participantes: ParticipantePrestamo[];
  documentos: DocumentoPrestamo[];
  pagos: PagoPrestamo[];
  moratorios: MoratorioPrestamo[];
}

// ----------------------------------------------------------------
// Paginación
// ----------------------------------------------------------------
export interface PaginacionPrestamos {
  prestamos: PrestamoResumen[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

// ----------------------------------------------------------------
// Filtros y ordenamiento
// ----------------------------------------------------------------
export type CampoOrden = 'cliente_nombre' | 'monto_prestado' | 'tasa_interes_mensual' | 'dia_pago' | 'progreso';
export type DireccionOrden = 'asc' | 'desc';

export interface FiltrosPrestamos {
  buscar: string;
  estatus: string;
  pagina: number;
  limite: number;
  ordenarPor: CampoOrden;
  direccion: DireccionOrden;
}

// ----------------------------------------------------------------
// Stats dashboard
// ----------------------------------------------------------------
export interface StatsPrestamos {
  capital_activo:     number;
  cantidad_creditos:  number;
  interes_ytd:        number;
  tasa_ponderada:     number;
  interes_proyectado: number;
  utilidad_oficina:   number;
  cartera_vencida:    number;
  por_estatus:        Record<string, number>;
}

// ----------------------------------------------------------------
// DTOs para formularios
// ----------------------------------------------------------------
export type TipoArchivoPrestamo =
  | 'avaluo'
  | 'gastos_notariales'
  | 'escritura'
  | 'contrato_firmado'
  | 'pagare_firmado'
  | 'documento_propiedad'
  | 'contrato_terminos';

export const ETIQUETAS_ARCHIVO_PRESTAMO: Record<TipoArchivoPrestamo, string> = {
  avaluo:              'Avalúo',
  gastos_notariales:   'Gastos Notariales',
  escritura:           'Escritura de la propiedad',
  contrato_firmado:    'Contrato Firmado',
  pagare_firmado:      'Pagaré Firmado',
  documento_propiedad: 'Documento de garantía',
  contrato_terminos:   'Contrato de Términos y Condiciones',
};

export interface ArchivoPrestamoMeta {
  id: string;
  prestamo_id: string;
  tipo: TipoArchivoPrestamo;
  nombre_original: string | null;
  tamano_bytes: number | null;
  fecha_registro: string;
}

export interface FormularioPrestamoData {
  cliente_id: string;
  tipo_garantia: TipoGarantia;
  monto_prestado: string;
  valor_propiedad: string;
  tasa_interes_mensual: string;
  tasa_moratoria_mensual: string;
  plazo_meses: string;
  fecha_inicio: string;
  apertura: string;
  avaluo: string;
  gastos_notariales: string;
  notaria: string;
  aval_nombre: string;
  descripcion_garantia: string;
  notas: string;
}

export interface FormularioPagoData {
  tipo_pago: TipoPago | '';
  monto: string;
  forma_pago: FormaPago | '';
  periodo_mes: string;
  periodo_anio: string;
  notas: string;
}
