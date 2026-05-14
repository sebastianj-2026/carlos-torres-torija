export type EtapaProcesal = 'demanda' | 'emplazamiento' | 'pruebas' | 'sentencia';

export interface Juicio {
  id: string;
  prestamo_id: string;
  cliente_id: string;
  abogado_nombre: string | null;
  abogado_telefono: string | null;
  abogado_email: string | null;
  fecha_asignacion_abogado: string | null;
  fecha_inicio: string;
  etapa_procesal: EtapaProcesal;
  proxima_fecha_critica: string | null;
  descripcion_fecha_critica: string | null;
  notas: string | null;
  activo: boolean;
  registrado_por: string | null;
  fecha_registro: string;
  fecha_actualizacion: string;
}

export interface GastoLegal {
  id: string;
  juicio_id: string;
  concepto: string;
  monto: string;
  fecha: string;
  notas: string | null;
  registrado_por: string | null;
  fecha_registro: string;
}

export interface DocumentoJuicio {
  id: string;
  juicio_id: string;
  nombre_documento: string;
  nombre_original: string | null;
  mime_type: string | null;
  tamano_bytes: number | null;
  registrado_por: string | null;
  fecha_registro: string;
}

export interface BitacoraLegal {
  id: string;
  juicio_id: string;
  descripcion: string;
  etapa: string | null;
  registrado_por: string | null;
  fecha_registro: string;
}

export interface JuicioResumen {
  id: string;
  prestamo_id: string;
  folio: string | null;
  cliente_id: string;
  cliente_nombre: string;
  abogado_nombre: string | null;
  fecha_asignacion_abogado: string | null;
  fecha_inicio: string;
  etapa_procesal: EtapaProcesal;
  proxima_fecha_critica: string | null;
  descripcion_fecha_critica: string | null;
  monto_prestado: string;
  saldo_pendiente: string;
  valor_propiedad: string | null;
  total_gastos_legales: string;
  deuda_total: string;
  fecha_ultimo_pago: string | null;
  activo: boolean;
}

export interface JuicioDetalle extends Juicio {
  folio: string | null;
  tipo_garantia: string | null;
  cliente_nombre: string;
  cliente_telefono: string | null;
  monto_prestado: string;
  saldo_pendiente: string;
  valor_propiedad: string | null;
  total_gastos_legales: string;
  deuda_total: string;
  fecha_ultimo_pago: string | null;
  gastos: GastoLegal[];
  documentos: DocumentoJuicio[];
  bitacora: BitacoraLegal[];
}

export interface ActualizarJuicioDto {
  abogado_nombre?: string | null;
  abogado_telefono?: string | null;
  abogado_email?: string | null;
  fecha_asignacion_abogado?: string | null;
  etapa_procesal?: EtapaProcesal;
  proxima_fecha_critica?: string | null;
  descripcion_fecha_critica?: string | null;
  notas?: string | null;
}

export interface AgregarGastoLegalDto {
  concepto: string;
  monto: number;
  fecha?: string;
  notas?: string;
}

export interface AgregarBitacoraDto {
  descripcion: string;
  etapa?: string;
}
