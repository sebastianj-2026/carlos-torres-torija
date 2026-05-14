// ================================================================
// OFICINA TS — Módulo de Tesorería
// ================================================================

export type TipoMovimiento = 'entrada' | 'salida';
export type TipoCategoria  = 'entrada' | 'salida' | 'ambos';

export interface CuentaBancaria {
  id: string;
  alias: string;
  titular: string;
  banco: string;
  clabe: string | null;
  numero_cuenta: string | null;
  saldo_inicial: string;
  saldo_actual: string;
  activa: boolean;
  notas: string | null;
  registrado_por: string | null;
  fecha_registro: string;
  fecha_actualizacion: string;
}

export interface CategoriaMovimiento {
  id: string;
  nombre: string;
  tipo: TipoCategoria;
  activa: boolean;
  registrado_por: string | null;
  fecha_registro: string;
}

export interface MovimientoCaja {
  id: string;
  tipo: TipoMovimiento;
  concepto: string;
  monto: string;
  fecha: string;
  encargado: string;
  categoria_id: string | null;
  categoria_nombre: string | null;
  voucher_nombre: string | null;
  voucher_mime: string | null;
  voucher_tamano: number | null;
  notas: string | null;
  registrado_por: string | null;
  fecha_registro: string;
}

export interface Traspaso {
  id: string;
  cuenta_origen_id: string | null;
  cuenta_origen_alias: string | null;
  cuenta_destino_id: string | null;
  cuenta_destino_alias: string | null;
  monto: string;
  concepto: string | null;
  fecha: string;
  voucher_nombre: string | null;
  voucher_mime: string | null;
  voucher_tamano: number | null;
  registrado_por: string | null;
  fecha_registro: string;
}

export interface ResumenCaja {
  saldo_actual: number;
  total_entradas: number;
  total_salidas: number;
  movimientos_mes: number;
}

export interface LogAuditoria {
  id: string;
  modulo: string;
  tabla: string;
  registro_id: string | null;
  accion: string;
  detalle: Record<string, unknown> | null;
  usuario_id: string | null;
  usuario_nombre: string | null;
  usuario_correo: string | null;
  fecha_registro: string;
}

// ── DTOs ──────────────────────────────────────────────────────────

export interface CrearCuentaDto {
  alias: string;
  titular: string;
  banco: string;
  clabe?: string;
  numero_cuenta?: string;
  saldo_inicial?: number;
  notas?: string;
}

export interface EditarCuentaDto {
  alias?: string;
  titular?: string;
  banco?: string;
  clabe?: string | null;
  numero_cuenta?: string | null;
  notas?: string | null;
}

export interface CrearCategoriaDto {
  nombre: string;
  tipo?: TipoCategoria;
}

export interface CrearMovimientoDto {
  tipo: TipoMovimiento;
  concepto: string;
  monto: number;
  fecha?: string;
  encargado: string;
  categoria_id?: string;
  notas?: string;
}

export interface CrearTraspasoDto {
  cuenta_origen_id?: string | null;
  cuenta_destino_id?: string | null;
  monto: number;
  concepto?: string;
  fecha?: string;
}

export interface PaginacionMovimientos {
  movimientos: MovimientoCaja[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

export interface PaginacionTraspasos {
  traspasos: Traspaso[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}
