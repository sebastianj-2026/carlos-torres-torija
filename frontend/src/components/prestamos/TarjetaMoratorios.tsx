import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { MoratorioPrestamo } from '../../types/prestamo.types';
import { calcularMoratorio } from '../../services/prestamosService';
import { useAuth } from '../../context/AuthContext';

const fmt = (valor: string | number): string =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(
    typeof valor === 'string' ? parseFloat(valor) : valor
  );

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

interface TarjetaMoratoriosProps {
  prestamoId: string;
  moratorios: MoratorioPrestamo[];
  onPerdonar: (moratorio: MoratorioPrestamo) => void;
  onRecalculado: () => void;
}

const TarjetaMoratorios: React.FC<TarjetaMoratoriosProps> = ({
  prestamoId,
  moratorios,
  onPerdonar,
  onRecalculado,
}) => {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === 'administrador';
  const [calculando, setCalculando] = useState(false);
  const [errorCalculo, setErrorCalculo] = useState<string | null>(null);

  const pendientes = moratorios.filter((m) => !m.perdonado && parseFloat(m.monto_cobrado) < parseFloat(m.monto_calculado));

  const handleCalcular = async () => {
    setCalculando(true);
    setErrorCalculo(null);
    try {
      await calcularMoratorio(prestamoId);
      onRecalculado();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { mensaje?: string } } };
      setErrorCalculo(axiosError?.response?.data?.mensaje ?? 'Error al calcular el moratorio.');
    } finally {
      setCalculando(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Botón calcular moratorio */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {pendientes.length > 0
            ? `${pendientes.length} moratorio(s) pendiente(s)`
            : 'Sin moratorios pendientes'}
        </p>
        <button
          onClick={handleCalcular}
          disabled={calculando}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                     border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50
                     disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={12} className={calculando ? 'animate-spin' : ''} />
          Calcular mes actual
        </button>
      </div>

      {errorCalculo && (
        <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">{errorCalculo}</p>
      )}

      {moratorios.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">Sin moratorios registrados.</p>
      ) : (
        <div className="space-y-2">
          {moratorios.map((m) => {
            const esPendiente = !m.perdonado && parseFloat(m.monto_cobrado) < parseFloat(m.monto_calculado);
            const periodo = m.mes_atraso && m.anio_atraso
              ? `${MESES[m.mes_atraso - 1]} ${m.anio_atraso}`
              : '—';

            return (
              <div
                key={m.id}
                className={`flex items-start gap-3 p-3 rounded-xl border ${
                  m.perdonado
                    ? 'border-green-100 bg-green-50'
                    : esPendiente
                    ? 'border-red-100 bg-red-50'
                    : 'border-slate-100 bg-slate-50'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  m.perdonado ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {m.perdonado
                    ? <CheckCircle size={14} className="text-green-600" />
                    : <AlertTriangle size={14} className="text-red-500" />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700">{periodo}</p>
                  <p className="text-xs text-slate-500">
                    Calculado: {fmt(m.monto_calculado)}
                    {m.perdonado && ' · Perdonado'}
                  </p>
                </div>

                {esAdmin && esPendiente && (
                  <button
                    onClick={() => onPerdonar(m)}
                    className="text-xs font-medium text-red-600 hover:text-red-800
                               px-2 py-1 rounded-lg hover:bg-red-100 transition-colors shrink-0"
                  >
                    Perdonar
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TarjetaMoratorios;
