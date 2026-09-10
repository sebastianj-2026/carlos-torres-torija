import apiClient from './authService';
import {
  PaginacionReferenciadores,
  FiltrosReferenciadores,
  ReferenciadorResumen,
  ReferenciadorDetalle,
  PersonaLista,
} from '../types/referenciador.types';
import { listarInversionistas } from './inversionistasService';

// El backend nuevo responde con envelope { success, data, error }.
interface Envelope<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

// Ambos endpoints capean limite en 100; tope de vueltas por si el total crece.
const LIMITE_PAGINA = 100;
const MAX_PAGINAS = 50;

// ----------------------------------------------------------------
// Listar referenciadores (formas 2 y 3), con búsqueda y filtro de forma
// GET /api/referenciadores
// ----------------------------------------------------------------
export const listarReferenciadores = async (
  filtros: Partial<FiltrosReferenciadores>
): Promise<PaginacionReferenciadores> => {
  const params = new URLSearchParams();
  if (filtros.buscar) params.set('buscar', filtros.buscar);
  if (filtros.forma)  params.set('forma',  filtros.forma);
  if (filtros.pagina) params.set('pagina', String(filtros.pagina));
  if (filtros.limite) params.set('limite', String(filtros.limite));

  const respuesta = await apiClient.get<Envelope<PaginacionReferenciadores>>(
    `/referenciadores?${params.toString()}`
  );

  if (!respuesta.data.success || !respuesta.data.data) {
    throw new Error(respuesta.data.error ?? 'No se pudo cargar la lista de referenciadores.');
  }
  return respuesta.data.data;
};

// ----------------------------------------------------------------
// Detalle de referenciador con sus referencias (M7)
// GET /api/referenciadores/:id
// ----------------------------------------------------------------
export const obtenerReferenciador = async (id: string): Promise<ReferenciadorDetalle> => {
  const respuesta = await apiClient.get<Envelope<ReferenciadorDetalle>>(
    `/referenciadores/${id}`
  );
  if (!respuesta.data.success || !respuesta.data.data) {
    throw new Error(respuesta.data.error ?? 'No se pudo cargar el referenciador.');
  }
  return respuesta.data.data;
};

// ----------------------------------------------------------------
// Alta y edición de referenciador (M22) — POST/PATCH /api/referenciadores
// ----------------------------------------------------------------
export interface DatosReferenciador {
  nombres: string;
  apellido_paterno: string;
  apellido_materno?: string;
  telefono?: string;
  correo?: string;
  direccion?: string;
  url_ine?: string;
  numero_cuenta?: string;
  banco?: string;
}

export const crearReferenciador = async (
  datos: DatosReferenciador
): Promise<ReferenciadorResumen> => {
  const respuesta = await apiClient.post<Envelope<ReferenciadorResumen>>(
    '/referenciadores',
    datos
  );
  if (!respuesta.data.success || !respuesta.data.data) {
    throw new Error(respuesta.data.error ?? 'No se pudo crear el referenciador.');
  }
  return respuesta.data.data;
};

export const editarReferenciador = async (
  id: string,
  datos: Partial<DatosReferenciador>
): Promise<void> => {
  const respuesta = await apiClient.patch<Envelope<ReferenciadorResumen>>(
    `/referenciadores/${id}`,
    datos
  );
  if (!respuesta.data.success) {
    throw new Error(respuesta.data.error ?? 'No se pudo actualizar el referenciador.');
  }
};

// ----------------------------------------------------------------
// Baja de referenciador (P6): cambia estado, nunca DELETE
// PATCH /api/referenciadores/:id
// ----------------------------------------------------------------
export const darDeBajaReferenciador = async (id: string): Promise<void> => {
  const respuesta = await apiClient.patch<Envelope<ReferenciadorResumen>>(
    `/referenciadores/${id}`,
    { activo: false }
  );
  if (!respuesta.data.success) {
    throw new Error(respuesta.data.error ?? 'No se pudo dar de baja al referenciador.');
  }
};

// ----------------------------------------------------------------
// Lista combinada de las tres formas de ganar (M5)
// Trae completas ambas fuentes (escala de oficina) y las une:
//   forma 1 = inversionista sin fila en referenciadores
//   forma 2/3 = referenciadores (la forma ya viene del backend)
// Filtro, búsqueda y paginación se resuelven en el cliente.
// ----------------------------------------------------------------
export const listarPersonasTresFormas = async (): Promise<PersonaLista[]> => {
  const referenciadores: ReferenciadorResumen[] = [];
  for (let pagina = 1; pagina <= MAX_PAGINAS; pagina++) {
    const lote = await listarReferenciadores({ pagina, limite: LIMITE_PAGINA });
    referenciadores.push(...lote.referenciadores);
    if (pagina >= lote.totalPaginas) break;
  }

  const personas: PersonaLista[] = referenciadores.map((r) => ({
    id: r.id,
    forma: r.forma,
    nombres: r.nombres,
    apellido_paterno: r.apellido_paterno,
    apellido_materno: r.apellido_materno,
    telefono: r.telefono,
    correo: r.correo,
    inversionista_id: r.inversionista_id,
    activo: r.activo,
    // El backend no expone deuda hasta que corra el motor (M12).
    se_le_debe: null,
    al_corriente: null,
  }));

  const idsConFormaDos = new Set(
    referenciadores
      .map((r) => r.inversionista_id)
      .filter((id): id is string => id !== null)
  );

  for (let pagina = 1; pagina <= MAX_PAGINAS; pagina++) {
    const lote = await listarInversionistas({ pagina, limite: LIMITE_PAGINA });
    for (const inv of lote.inversionistas) {
      if (idsConFormaDos.has(inv.id)) continue;
      personas.push({
        id: inv.id,
        forma: 1,
        nombres: inv.nombres,
        apellido_paterno: inv.apellido_paterno,
        apellido_materno: inv.apellido_materno,
        telefono: inv.telefono,
        correo: null,
        inversionista_id: inv.id,
        activo: null,
        se_le_debe: null,
        al_corriente: null,
      });
    }
    if (pagina >= lote.totalPaginas) break;
  }

  // Mismo orden que el backend: apellido paterno, luego nombres
  personas.sort((a, b) =>
    a.apellido_paterno.localeCompare(b.apellido_paterno, 'es') ||
    a.nombres.localeCompare(b.nombres, 'es')
  );

  return personas;
};
