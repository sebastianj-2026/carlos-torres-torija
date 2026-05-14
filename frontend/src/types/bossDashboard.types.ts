export interface BossKpis {
  mes:  number;
  anio: number;
  bloque1: {
    dinero_bancos_caja:   number;
    tasa_ocupacion:       number;
    inmuebles_rentados:   number;
    total_inmuebles:      number;
    eficiencia_cobranza:  number;
    rentas_cobradas:      number;
    rentas_esperadas:     number;
  };
  bloque2: {
    total_ingresos:    number;
    ingresos_desglose: {
      rentas:          number;
      estacionamiento: number;
      cancha:          number;
      prestamos:       number;
    };
    total_egresos_op:     number;
    costo_nomina:         number;
    pago_creditos_mes:    number;
    ratio_deuda_ingreso:  number;
    utilidad_neta:        number;
    total_salidas:        number;
  };
  bloque3: {
    juicios: {
      count:            number;
      dinero_congelado: number;
    };
    cuentas_urgentes: {
      monto: number;
      count: number;
    };
    contratos_por_vencer: number;
  };
}
