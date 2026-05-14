import apiClient from './authService';
import {
  CategoriaEgreso, ProveedorBeneficiario, DeudaBancaria,
  CuentaPorPagar, PaginacionCuentas, StatsEgresos, AlertasEgresos,
  CreditoBancario,
} from '../types/egresos.types';

const base = '/egresos';

export const listarCategorias = (modulo?: string) => {
  const qs = modulo ? `?modulo=${encodeURIComponent(modulo)}` : '';
  return apiClient.get<CategoriaEgreso[]>(`${base}/categorias${qs}`).then(r => r.data);
};
export const crearCategoria = (d: { nombre: string; tipo_frecuencia?: string; color?: string; modulo?: string }) =>
  apiClient.post<CategoriaEgreso>(`${base}/categorias`, d).then(r => r.data);

export const listarProveedores   = () => apiClient.get<ProveedorBeneficiario[]>(`${base}/proveedores`).then(r => r.data);
export const crearProveedor      = (d: Partial<ProveedorBeneficiario>) =>
  apiClient.post<ProveedorBeneficiario>(`${base}/proveedores`, d).then(r => r.data);
export const editarProveedor     = (id: string, d: Partial<ProveedorBeneficiario>) =>
  apiClient.put<ProveedorBeneficiario>(`${base}/proveedores/${id}`, d).then(r => r.data);
export const eliminarProveedor   = (id: string) =>
  apiClient.delete(`${base}/proveedores/${id}`).then(r => r.data);

export const listarDeudas        = () => apiClient.get<DeudaBancaria[]>(`${base}/deudas`).then(r => r.data);
export const crearDeuda          = (d: Partial<DeudaBancaria>) =>
  apiClient.post<DeudaBancaria>(`${base}/deudas`, d).then(r => r.data);
export const editarDeuda         = (id: string, d: Partial<DeudaBancaria>) =>
  apiClient.put<DeudaBancaria>(`${base}/deudas/${id}`, d).then(r => r.data);

export const listarCuentas = (params: Record<string, string | number>) => {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  return apiClient.get<PaginacionCuentas>(`${base}/cuentas?${qs}`).then(r => r.data);
};
export const crearCuenta         = (d: Partial<CuentaPorPagar>) =>
  apiClient.post<CuentaPorPagar>(`${base}/cuentas`, d).then(r => r.data);
export const editarCuenta        = (id: string, d: Partial<CuentaPorPagar>) =>
  apiClient.put<CuentaPorPagar>(`${base}/cuentas/${id}`, d).then(r => r.data);
export const cambiarEstatusCuenta = (id: string, d: { estatus: string; url_comprobante_pago?: string }) =>
  apiClient.patch<{ mensaje: string; cuenta: CuentaPorPagar }>(`${base}/cuentas/${id}/estatus`, d).then(r => r.data);

export const obtenerStats = (params: { centro_costo?: string; mes?: number; anio?: number } = {}) => {
  const qs = new URLSearchParams();
  if (params.centro_costo) qs.set('centro_costo', params.centro_costo);
  if (params.mes)  qs.set('mes',  String(params.mes));
  if (params.anio) qs.set('anio', String(params.anio));
  const q = qs.toString() ? `?${qs}` : '';
  return apiClient.get<StatsEgresos>(`${base}/stats${q}`).then(r => r.data);
};

export const crearSerie = (d: {
  categoria_id: string;
  proveedor_id?: string;
  concepto: string;
  monto_por_cuota: number;
  total_cuotas: number;
  fecha_inicio: string;
  frecuencia_dias?: number;
  centro_costo: string;
  notas?: string;
}) => apiClient.post<{ serie_id: string; creadas: number }>(`${base}/cuentas/serie`, d).then(r => r.data);

export type KpisEgreso = {
  mes: number; anio: number;
  total_gastado: number; total_movimientos: number; gasto_promedio: number;
  top_gastos: { concepto: string; monto_total: string; categoria_nombre: string }[];
  desglose_metodos: { metodo: string; cantidad: number; total: string }[];
};

export const obtenerKpisOficina = (mes: number, anio: number) =>
  apiClient.get<KpisEgreso>(`${base}/oficina/kpis?mes=${mes}&anio=${anio}`).then(r => r.data);

export const obtenerKpisAbril = (mes: number, anio: number) =>
  apiClient.get<KpisEgreso>(`${base}/abril/kpis?mes=${mes}&anio=${anio}`).then(r => r.data);
export const obtenerAlertas      = () => apiClient.get<AlertasEgresos>(`${base}/alertas`).then(r => r.data);

export const generarRendimientos = (mes: number, anio: number) =>
  apiClient.post<{ mensaje: string; generados: number; omitidos: number }>(
    `${base}/generar-rendimientos`, { mes, anio }
  ).then(r => r.data);

export const listarCreditos = (mes?: number, anio?: number) => {
  const qs = new URLSearchParams();
  if (mes)  qs.set('mes',  String(mes));
  if (anio) qs.set('anio', String(anio));
  const url = qs.toString() ? `${base}/creditos?${qs}` : `${base}/creditos`;
  return apiClient.get<{ creditos: CreditoBancario[]; mes: number; anio: number }>(url)
    .then(r => r.data.creditos);
};

export const crearCredito = (d: Partial<CreditoBancario>) =>
  apiClient.post<CreditoBancario>(`${base}/creditos`, d).then(r => r.data);

export const editarCredito = (id: string, d: Partial<CreditoBancario>) =>
  apiClient.put<CreditoBancario>(`${base}/creditos/${id}`, d).then(r => r.data);

export const registrarPagoCredito = (d: {
  credito_id: string;
  monto_capital: number;
  monto_interes: number;
  monto_iva: number;
  fecha_pago: string;
  tasa_aplicable?: number;
}) =>
  apiClient.post<{ mensaje: string; total: number; nuevo_saldo: number }>(
    `${base}/creditos/pago`, d
  ).then(r => r.data);
