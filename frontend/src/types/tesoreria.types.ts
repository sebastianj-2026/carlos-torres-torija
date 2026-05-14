// ================================================================
// OFICINA TS — Módulo de Tesorería (frontend types)
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
  numero_tarjeta: string | null;
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

// ── Flujo de Caja ─────────────────────────────────────────────────

export interface FlujoCajaCategoria {
  categoria_id: string | null;
  categoria_nombre: string;
  tipo: TipoMovimiento;
  total: number;
  cantidad: number;
}

export interface FlujoCajaOrigen {
  origen: string;
  total: number;
  cantidad: number;
}

export interface ResumenFlujoCaja {
  mes: number;
  anio: number;
  total_entradas: number;
  total_salidas: number;
  flujo_neto: number;
  total_movimientos: number;
  por_categoria: FlujoCajaCategoria[];
  ingresos_por_origen: FlujoCajaOrigen[];
  total_ingresos_externos: number;
}

// ── Form state ────────────────────────────────────────────────────

export interface FormCuentaData {
  alias: string;
  titular: string;
  banco: string;
  clabe: string;
  numero_cuenta: string;
  numero_tarjeta: string;
  saldo_inicial: string;
  notas: string;
}

export interface FormMovimientoData {
  tipo: TipoMovimiento;
  concepto: string;
  monto: string;
  fecha: string;
  encargado: string;
  categoria_id: string;
  notas: string;
}

export interface FormTraspasoData {
  cuenta_origen_id: string;   // '' = caja chica
  cuenta_destino_id: string;  // '' = caja chica
  monto: string;
  concepto: string;
  fecha: string;
}
