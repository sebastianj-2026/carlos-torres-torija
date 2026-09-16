// ================================================================
// Tipos del módulo Referenciadores (frontend)
// Espeja la tabla `referenciadores` (M1) y el endpoint /api/referenciadores.
// ================================================================

// Forma de ganar derivada de inversionista_id:
//   2 = inversionista y referenciador (inversionista_id lleno)
//   3 = solo referenciador            (inversionista_id NULL)
// La forma 1 (solo inversionista) no vive en esta tabla — ver /inversionistas.
export type FormaReferenciador = 2 | 3;

// Fila resumida que devuelve la lista
export interface ReferenciadorResumen {
  id: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  telefono: string | null;
  correo: string | null;
  numero_cuenta: string | null;
  banco: string | null;
  inversionista_id: string | null;
  activo: boolean;
  forma: FormaReferenciador;
}

export interface PaginacionReferenciadores {
  referenciadores: ReferenciadorResumen[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

// ----------------------------------------------------------------
// Lista combinada de las tres formas de ganar (M5)
// Une referenciadores (formas 2 y 3) con inversionistas sin fila
// en referenciadores (forma 1). Se arma en el frontend: el backend
// no expone la UNION (decisión de M3).
// ----------------------------------------------------------------
export type FormaPersona = 1 | 2 | 3;

export interface PersonaLista {
  // id de referenciadores (formas 2/3) o de inversionistas (forma 1)
  id: string;
  forma: FormaPersona;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  telefono: string | null;
  correo: string | null;
  inversionista_id: string | null;
  // null en forma 1: inversionistas no tiene bandera de estado
  activo: boolean | null;
  // Σ devengado − pagado, NUMERIC como string. null mientras el motor
  // de comisiones (M12) no exista: se pinta `—`, nunca 0.00.
  se_le_debe: string | null;
  // true = sin devengos pendientes. null mientras no exista el motor.
  al_corriente: boolean | null;
}

// ----------------------------------------------------------------
// Detalle de referenciador (M7) — GET /api/referenciadores/:id
// Contrato de MODULO.md: detalle + sus referencias (M23/M24).
// ----------------------------------------------------------------
export type TipoReferido = 'inversion' | 'prestamo';

export type EstadoReferencia = 'activa' | 'terminada' | 'cancelada';

export interface ReferenciaConOrigen {
  id: string;
  referenciador_id: string;
  tipo_referido: TipoReferido;
  inversion_id: string | null;
  prestamo_id: string | null;
  // Tasa mensual en porcentaje con 2 decimales: 0.50 = 0.5%. String en pg.
  tasa: string;
  estado: EstadoReferencia;
  fecha_inicio: string;
  fecha_fin: string | null;
  notas: string | null;
  // Nombre del inversionista de la inversión o del cliente del préstamo.
  origen_nombre: string;
  // Dueño de la inversión ligada, para navegar a su perfil. NULL en préstamos.
  origen_inversionista_id: string | null;
}

export interface ReferenciadorDetalle {
  id: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  url_ine: string | null;
  numero_cuenta: string | null;
  banco: string | null;
  inversionista_id: string | null;
  activo: boolean;
  fecha_registro: string;
  referencias: ReferenciaConOrigen[];
}

// ----------------------------------------------------------------
// Referencias por origen (sprint M46–M53)
// ----------------------------------------------------------------

// Lo que devuelve GET /api/referencias?inversion_id= | ?prestamo_id= (M46).
// null cuando el origen no tiene referenciador ligado.
export interface ReferenciaOrigen {
  id: string;
  referenciador_id: string;
  referenciador_nombre: string;
  tipo_referido: TipoReferido;
  inversion_id: string | null;
  prestamo_id: string | null;
  // Porcentaje con 2 decimales como string: 0.50 = 0.5%
  tasa: string;
  estado: EstadoReferencia;
  fecha_inicio: string;
  fecha_fin: string | null;
}

// Payload de POST /api/referencias. fecha_inicio la pone el servidor: no va.
// Exactamente uno de inversion_id | prestamo_id, según tipo_referido.
export interface CrearReferenciaPayload {
  referenciador_id: string;
  tipo_referido: TipoReferido;
  inversion_id?: string;
  prestamo_id?: string;
  tasa: string;
  notas?: string;
}

// PATCH /api/referencias/:id — solo estado/tasa/fecha_fin/notas (R9, M29).
export interface EditarReferenciaPayload {
  estado?: EstadoReferencia;
  tasa?: string;
  fecha_fin?: string;
  notas?: string;
}

// Valor que reporta SelectorReferenciador (M48). Sin referenciador, tasa vacía.
export interface SeleccionReferenciador {
  referenciador_id: string | null;
  tasa: string;
}

// '' = todas las formas
export type FiltroForma = '' | '1' | '2' | '3';

export interface FiltrosReferenciadores {
  buscar: string;
  forma: FiltroForma;
  pagina: number;
  limite: number;
}
