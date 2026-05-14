import apiClient from './authService';
import {
  PaginacionJuicios,
  JuicioDetalle,
  JuicioResumen,
  GastoLegal,
  DocumentoJuicio,
  BitacoraEntry,
  EtapaProcesal,
} from '../types/juicio.types';

export const listarJuicios = async (params: {
  buscar?: string;
  pagina?: number;
  limite?: number;
}): Promise<PaginacionJuicios> => {
  const qs = new URLSearchParams();
  if (params.buscar)  qs.set('buscar',  params.buscar);
  if (params.pagina)  qs.set('pagina',  String(params.pagina));
  if (params.limite)  qs.set('limite',  String(params.limite));
  const res = await apiClient.get<PaginacionJuicios>(`/juicios?${qs.toString()}`);
  return res.data;
};

export const obtenerJuicio = async (id: string): Promise<JuicioDetalle> => {
  const res = await apiClient.get<JuicioDetalle>(`/juicios/${id}`);
  return res.data;
};

export const obtenerJuicioPorPrestamo = async (prestamoId: string): Promise<JuicioResumen> => {
  const res = await apiClient.get<JuicioResumen>(`/juicios/prestamo/${prestamoId}`);
  return res.data;
};

export const actualizarJuicio = async (
  id: string,
  datos: {
    abogado_nombre?: string | null;
    abogado_telefono?: string | null;
    abogado_email?: string | null;
    fecha_asignacion_abogado?: string | null;
    etapa_procesal?: EtapaProcesal;
    proxima_fecha_critica?: string | null;
    descripcion_fecha_critica?: string | null;
    notas?: string | null;
  }
): Promise<{ mensaje: string }> => {
  const res = await apiClient.put<{ mensaje: string }>(`/juicios/${id}`, datos);
  return res.data;
};

export const agregarGastoLegal = async (
  juicioId: string,
  datos: { concepto: string; monto: number; fecha?: string; notas?: string }
): Promise<{ mensaje: string; gasto: GastoLegal }> => {
  const res = await apiClient.post(`/juicios/${juicioId}/gastos`, datos);
  return res.data;
};

export const eliminarGastoLegal = async (
  juicioId: string,
  gastoId: string
): Promise<{ mensaje: string }> => {
  const res = await apiClient.delete(`/juicios/${juicioId}/gastos/${gastoId}`);
  return res.data;
};

export const listarDocumentosJuicio = async (
  juicioId: string
): Promise<DocumentoJuicio[]> => {
  const res = await apiClient.get<DocumentoJuicio[]>(`/juicios/${juicioId}/documentos`);
  return res.data;
};

export const subirDocumentoJuicio = async (
  juicioId: string,
  file: File,
  nombreDocumento?: string
): Promise<{ mensaje: string; documento: DocumentoJuicio }> => {
  const formData = new FormData();
  formData.append('archivo', file);
  if (nombreDocumento) formData.append('nombre_documento', nombreDocumento);
  const res = await apiClient.post(
    `/juicios/${juicioId}/documentos`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return res.data;
};

export const fetchDocumentoJuicio = async (
  juicioId: string,
  docId: string
): Promise<string> => {
  const res = await apiClient.get(`/juicios/${juicioId}/documentos/${docId}`, {
    responseType: 'blob',
  });
  return URL.createObjectURL(res.data as Blob);
};

export const eliminarDocumentoJuicio = async (
  juicioId: string,
  docId: string
): Promise<{ mensaje: string }> => {
  const res = await apiClient.delete(`/juicios/${juicioId}/documentos/${docId}`);
  return res.data;
};

export const listarBitacora = async (
  juicioId: string
): Promise<BitacoraEntry[]> => {
  const res = await apiClient.get<BitacoraEntry[]>(`/juicios/${juicioId}/bitacora`);
  return res.data;
};

export const agregarBitacora = async (
  juicioId: string,
  datos: { descripcion: string; etapa?: string }
): Promise<{ mensaje: string; entrada: BitacoraEntry }> => {
  const res = await apiClient.post(`/juicios/${juicioId}/bitacora`, datos);
  return res.data;
};
