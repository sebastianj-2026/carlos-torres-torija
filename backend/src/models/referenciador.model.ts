// ================================================================
// OFICINA TS — Módulo de Referenciadores
// Interfaces TypeScript para la tabla `referenciadores` (M1).
// El referenciador es la persona que trae inversiones o préstamos.
// Puede o no ser inversionista (inversionista_id nullable = forma 3).
// ================================================================

// ----------------------------------------------------------------
// Referenciador — persona que refiere, con o sin capital
// ----------------------------------------------------------------
export interface Referenciador {
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
  // Liga a su fila de inversionista si además aportó capital. NULL = forma 3.
  inversionista_id: string | null;
  activo: boolean;
  registrado_por: string | null;
  fecha_registro: string;
  fecha_actualizacion: string;
}

// Forma de ganar derivada de inversionista_id (P1):
//   2 = inversionista y referenciador (inversionista_id lleno)
//   3 = solo referenciador            (inversionista_id NULL)
// La forma 1 (solo inversionista) no vive en esta tabla.
export type FormaReferenciador = 2 | 3;

// ----------------------------------------------------------------
// DTOs para creación y edición
// ----------------------------------------------------------------
export interface CrearReferenciadorDto {
  nombres: string;
  apellido_paterno: string;
  apellido_materno?: string;
  telefono?: string;
  correo?: string;
  direccion?: string;
  url_ine?: string;
  numero_cuenta?: string;
  banco?: string;
  inversionista_id?: string;
}

// La edición admite además la baja por estado (P6): activo se apaga, nunca DELETE.
export type EditarReferenciadorDto = Partial<CrearReferenciadorDto> & {
  activo?: boolean;
};
