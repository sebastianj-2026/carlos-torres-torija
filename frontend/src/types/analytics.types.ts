export interface AnalyticsData {
  mes:  number;
  anio: number;
  bloque_a: {
    liquidez_total:   number;
    total_ingresos:   number;
    total_egresos:    number;
    utilidad_mensual: number;
  };
  bloque_b: {
    rentas_propias:   number;
    rentas_externas:  number;
    cancha:           number;
    estacionamiento:  number;
    prestamos:        number;
    otros:            number;
    total:            number;
  };
  bloque_c: {
    abril:          number;
    oficina:        number;
    nominas:        number;
    inversionistas: number;
    creditos:       number;
    extras:         number;
    total:          number;
  };
  bloque_d: {
    eficiencia_rentas:     number;
    rentas_cobradas:       number;
    rentas_esperadas:      number;
    eficiencia_prestamos:  number;
    intereses_cobrados:    number;
    intereses_esperados:   number;
    pensiones_activas:     number;
  };
  bloque_e: {
    pago_total_inversionistas:  number;
    ingresos_prestamos_mes:     number;
    utilidad_oficina_inversion: number;
  };
  bloque_f: {
    conteo_casos:    number;
    capital_atorado: number;
    casos: {
      id:              string;
      cliente_nombre:  string;
      etapa_procesal:  string;
      saldo_pendiente: number;
      notas:           string | null;
    }[];
  };
  bloque_g: {
    top_pagadores:  { nombre: string; total: number }[];
    top_deudores:   { nombre: string; deuda:  number }[];
    abonos_capital: { nombre: string; abono:  number }[];
  };
}
