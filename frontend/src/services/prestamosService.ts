import apiClient from './authService';
import {
  PaginacionPrestamos,
  ExpedientePrestamo,
  PagoPrestamo,
  MoratorioPrestamo,
  DocumentoPrestamo,
  FiltrosPrestamos,
  FormularioPrestamoData,
  EstatusPrestamo,
  TipoDocumentoPrestamo,
  TipoArchivoPrestamo,
  ArchivoPrestamoMeta,
  FormaPago,
  TipoPago,
  StatsPrestamos,
} from '../types/prestamo.types';

// ----------------------------------------------------------------
// Estadísticas del dashboard
// ----------------------------------------------------------------
export const obtenerStatsPrestamos = async (): Promise<StatsPrestamos> => {
  const res = await apiClient.get<StatsPrestamos>('/prestamos/stats');
  return res.data;
};

// ----------------------------------------------------------------
// Sincronizar estatus por mora calendario (fire-and-forget)
// ----------------------------------------------------------------
export const sincronizarEstatusPrestamos = async (): Promise<void> => {
  await apiClient.post('/prestamos/sincronizar-estatus');
};

// ----------------------------------------------------------------
// Listar préstamos con filtros, paginación y orden
// ----------------------------------------------------------------
export const listarPrestamos = async (
  filtros: Partial<FiltrosPrestamos>
): Promise<PaginacionPrestamos> => {
  const params = new URLSearchParams();
  if (filtros.buscar)     params.set('buscar',     filtros.buscar);
  if (filtros.estatus)    params.set('estatus',    filtros.estatus);
  if (filtros.pagina)     params.set('pagina',     String(filtros.pagina));
  if (filtros.limite)     params.set('limite',     String(filtros.limite));
  if (filtros.ordenarPor) params.set('ordenarPor', filtros.ordenarPor);
  if (filtros.direccion)  params.set('direccion',  filtros.direccion);

  const res = await apiClient.get<PaginacionPrestamos>(`/prestamos?${params.toString()}`);
  return res.data;
};

// ----------------------------------------------------------------
// Obtener expediente completo
// ----------------------------------------------------------------
export const obtenerPrestamo = async (id: string): Promise<ExpedientePrestamo> => {
  const res = await apiClient.get<ExpedientePrestamo>(`/prestamos/${id}`);
  return res.data;
};

// ----------------------------------------------------------------
// Crear préstamo
// ----------------------------------------------------------------
export const crearPrestamo = async (
  datos: Partial<FormularioPrestamoData>
): Promise<{ mensaje: string; prestamo: { id: string; folio: string } }> => {
  const res = await apiClient.post<{ mensaje: string; prestamo: { id: string; folio: string } }>(
    '/prestamos',
    datos
  );
  return res.data;
};

// ----------------------------------------------------------------
// Editar préstamo
// ----------------------------------------------------------------
export const editarPrestamo = async (
  id: string,
  datos: Partial<FormularioPrestamoData>
): Promise<{ mensaje: string }> => {
  const res = await apiClient.put<{ mensaje: string }>(`/prestamos/${id}`, datos);
  return res.data;
};

// ----------------------------------------------------------------
// Cambiar estatus
// ----------------------------------------------------------------
export const cambiarEstatusPrestamo = async (
  id: string,
  estatus: EstatusPrestamo
): Promise<{ mensaje: string }> => {
  const res = await apiClient.patch<{ mensaje: string }>(`/prestamos/${id}/estatus`, { estatus });
  return res.data;
};

// ----------------------------------------------------------------
// Renovar préstamo
// ----------------------------------------------------------------
export const renovarPrestamo = async (
  id: string,
  datos: {
    monto_prestado: number;
    tasa_interes_mensual: number;
    tasa_moratoria_mensual?: number;
    plazo_meses: number;
    fecha_inicio: string;
    notaria?: string;
    notas?: string;
  }
): Promise<{ mensaje: string; prestamo: { id: string } }> => {
  const res = await apiClient.post<{ mensaje: string; prestamo: { id: string } }>(
    `/prestamos/${id}/renovar`,
    datos
  );
  return res.data;
};

// ----------------------------------------------------------------
// Pagos
// ----------------------------------------------------------------
export const listarPagos = async (prestamoId: string): Promise<PagoPrestamo[]> => {
  const res = await apiClient.get<PagoPrestamo[]>(`/prestamos/${prestamoId}/pagos`);
  return res.data;
};

export const registrarPago = async (
  prestamoId: string,
  datos: {
    tipo_pago: TipoPago;
    monto: number;
    forma_pago?: FormaPago;
    periodo_mes?: number;
    periodo_anio?: number;
    notas?: string;
  }
): Promise<{
  mensaje: string;
  pago: PagoPrestamo;
  saldo_pendiente_nuevo: number;
  interes_mensual_calculado: number;
}> => {
  const res = await apiClient.post(`/prestamos/${prestamoId}/pagos`, datos);
  return res.data;
};

// ----------------------------------------------------------------
// Moratorios
// ----------------------------------------------------------------
export const listarMoratorios = async (prestamoId: string): Promise<MoratorioPrestamo[]> => {
  const res = await apiClient.get<MoratorioPrestamo[]>(`/prestamos/${prestamoId}/moratorios`);
  return res.data;
};

export const calcularMoratorio = async (
  prestamoId: string
): Promise<{ mensaje: string; moratorio: MoratorioPrestamo }> => {
  const res = await apiClient.post(`/prestamos/${prestamoId}/moratorios/calcular`);
  return res.data;
};

export const perdonarMoratorio = async (
  moratorioId: string
): Promise<{ mensaje: string; moratorio: MoratorioPrestamo }> => {
  const res = await apiClient.patch(`/moratorios/${moratorioId}/perdonar`);
  return res.data;
};

// ----------------------------------------------------------------
// Archivos binarios PDF
// ----------------------------------------------------------------
export const listarArchivosPrestamo = async (
  prestamoId: string
): Promise<ArchivoPrestamoMeta[]> => {
  const res = await apiClient.get<ArchivoPrestamoMeta[]>(`/prestamos/${prestamoId}/archivos`);
  return res.data;
};

export const subirArchivoPrestamo = async (
  prestamoId: string,
  tipo: TipoArchivoPrestamo,
  file: File
): Promise<{ mensaje: string; tipo: string; nombre: string }> => {
  const formData = new FormData();
  formData.append('archivo', file);
  const res = await apiClient.post(
    `/prestamos/${prestamoId}/archivos/${tipo}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return res.data;
};

export const getUrlArchivoPrestamoApi = (prestamoId: string, tipo: TipoArchivoPrestamo): string =>
  `${(apiClient.defaults.baseURL ?? '').replace(/\/$/, '')}/prestamos/${prestamoId}/archivos/${tipo}`;

export const fetchArchivoPrestamo = async (
  prestamoId: string,
  tipo: TipoArchivoPrestamo
): Promise<string> => {
  const res = await apiClient.get(`/prestamos/${prestamoId}/archivos/${tipo}`, {
    responseType: 'blob',
  });
  return URL.createObjectURL(res.data as Blob);
};

// ----------------------------------------------------------------
// Documentos
// ----------------------------------------------------------------
export const actualizarDocumentos = async (
  prestamoId: string,
  documentos: Array<{
    tipo: TipoDocumentoPrestamo;
    entregado?: boolean;
    digitalizado?: boolean;
    url_archivo?: string;
  }>
): Promise<{ mensaje: string; documentos: DocumentoPrestamo[] }> => {
  const res = await apiClient.put(`/prestamos/${prestamoId}/documentos`, { documentos });
  return res.data;
};
