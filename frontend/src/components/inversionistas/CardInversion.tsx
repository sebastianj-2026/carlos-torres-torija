import React from 'react';
import { CalendarDays, TrendingUp, Wallet, FileText, ChevronDown } from 'lucide-react';
import { Inversion, EstatusInversion } from '../../types/inversionista.types';
import { useAuth } from '../../context/AuthContext';

// Formatea número como moneda MXN
const formatearMoneda = (valor: string | number): string => {
  const num = typeof valor === 'string' ? parseFloat(valor) : valor;
  if (isNaN(num)) return '$0.00';
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num);
};

// Badge de estatus con color según valor
const BadgeEstatus: React.FC<{ estatus: EstatusInversion }> = ({ estatus }) => {
  const estilos: Record<EstatusInversion, string> = {
    activo:    'bg-green-100  text-green-700',
    pausado:   'bg-yellow-100 text-yellow-700',
    liquidado: 'bg-slate-100  text-slate-600',
    vencido:   'bg-red-100    text-red-600',
  };
  const etiquetas: Record<EstatusInversion, string> = {
    activo:    'Activo',
    pausado:   'Pausado',
    liquidado: 'Liquidado',
    vencido:   'Vencido',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${estilos[estatus]}`}>
      {etiquetas[estatus]}
    </span>
  );
};

interface CardInversionProps {
  inversion: Inversion;
  onRegistrarPago: (inversion: Inversion) => void;
  onAgregarFondos: (inversion: Inversion) => void;
  onCambiarEstatus?: (inversion: Inversion) => void;
}

const CardInversion: React.FC<CardInversionProps> = ({
  inversion,
  onRegistrarPago,
  onAgregarFondos,
  onCambiarEstatus,
}) => {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === 'administrador';

  const montoActual       = parseFloat(inversion.monto_actual);
  const tasa              = parseFloat(inversion.tasa_interes_mensual);
  const interesCalculado  = parseFloat((montoActual * (tasa / 100)).toFixed(2));
  const esActiva          = inversion.estatus === 'activo';

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-shadow hover:shadow-md
                     ${esActiva ? 'border-slate-100' : 'border-slate-200 opacity-80'}`}>
      {/* Encabezado de la tarjeta */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-slate-50">
        <div>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Inversión</p>
          <p className="text-lg font-bold text-slate-800">{formatearMoneda(montoActual)}</p>
        </div>
        <BadgeEstatus estatus={inversion.estatus} />
      </div>

      {/* Datos de la inversión */}
      <div className="px-5 py-4 grid grid-cols-2 gap-3">
        {/* Tasa de interés */}
        <div className="flex items-start gap-2">
          <TrendingUp size={15} className="text-orange-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-slate-400">Tasa mensual</p>
            <p className="text-sm font-semibold text-slate-700">{tasa}%</p>
          </div>
        </div>

        {/* Interés mensual calculado */}
        <div className="flex items-start gap-2">
          <Wallet size={15} className="text-green-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-slate-400">Interés mensual</p>
            <p className="text-sm font-semibold text-green-600">{formatearMoneda(interesCalculado)}</p>
          </div>
        </div>

        {/* Día de pago */}
        <div className="flex items-start gap-2">
          <CalendarDays size={15} className="text-blue-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-slate-400">Día de pago</p>
            <p className="text-sm font-semibold text-slate-700">
              {inversion.dia_pago ? `Día ${inversion.dia_pago}` : '—'}
            </p>
          </div>
        </div>

        {/* Pagaré */}
        <div className="flex items-start gap-2">
          <FileText size={15} className="text-purple-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-slate-400">Pagaré</p>
            <p className="text-sm font-semibold text-slate-700">
              {inversion.tiene_pagare ? 'Sí' : 'No'}
            </p>
          </div>
        </div>

        {/* Fecha inicio */}
        <div className="col-span-2">
          <p className="text-xs text-slate-400">
            Inicio:{' '}
            <span className="text-slate-600 font-medium">
              {new Date(inversion.fecha_inicio + 'T00:00:00').toLocaleDateString('es-MX', {
                day: '2-digit', month: 'short', year: 'numeric',
              })}
            </span>
            {inversion.fecha_vencimiento && (
              <>
                {' · '}Vence:{' '}
                <span className="text-slate-600 font-medium">
                  {new Date(inversion.fecha_vencimiento + 'T00:00:00').toLocaleDateString('es-MX', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })}
                </span>
              </>
            )}
          </p>
        </div>

        {/* Notas si hay */}
        {inversion.notas && (
          <div className="col-span-2">
            <p className="text-xs text-slate-400 italic">{inversion.notas}</p>
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2 flex-wrap">
        <button
          onClick={() => onRegistrarPago(inversion)}
          disabled={!esActiva}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                     bg-orange-500 text-white hover:bg-orange-600 transition-colors
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Registrar pago
        </button>
        <button
          onClick={() => onAgregarFondos(inversion)}
          disabled={!esActiva}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                     bg-white border border-slate-200 text-slate-700
                     hover:bg-slate-100 transition-colors
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Agregar fondos
        </button>

        {/* Cambiar estatus — solo admin */}
        {esAdmin && onCambiarEstatus && (
          <button
            onClick={() => onCambiarEstatus(inversion)}
            className="ml-auto flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg
                       text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            Estatus
            <ChevronDown size={12} />
          </button>
        )}
      </div>
    </div>
  );
};

export default CardInversion;
