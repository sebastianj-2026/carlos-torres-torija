// ================================================================
// OFICINA TS — Tipos del módulo de Clientes
// ================================================================

export type EstatusCliente = 'activo' | 'atrasado' | 'negociado' | 'en_juicio' | 'inactivo';

export type TipoDocumento =
  | 'ine'
  | 'ine_frente'
  | 'ine_reverso'
  | 'escritura'
  | 'r20'
  | 'recibo_luz'
  | 'constancia_no_adeudo'
  | 'predial'
  | 'curp'
  | 'rfc';

export type RelacionReferencia = 'familiar' | 'amigo' | 'trabajo' | 'otro';

// Etiquetas legibles para documentos
export const ETIQUETAS_DOCUMENTO: Record<TipoDocumento, string> = {
  ine: 'INE / Identificación oficial',
  ine_frente: 'INE — Frente',
  ine_reverso: 'INE — Reverso',
  escritura: 'Escritura de la propiedad',
  r20: 'R20',
  recibo_luz: 'Recibo de luz',
  constancia_no_adeudo: 'Constancia de no adeudo',
  predial: 'Predial',
  curp: 'CURP',
  rfc: 'RFC',
};

// Etiquetas legibles para relaciones
export const ETIQUETAS_RELACION: Record<RelacionReferencia, string> = {
  familiar: 'Familiar',
  amigo: 'Amigo',
  trabajo: 'Compañero de trabajo',
  otro: 'Otro',
};

// Colores para los badges de estatus
export const COLORES_ESTATUS: Record<EstatusCliente, string> = {
  activo: 'bg-green-100 text-green-700',
  atrasado: 'bg-yellow-100 text-yellow-700',
  negociado: 'bg-blue-100 text-blue-700',
  en_juicio: 'bg-red-100 text-red-700',
  inactivo: 'bg-slate-100 text-slate-500',
};

// Etiquetas legibles para estatus
export const ETIQUETAS_ESTATUS: Record<EstatusCliente, string> = {
  activo: 'Activo',
  atrasado: 'Atrasado',
  negociado: 'Negociado',
  en_juicio: 'En juicio',
  inactivo: 'Inactivo',
};

// ----------------------------------------------------------------
// Interfaces de datos
// ----------------------------------------------------------------
export interface Cliente {
  id: string;

  // Datos personales
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  fecha_nacimiento: string | null;
  rfc: string | null;
  curp: string | null;
  telefono_celular: string | null;
  telefono_adicional: string | null;
  correo: string | null;

  // Domicilio
  calle: string | null;
  numero_exterior: string | null;
  numero_interior: string | null;
  colonia: string | null;
  municipio: string | null;
  estado: string | null;
  codigo_postal: string | null;

  // Trabajo
  ocupacion: string | null;
  nombre_trabajo: string | null;
  telefono_trabajo: string | null;

  // Estatus
  estatus: EstatusCliente;
  ubicacion_expediente: string | null;

  // Control
  registrado_por: string | null;
  fecha_registro: string;
  fecha_actualizacion: string;
}

export interface ClienteResumen {
  id: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  rfc: string | null;
  telefono_celular: string | null;
  estatus: EstatusCliente;
  fecha_registro: string;
  deuda_total: number;
  interes_mensual: number;
  meses_sin_pago: number;
  num_prestamos: number;
}

export interface DocumentoCliente {
  id: string;
  cliente_id: string;
  tipo: TipoDocumento;
  entregado: boolean;
  digitalizado: boolean;
  url_archivo: string | null;
  registrado_por: string | null;
  fecha_registro: string;
}

export interface ReferenciaCliente {
  id: string;
  cliente_id: string;
  nombre_completo: string;
  telefono: string | null;
  relacion: RelacionReferencia | null;
  registrado_por: string | null;
  fecha_registro: string;
}

export interface ExpedienteCompleto extends Cliente {
  documentos: DocumentoCliente[];
  referencias: ReferenciaCliente[];
}

export interface PaginacionClientes {
  clientes: ClienteResumen[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

// ----------------------------------------------------------------
// DTOs para formularios
// ----------------------------------------------------------------
export interface FormularioClienteData {
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  fecha_nacimiento: string;
  rfc: string;
  curp: string;
  telefono_celular: string;
  telefono_adicional: string;
  correo: string;
  calle: string;
  numero_exterior: string;
  numero_interior: string;
  colonia: string;
  municipio: string;
  estado: string;
  codigo_postal: string;
  ocupacion: string;
  nombre_trabajo: string;
  telefono_trabajo: string;
  ubicacion_expediente: string;
}

export interface ActualizarDocumentoDto {
  tipo: TipoDocumento;
  entregado: boolean;
  digitalizado: boolean;
  url_archivo?: string;
}

export interface CrearReferenciaDto {
  nombre_completo: string;
  telefono: string;
  relacion: RelacionReferencia | '';
}

export interface FiltrosClientes {
  buscar: string;
  estatus: EstatusCliente | '';
  pagina: number;
  limite: number;
}

export interface StatsClientes {
  total: number;
  con_prestamo_vigente: number;
  inactivos: number;
  en_juicio: number;
  negociados: number;
}
