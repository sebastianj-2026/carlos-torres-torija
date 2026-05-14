export interface DashboardKpis {
  mes:  number;
  anio: number;
  liquidez_total:       number;
  pendiente_cobro:      number;
  pasivo_total:         number;
  contratos_por_vencer: number;
  indice_morosidad:     number;
  total_ingresos:       number;
  categorias_ingresos: {
    rentas:          number;
    estacionamiento: number;
    cancha:          number;
    prestamos:       number;
  };
  total_egresos:        number;
  categorias_egresos: {
    abril:              number;
    oficina:            number;
    creditos_bancarios: number;
    inversionistas:     number;
    extras:             number;
  };
  utilidad_neta: number;
}
