// Tipos del slice `personas`. El dinero (monto/tasas) viaja como STRING:
// pg devuelve NUMERIC como texto y el front no hace aritmética de dinero.

export interface Persona {
  id: number;
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string | null;
  telefono: string;
  correo?: string | null;
  direccion?: string | null;
  creado_en?: string;
}

export interface Aportacion {
  id: number;
  inversionista_id: number;
  monto: string;
  fecha: string;
  tasa_inversionista: string;
  referenciador_id: number | null;
  tasa_referenciador: string | null;
  contrato_id: number | null;
  estado: 'activa' | 'liquidada' | 'archivada';
  creado_en?: string;
}

export interface CrearAportacionInput {
  monto: string;
  fecha: string;
  tasa_inversionista: string;
  referenciador_id?: string | null;
  tasa_referenciador?: string | null;
}
