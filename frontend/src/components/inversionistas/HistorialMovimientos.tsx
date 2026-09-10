import React, { useEffect, useState, useCallback } from 'react';
import { ArrowDownLeft, ArrowUpLeft, ArrowUpRight, RefreshCw } from 'lucide-react';
import { HistorialMovimiento, TipoMovimiento } from '../../types/inversionista.types';
import { listarHistorial } from '../../services/inversionistasService';

const formatearMoneda = (valor: string | number): string => {
  const num = typeof valor === 'string' ? parseFloat(valor) : valor;
  if (isNaN(num)) return '$0.00';
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num);
};

const MESES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

// Configuración visual por tipo de movimiento
const configTipo: Record<TipoMovimiento, {
  etiqueta: string;
  color: string;
  colorTexto: string;
  Icono: React.ElementType;
}> = {
  pago_interes:    { etiqueta: 'Pago de interés',  color: 'bg-green-100',  colorTexto: 'text-green-600', Icono: ArrowDownLeft  },
  aporte_capital:  { etiqueta: 'Aporte de capital', color: 'bg-blue-100',   colorTexto: 'text-blue-600',  Icono: ArrowUpLeft    },
  retiro_capital:  { etiqueta: 'Retiro de capital', color: 'bg-sky-100', colorTexto: 'text-sky-600',Icono: ArrowUpRight   },
};

interface HistorialMovimientosProps {
  inversionId: string;
  // Permite recargar desde afuera (cuando se registra un nuevo movimiento)
  recargarClave?: number;
}

const HistorialMovimientos: React.FC<HistorialMovimientosProps> = ({
  inversionId,
  recargarClave = 0,
}) => {
  const [movimientos, setMovimientos] = useState<HistorialMovimiento[]>([]);
  const [cargando, setCargando]       = useState(true);
  const [error, setError]             = useState<string | null>(null);

  const cargarHistorial = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const datos = await listarHistorial(inversionId);
      setMovimientos(datos);
    } catch {
      setError('No se pudo cargar el historial.');
    } finally {
      setCargando(false);
    }
  }, [inversionId]);

  useEffect(() => {
    cargarHistorial();
  }, [cargarHistorial, recargarClave]);

  if (cargando) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse flex items-center gap-3 p-3">
            <div className="w-9 h-9 bg-slate-200 rounded-xl" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-slate-200 rounded w-1/3" />
              <div className="h-3 bg-slate-200 rounded w-1/2" />
            </div>
            <div className="h-4 w-20 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={cargarHistorial}
          className="flex items-center gap-1 text-sm text-red-600 hover:underline"
        >
          <RefreshCw size={13} /> Reintentar
        </button>
      </div>
    );
  }

  if (movimientos.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-6">Sin movimientos registrados.</p>
    );
  }

  return (
    <div className="space-y-2">
      {movimientos.map((mov) => {
        const config = configTipo[mov.tipo];
        const fecha  = new Date(mov.fecha_movimiento);
        const periodo =
          mov.periodo_mes && mov.periodo_anio
            ? ` · ${MESES[mov.periodo_mes - 1]} ${mov.periodo_anio}`
            : '';

        return (
          <div
            key={mov.id}
            className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
          >
            {/* Ícono */}
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${config.color}`}>
              <config.Icono size={16} className={config.colorTexto} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${config.colorTexto}`}>
                {config.etiqueta}{periodo}
              </p>
              <p className="text-xs text-slate-400">
                {fecha.toLocaleDateString('es-MX', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })}
                {mov.forma_pago && ` · ${mov.forma_pago}`}
              </p>
              {mov.notas && (
                <p className="text-xs text-slate-500 mt-0.5 truncate">{mov.notas}</p>
              )}
            </div>

            {/* Monto */}
            <p className={`text-sm font-bold shrink-0 ${config.colorTexto}`}>
              {mov.tipo === 'retiro_capital' ? '−' : '+'}{formatearMoneda(mov.monto)}
            </p>
          </div>
        );
      })}
    </div>
  );
};

export default HistorialMovimientos;
