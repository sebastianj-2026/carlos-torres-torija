import apiClient from './authService';
import {
  CuentaBancaria, CategoriaMovimiento, MovimientoCaja,
  Traspaso, ResumenCaja, PaginacionMovimientos, PaginacionTraspasos,
  ResumenFlujoCaja,
} from '../types/tesoreria.types';

const BASE = '/tesoreria';

export interface UsuarioSimple { id: string; nombre: string; }

export const listarUsuariosActivos = async (): Promise<UsuarioSimple[]> => {
  const res = await apiClient.get<UsuarioSimple[]>('/auth/usuarios');
  return res.data;
};

// ── Cuentas bancarias ─────────────────────────────────────────────

export const listarCuentas = async (): Promise<CuentaBancaria[]> => {
  const res = await apiClient.get<CuentaBancaria[]>(`${BASE}/cuentas`);
  return res.data;
};

export const crearCuenta = async (datos: object): Promise<{ cuenta: CuentaBancaria }> => {
  const res = await apiClient.post<{ cuenta: CuentaBancaria }>(`${BASE}/cuentas`, datos);
  return res.data;
};

export const editarCuenta = async (id: string, datos: object): Promise<{ cuenta: CuentaBancaria }> => {
  const res = await apiClient.put<{ cuenta: CuentaBancaria }>(`${BASE}/cuentas/${id}`, datos);
  return res.data;
};

export const desactivarCuenta = async (id: string): Promise<void> => {
  await apiClient.delete(`${BASE}/cuentas/${id}`);
};

// ── Categorías ────────────────────────────────────────────────────

export const listarCategorias = async (): Promise<CategoriaMovimiento[]> => {
  const res = await apiClient.get<CategoriaMovimiento[]>(`${BASE}/categorias`);
  return res.data;
};

export const crearCategoria = async (nombre: string, tipo?: string): Promise<{ categoria: CategoriaMovimiento }> => {
  const res = await apiClient.post<{ categoria: CategoriaMovimiento }>(`${BASE}/categorias`, { nombre, tipo });
  return res.data;
};

// ── Caja chica ────────────────────────────────────────────────────

export const obtenerResumenCaja = async (): Promise<ResumenCaja> => {
  const res = await apiClient.get<ResumenCaja>(`${BASE}/caja/resumen`);
  return res.data;
};

export const listarMovimientos = async (params: {
  tipo?: string;
  categoria_id?: string;
  desde?: string;
  hasta?: string;
  pagina?: number;
  limite?: number;
}): Promise<PaginacionMovimientos> => {
  const res = await apiClient.get<PaginacionMovimientos>(`${BASE}/caja`, { params });
  return res.data;
};

export const crearMovimiento = async (formData: FormData): Promise<{ movimiento: MovimientoCaja }> => {
  const res = await apiClient.post<{ movimiento: MovimientoCaja }>(`${BASE}/caja`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const editarMovimiento = async (id: string, formData: FormData): Promise<{ movimiento: MovimientoCaja }> => {
  const res = await apiClient.put<{ movimiento: MovimientoCaja }>(`${BASE}/caja/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const eliminarMovimiento = async (id: string): Promise<void> => {
  await apiClient.delete(`${BASE}/caja/${id}`);
};

export const fetchVoucherMovimiento = async (id: string): Promise<string> => {
  const res = await apiClient.get(`${BASE}/caja/${id}/voucher`, { responseType: 'blob' });
  return URL.createObjectURL(res.data as Blob);
};

// ── Traspasos ─────────────────────────────────────────────────────

export const listarTraspasos = async (params: {
  pagina?: number;
  limite?: number;
}): Promise<PaginacionTraspasos> => {
  const res = await apiClient.get<PaginacionTraspasos>(`${BASE}/traspasos`, { params });
  return res.data;
};

export const crearTraspaso = async (formData: FormData): Promise<{ traspaso: Traspaso }> => {
  const res = await apiClient.post<{ traspaso: Traspaso }>(`${BASE}/traspasos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const fetchVoucherTraspaso = async (id: string): Promise<string> => {
  const res = await apiClient.get(`${BASE}/traspasos/${id}/voucher`, { responseType: 'blob' });
  return URL.createObjectURL(res.data as Blob);
};

// ── Flujo de Caja ─────────────────────────────────────────────────

export const obtenerFlujoCaja = async (mes: number, anio: number): Promise<ResumenFlujoCaja> => {
  const res = await apiClient.get<ResumenFlujoCaja>(`${BASE}/flujo-caja`, { params: { mes, anio } });
  return res.data;
};
