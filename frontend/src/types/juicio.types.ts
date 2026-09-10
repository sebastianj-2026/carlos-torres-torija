export type EtapaProcesal = 'demanda' | 'emplazamiento' | 'pruebas' | 'sentencia';

export const ETIQUETAS_ETAPA: Record<EtapaProcesal, string> = {
  demanda:       'Demanda',
  emplazamiento: 'Emplazamiento',
  pruebas:       'Pruebas',
  sentencia:     'Sentencia',
};

export const COLORES_ETAPA: Record<EtapaProcesal, string> = {
  demanda:       'bg-blue-100 text-blue-700',
  emplazamiento: 'bg-sky-100 text-sky-700',
  pruebas:       'bg-purple-100 text-purple-700',
  sentencia:     'bg-red-100 text-red-700',
};

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

export interface BitacoraEntry {
  id: string;
  juicio_id: string;
  descripcion: string;
  etapa: string | null;
  registrado_por: string | null;
  fecha_registro: string;
}

export interface JuicioDetalle {
  id: string;
  prestamo_id: string;
  folio: string | null;
  tipo_garantia: string | null;
  cliente_id: string;
  cliente_nombre: string;
  cliente_telefono: string | null;
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
  monto_prestado: string;
  saldo_pendiente: string;
  valor_propiedad: string | null;
  total_gastos_legales: string;
  deuda_total: string;
  fecha_ultimo_pago: string | null;
  gastos: GastoLegal[];
  documentos: DocumentoJuicio[];
  bitacora: BitacoraEntry[];
}

export interface PaginacionJuicios {
  juicios: JuicioResumen[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}
