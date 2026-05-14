import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { MoratorioPrestamo } from '../../types/prestamo.types';
import { perdonarMoratorio } from '../../services/prestamosService';

const fmt = (valor: string | number): string =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(
    typeof valor === 'string' ? parseFloat(valor) : valor
  );

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

interface ModalPerdonarMoratorioProps {
  moratorio: MoratorioPrestamo;
  onCerrar: () => void;
  onExito: () => void;
}

const ModalPerdonarMoratorio: React.FC<ModalPerdonarMoratorioProps> = ({
  moratorio,
  onCerrar,
  onExito,
}) => {
  const [perdonando, setPerdonando] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const periodo = moratorio.mes_atraso && moratorio.anio_atraso
    ? `${MESES[moratorio.mes_atraso - 1]} ${moratorio.anio_atraso}`
    : 'sin fecha';

  const handlePerdonar = async () => {
    setPerdonando(true);
    setError(null);
    try {
      await perdonarMoratorio(moratorio.id);
      onExito();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { mensaje?: string } } };
      setError(axiosError?.response?.data?.mensaje ?? 'Error al perdonar el moratorio.');
    } finally {
      setPerdonando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Perdonar Moratorio</h2>
          <button onClick={onCerrar} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
              <AlertTriangle size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-800">Moratorio de {periodo}</p>
              <p className="text-lg font-bold text-amber-700">{fmt(moratorio.monto_calculado)}</p>
              <p className="text-xs text-amber-600">Esta acción no se puede deshacer.</p>
            </div>
          </div>

          <p className="text-sm text-slate-600">
            ¿Confirmas que deseas perdonar este moratorio? El monto{' '}
            <strong>{fmt(moratorio.monto_calculado)}</strong> correspondiente a{' '}
            <strong>{periodo}</strong> quedará como perdonado.
          </p>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onCerrar}
            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200
                       rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handlePerdonar}
            disabled={perdonando}
            className="px-5 py-2 text-sm font-medium bg-amber-500 text-white rounded-xl
                       hover:bg-amber-600 transition-colors disabled:opacity-60"
          >
            {perdonando ? 'Perdonando...' : 'Confirmar perdón'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalPerdonarMoratorio;
