import apiClient from './authService';
import {
  PaginacionClientes,
  ExpedienteCompleto,
  FormularioClienteData,
  DocumentoCliente,
  ActualizarDocumentoDto,
  ReferenciaCliente,
  CrearReferenciaDto,
  EstatusCliente,
  FiltrosClientes,
  StatsClientes,
} from '../types/cliente.types';

// ----------------------------------------------------------------
// Estadísticas del dashboard
// ----------------------------------------------------------------
export const obtenerStatsClientes = async (): Promise<StatsClientes> => {
  const respuesta = await apiClient.get<StatsClientes>('/clientes/stats');
  return respuesta.data;
};

// ----------------------------------------------------------------
// Listar clientes con búsqueda y paginación
// ----------------------------------------------------------------
export const listarClientes = async (filtros: Partial<FiltrosClientes>): Promise<PaginacionClientes> => {
  const params = new URLSearchParams();

  if (filtros.buscar) params.set('buscar', filtros.buscar);
  if (filtros.estatus) params.set('estatus', filtros.estatus);
  if (filtros.pagina) params.set('pagina', String(filtros.pagina));
  if (filtros.limite) params.set('limite', String(filtros.limite));

  const respuesta = await apiClient.get<PaginacionClientes>(`/clientes?${params.toString()}`);
  return respuesta.data;
};

// ----------------------------------------------------------------
// Obtener expediente completo de un cliente
// ----------------------------------------------------------------
export const obtenerCliente = async (id: string): Promise<ExpedienteCompleto> => {
  const respuesta = await apiClient.get<ExpedienteCompleto>(`/clientes/${id}`);
  return respuesta.data;
};

// ----------------------------------------------------------------
// Crear un nuevo cliente
// ----------------------------------------------------------------
export const crearCliente = async (datos: Partial<FormularioClienteData>): Promise<{ mensaje: string; cliente: { id: string } }> => {
  const respuesta = await apiClient.post<{ mensaje: string; cliente: { id: string } }>('/clientes', datos);
  return respuesta.data;
};

// ----------------------------------------------------------------
// Editar datos de un cliente
// ----------------------------------------------------------------
export const editarCliente = async (id: string, datos: Partial<FormularioClienteData>): Promise<{ mensaje: string }> => {
  const respuesta = await apiClient.put<{ mensaje: string }>(`/clientes/${id}`, datos);
  return respuesta.data;
};

// ----------------------------------------------------------------
// Cambiar estatus
// ----------------------------------------------------------------
export const cambiarEstatus = async (id: string, estatus: EstatusCliente): Promise<{ mensaje: string }> => {
  const respuesta = await apiClient.patch<{ mensaje: string }>(`/clientes/${id}/estatus`, { estatus });
  return respuesta.data;
};

// ----------------------------------------------------------------
// Documentos
// ----------------------------------------------------------------
export const listarDocumentos = async (clienteId: string): Promise<DocumentoCliente[]> => {
  const respuesta = await apiClient.get<DocumentoCliente[]>(`/clientes/${clienteId}/documentos`);
  return respuesta.data;
};

export const actualizarDocumentos = async (
  clienteId: string,
  documentos: ActualizarDocumentoDto[]
): Promise<{ mensaje: string; documentos: DocumentoCliente[] }> => {
  const respuesta = await apiClient.put<{ mensaje: string; documentos: DocumentoCliente[] }>(
    `/clientes/${clienteId}/documentos`,
    documentos
  );
  return respuesta.data;
};

// ----------------------------------------------------------------
// Referencias
// ----------------------------------------------------------------
export const listarReferencias = async (clienteId: string): Promise<ReferenciaCliente[]> => {
  const respuesta = await apiClient.get<ReferenciaCliente[]>(`/clientes/${clienteId}/referencias`);
  return respuesta.data;
};

export const agregarReferencia = async (
  clienteId: string,
  datos: CrearReferenciaDto
): Promise<{ mensaje: string; referencia: ReferenciaCliente }> => {
  const respuesta = await apiClient.post<{ mensaje: string; referencia: ReferenciaCliente }>(
    `/clientes/${clienteId}/referencias`,
    datos
  );
  return respuesta.data;
};

export const eliminarReferencia = async (clienteId: string, refId: string): Promise<{ mensaje: string }> => {
  const respuesta = await apiClient.delete<{ mensaje: string }>(
    `/clientes/${clienteId}/referencias/${refId}`
  );
  return respuesta.data;
};
