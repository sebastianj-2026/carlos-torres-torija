import apiClient from './authService';
import {
  PaginacionInversionistas,
  PerfilInversionista,
  Inversion,
  HistorialMovimiento,
  MovimientoWallet,
  FiltrosInversionistas,
  FormularioInversionistaData,
  FormularioInversionData,
  EstatusInversion,
  StatsInversionistas,
} from '../types/inversionista.types';

// ----------------------------------------------------------------
// Stats del módulo
// ----------------------------------------------------------------
export const obtenerStatsInversionistas = async (): Promise<StatsInversionistas> => {
  const respuesta = await apiClient.get<StatsInversionistas>('/inversionistas/stats');
  return respuesta.data;
};

// ----------------------------------------------------------------
// Listar inversionistas
// ----------------------------------------------------------------
export const listarInversionistas = async (
  filtros: Partial<FiltrosInversionistas>
): Promise<PaginacionInversionistas> => {
  const params = new URLSearchParams();
  if (filtros.buscar)     params.set('buscar',     filtros.buscar);
  if (filtros.asignado_a) params.set('asignado_a', filtros.asignado_a);
  if (filtros.orden)      params.set('orden',      filtros.orden);
  if (filtros.pagina)     params.set('pagina',     String(filtros.pagina));
  if (filtros.limite)     params.set('limite',     String(filtros.limite));
  const respuesta = await apiClient.get<PaginacionInversionistas>(
    `/inversionistas?${params.toString()}`
  );
  return respuesta.data;
};

// ----------------------------------------------------------------
// Obtener perfil completo
// ----------------------------------------------------------------
export const obtenerInversionista = async (id: string): Promise<PerfilInversionista> => {
  const respuesta = await apiClient.get<PerfilInversionista>(`/inversionistas/${id}`);
  return respuesta.data;
};

type CrearInversionistaInput = Omit<
  Partial<FormularioInversionistaData>,
  'monto_aportado_inicial'
> & {
  monto_aportado_inicial?: number;
};

// ----------------------------------------------------------------
// Crear inversionista (con capital inicial opcional)
// ----------------------------------------------------------------
export const crearInversionista = async (
  datos: CrearInversionistaInput
): Promise<{ mensaje: string; inversionista: { id: string } }> => {
  const respuesta = await apiClient.post<{ mensaje: string; inversionista: { id: string } }>(
    '/inversionistas',
    datos
  );
  return respuesta.data;
};

// ----------------------------------------------------------------
// Editar inversionista
// ----------------------------------------------------------------
export const editarInversionista = async (
  id: string,
  datos: Partial<FormularioInversionistaData>
): Promise<{ mensaje: string }> => {
  const respuesta = await apiClient.put<{ mensaje: string }>(`/inversionistas/${id}`, datos);
  return respuesta.data;
};

// ----------------------------------------------------------------
// Wallet: movimientos de la bolsa de capital
// ----------------------------------------------------------------
export const listarMovimientosWallet = async (id: string): Promise<MovimientoWallet[]> => {
  const respuesta = await apiClient.get<MovimientoWallet[]>(
    `/inversionistas/${id}/movimientos`
  );
  return respuesta.data;
};

// ----------------------------------------------------------------
// Wallet: transferir capital a Oficina TS
// ----------------------------------------------------------------
export const transferirAOficina = async (
  id: string,
  datos: { monto: number; concepto?: string }
): Promise<{ mensaje: string; movimiento: MovimientoWallet; capital_disponible_nuevo: number }> => {
  const respuesta = await apiClient.post<{
    mensaje: string;
    movimiento: MovimientoWallet;
    capital_disponible_nuevo: number;
  }>(`/inversionistas/${id}/uso-oficina`, datos);
  return respuesta.data;
};

// ----------------------------------------------------------------
// Inversiones
// ----------------------------------------------------------------
export const listarInversiones = async (inversionistaId: string): Promise<Inversion[]> => {
  const respuesta = await apiClient.get<Inversion[]>(
    `/inversionistas/${inversionistaId}/inversiones`
  );
  return respuesta.data;
};

export const crearInversion = async (
  inversionistaId: string,
  datos: Partial<FormularioInversionData>
): Promise<{ mensaje: string; inversion: Inversion }> => {
  const respuesta = await apiClient.post<{ mensaje: string; inversion: Inversion }>(
    `/inversionistas/${inversionistaId}/inversiones`,
    datos
  );
  return respuesta.data;
};

export const editarInversion = async (
  id: string,
  datos: Partial<FormularioInversionData>
): Promise<{ mensaje: string }> => {
  const respuesta = await apiClient.put<{ mensaje: string }>(`/inversiones/${id}`, datos);
  return respuesta.data;
};

export const cambiarEstatusInversion = async (
  id: string,
  estatus: EstatusInversion
): Promise<{ mensaje: string }> => {
  const respuesta = await apiClient.patch<{ mensaje: string }>(
    `/inversiones/${id}/estatus`,
    { estatus }
  );
  return respuesta.data;
};

// ----------------------------------------------------------------
// Historial de movimientos de inversiones
// ----------------------------------------------------------------
export const listarHistorial = async (inversionId: string): Promise<HistorialMovimiento[]> => {
  const respuesta = await apiClient.get<HistorialMovimiento[]>(
    `/inversiones/${inversionId}/historial`
  );
  return respuesta.data;
};

export const registrarMovimiento = async (
  inversionId: string,
  datos: {
    tipo: 'pago_interes' | 'aporte_capital' | 'retiro_capital';
    monto: number;
    forma_pago?: string;
    periodo_mes?: number;
    periodo_anio?: number;
    notas?: string;
  }
): Promise<{
  mensaje: string;
  movimiento: HistorialMovimiento;
  monto_interes_calculado: number;
  monto_actual_nuevo: number;
}> => {
  const respuesta = await apiClient.post<{
    mensaje: string;
    movimiento: HistorialMovimiento;
    monto_interes_calculado: number;
    monto_actual_nuevo: number;
  }>(`/inversiones/${inversionId}/historial`, datos);
  return respuesta.data;
};
