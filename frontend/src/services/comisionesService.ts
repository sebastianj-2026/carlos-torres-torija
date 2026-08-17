import apiClient from './authService';

// Montos/tasas viajan como STRING (NUMERIC). Sin aritmética de dinero en float.

export interface PreviewFila {
  persona_id: number;
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string | null;
  concepto: 'rendimiento' | 'comision';
  origen_id: number;
  base_capital: string;
  tasa: string;
  monto_devengado: string;
}

export interface PreviewCorte {
  periodo: string;
  por_generar: PreviewFila[];
  total: number;
  ya_tiene_devengos: boolean;
}

export interface ResultadoCorte {
  periodo: string;
  generados_rendimiento: number;
  generados_comision: number;
  total_generados: number;
  ya_corrido: boolean;
}

export const previewCorte = async (periodo: string): Promise<PreviewCorte> => {
  const { data } = await apiClient.get<PreviewCorte>(`/comisiones/cortes/${periodo}/preview`);
  return data;
};

export const generarCorte = async (periodo: string): Promise<ResultadoCorte> => {
  const { data } = await apiClient.post<ResultadoCorte>(`/comisiones/cortes/${periodo}`);
  return data;
};

export interface PendienteLinea {
  persona_id: number;
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string | null;
  concepto: 'rendimiento' | 'comision';
  origen_tipo: 'aportacion' | 'credito';
  origen_id: number;
  acumulado: string;
  meses: string | number;
  desde: string;
}

export const listarPendientes = async (): Promise<PendienteLinea[]> => {
  const { data } = await apiClient.get<{ pendientes: PendienteLinea[] }>('/comisiones/pendientes');
  return data.pendientes;
};

export interface RegistrarPagoInput {
  persona_id: number;
  concepto: 'rendimiento' | 'comision';
  origen_tipo: 'aportacion' | 'credito';
  origen_id: number;
  monto: string;
  fecha: string;
  autorizado_por: string;
  comprobante_doc_id?: number | null;
  nota?: string;
}

export const registrarPagoComision = async (input: RegistrarPagoInput): Promise<unknown> => {
  const { data } = await apiClient.post('/comisiones/pagos', input);
  return data;
};

// Suma de importes MXN en centavos enteros (sin float) → "1234.56".
export const sumaMxn = (valores: string[]): string => {
  let cents = 0;
  for (const v of valores) {
    const [ent, dec = '0'] = v.split('.');
    cents += parseInt(ent, 10) * 100 + parseInt((dec + '00').slice(0, 2), 10);
  }
  const signo = cents < 0 ? '-' : '';
  const abs = Math.abs(cents).toString().padStart(3, '0');
  return `${signo}${abs.slice(0, -2)}.${abs.slice(-2)}`;
};
