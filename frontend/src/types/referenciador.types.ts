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

// '' = todas las formas
export type FiltroForma = '' | '1' | '2' | '3';

export interface FiltrosReferenciadores {
  buscar: string;
  forma: FiltroForma;
  pagina: number;
  limite: number;
}
