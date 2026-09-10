import React from 'react';
import { TrendingDown, Landmark, AlertTriangle, CalendarClock } from 'lucide-react';
import { PagoPrestamo, TipoPago } from '../../types/prestamo.types';

const fmt = (valor: string | number): string =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(
    typeof valor === 'string' ? parseFloat(valor) : valor
  );

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const CONFIG_TIPO: Record<TipoPago, {
  etiqueta: string;
  color: string;
  colorTexto: string;
  Icono: React.ElementType;
}> = {
  interes:            { etiqueta: 'Pago de interés',    color: 'bg-green-100',  colorTexto: 'text-green-700',  Icono: TrendingDown  },
  capital:            { etiqueta: 'Abono a capital',    color: 'bg-blue-100',   colorTexto: 'text-blue-700',   Icono: Landmark      },
  moratorio:          { etiqueta: 'Pago de moratorio',  color: 'bg-red-100',    colorTexto: 'text-red-700',    Icono: AlertTriangle },
  interes_anticipado: { etiqueta: 'Interés anticipado', color: 'bg-sky-100', colorTexto: 'text-sky-700', Icono: CalendarClock },
};

interface HistorialPagosProps {
  pagos: PagoPrestamo[];
  cargando?: boolean;
}

const HistorialPagos: React.FC<HistorialPagosProps> = ({ pagos, cargando = false }) => {
  if (cargando) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <div className="w-9 h-9 bg-slate-200 rounded-xl shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-slate-200 rounded w-1/3" />
              <div className="h-3 bg-slate-200 rounded w-1/2" />
            </div>
            <div className="h-4 w-24 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (pagos.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-6">Sin pagos registrados.</p>;
  }

  return (
    <div className="space-y-1">
      {pagos.map((pago) => {
        const config  = CONFIG_TIPO[pago.tipo_pago];
        const fecha   = new Date(pago.fecha_pago);
        const periodo = pago.periodo_mes && pago.periodo_anio
          ? ` · ${MESES[pago.periodo_mes - 1]} ${pago.periodo_anio}`
          : '';

        return (
          <div
            key={pago.id}
            className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${config.color}`}>
              <config.Icono size={15} className={config.colorTexto} />
            </div>

            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${config.colorTexto}`}>
                {config.etiqueta}{periodo}
              </p>
              <p className="text-xs text-slate-400">
                {fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                {pago.forma_pago && ` · ${pago.forma_pago}`}
              </p>
              {pago.notas && (
                <p className="text-xs text-slate-500 mt-0.5 truncate">{pago.notas}</p>
              )}
            </div>

            <p className={`text-sm font-bold shrink-0 ${config.colorTexto}`}>
              {fmt(pago.monto)}
            </p>
          </div>
        );
      })}
    </div>
  );
};

export default HistorialPagos;
