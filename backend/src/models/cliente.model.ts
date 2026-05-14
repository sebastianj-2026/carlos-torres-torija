// ================================================================
// OFICINA TS — Módulo de Clientes
// Interfaces TypeScript para las tablas de la base de datos
// ================================================================

export type EstatusCliente = 'activo' | 'atrasado' | 'negociado' | 'en_juicio' | 'inactivo';

export type TipoDocumento =
  | 'ine'
  | 'escritura'
  | 'r20'
  | 'recibo_luz'
  | 'constancia_no_adeudo'
  | 'predial'
  | 'curp'
  | 'rfc';

export type RelacionReferencia = 'familiar' | 'amigo' | 'trabajo' | 'otro';

// ----------------------------------------------------------------
// Modelo completo de un cliente (expediente)
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

// ----------------------------------------------------------------
// Resumen del cliente para la tabla de lista
// ----------------------------------------------------------------
export interface ClienteResumen {
  id: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  rfc: string | null;
  telefono_celular: string | null;
  estatus: EstatusCliente;
  fecha_registro: string;
}

// ----------------------------------------------------------------
// Documento de garantía / checklist
// ----------------------------------------------------------------
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

// ----------------------------------------------------------------
// Referencia personal
// ----------------------------------------------------------------
export interface ReferenciaCliente {
  id: string;
  cliente_id: string;
  nombre_completo: string;
  telefono: string | null;
  relacion: RelacionReferencia | null;
  registrado_por: string | null;
  fecha_registro: string;
}

// ----------------------------------------------------------------
// DTOs para creación / edición
// ----------------------------------------------------------------
export interface CrearClienteDto {
  nombres: string;
  apellido_paterno: string;
  apellido_materno?: string;
  fecha_nacimiento?: string;
  rfc?: string;
  curp?: string;
  telefono_celular?: string;
  telefono_adicional?: string;
  correo?: string;
  calle?: string;
  numero_exterior?: string;
  numero_interior?: string;
  colonia?: string;
  municipio?: string;
  estado?: string;
  codigo_postal?: string;
  ocupacion?: string;
  nombre_trabajo?: string;
  telefono_trabajo?: string;
  ubicacion_expediente?: string;
}

export type EditarClienteDto = Partial<CrearClienteDto>;

export interface ActualizarDocumentoDto {
  tipo: TipoDocumento;
  entregado: boolean;
  digitalizado: boolean;
  url_archivo?: string;
}

export interface CrearReferenciaDto {
  nombre_completo: string;
  telefono?: string;
  relacion?: RelacionReferencia;
}

// ----------------------------------------------------------------
// Respuesta paginada para la lista de clientes
// ----------------------------------------------------------------
export interface PaginacionClientes {
  clientes: ClienteResumen[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

// ----------------------------------------------------------------
// Expediente completo con relaciones
// ----------------------------------------------------------------
export interface ExpedienteCompleto extends Cliente {
  documentos: DocumentoCliente[];
  referencias: ReferenciaCliente[];
}
