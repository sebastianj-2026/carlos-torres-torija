export type ModuloOrigen = 'prestamo' | 'renta';

export interface PagoGlobal {
  id: string;
  modulo_origen: ModuloOrigen;
  referencia_id: string;
  cliente_id: string | null;
  monto_pagado: number;
  fecha_pago: string;
  url_recibo: string | null;
  notas: string | null;
}

export interface RegistrarPagoPayload {
  modulo_origen: ModuloOrigen;
  referencia_id: string;
  cliente_id?: string;
  monto_pagado: number;
  notas?: string;
  recibo?: File;
}

export interface RegistrarPagoResponse {
  id: string;
  modulo_origen: ModuloOrigen;
  referencia_id: string;
  cliente_id: string | null;
  monto_pagado: number;
  nuevo_saldo: number;
  liquidado: boolean;
  fecha_proximo_pago: string | null;
  url_recibo: string | null;
}

export interface PrestamoDeudaItem {
  id: string;
  folio: string;
  saldo_pendiente: string;
  estatus: string;
  fecha_proximo_pago: string | null;
}

export interface DeudaActivaCliente {
  prestamos: PrestamoDeudaItem[];
  total_prestamos: number;
  total_rentas: number;
  total_activo: number;
}

export interface DeudaOrigen {
  modulo_origen: ModuloOrigen;
  referencia_id: string;
  cliente_id?: string;
  descripcion: string;
  saldo_actual: number;
}
