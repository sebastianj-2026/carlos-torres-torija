import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Gavel, Search, AlertTriangle, Calendar, User, DollarSign,
  Building2, Clock, ChevronRight, RefreshCw,
} from 'lucide-react';
import { JuicioResumen, ETIQUETAS_ETAPA, COLORES_ETAPA, EtapaProcesal } from '../../types/juicio.types';
import { listarJuicios } from '../../services/juiciosService';

const fmt = (v: string | number | null | undefined): string => {
  if (v === null || v === undefined) return '—';
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(
    typeof v === 'string' ? parseFloat(v) : v
  );
};

const fmtFecha = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

interface AlertaFechaCritica {
  texto: string;
  clase: string;
  icono: React.ReactNode;
}

const calcularAlerta = (fecha: string | null): AlertaFechaCritica | null => {
  if (!fecha) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const objetivo = new Date(fecha + 'T12:00:00');
  const diff = Math.ceil((objetivo.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

  if (diff < 0) {
    return {
      texto: `VENCIDA hace ${Math.abs(diff)} día${Math.abs(diff) !== 1 ? 's' : ''}`,
      clase: 'bg-red-600 text-white',
      icono: <AlertTriangle size={12} />,
    };
  }
  if (diff === 0) {
    return { texto: 'HOY', clase: 'bg-red-500 text-white', icono: <AlertTriangle size={12} /> };
  }
  if (diff <= 7) {
    return {
      texto: `en ${diff} día${diff !== 1 ? 's' : ''}`,
      clase: 'bg-sky-100 text-sky-700 border border-sky-200',
      icono: <AlertTriangle size={12} />,
    };
  }
  if (diff <= 30) {
    return {
      texto: fmtFecha(fecha),
      clase: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
      icono: <Calendar size={12} />,
    };
  }
  return {
    texto: fmtFecha(fecha),
    clase: 'bg-green-100 text-green-700 border border-green-200',
    icono: <Calendar size={12} />,
  };
};

const TarjetaJuicio: React.FC<{ juicio: JuicioResumen; onClick: () => void }> = ({
  juicio,
  onClick,
}) => {
  const alerta = calcularAlerta(juicio.proxima_fecha_critica);

  return (
    <article
      onClick={onClick}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md
                 hover:border-sky-200 transition-all duration-200 cursor-pointer overflow-hidden group"
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-slate-100">
        <div className="flex items-start justify-between gap-3 mb-2">
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
            COLORES_ETAPA[juicio.etapa_procesal as EtapaProcesal] ?? 'bg-slate-100 text-slate-600'
          }`}>
            <Gavel size={11} />
            {ETIQUETAS_ETAPA[juicio.etapa_procesal as EtapaProcesal] ?? juicio.etapa_procesal}
          </span>

          {alerta && (
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${alerta.clase}`}>
              {alerta.icono}
              {alerta.texto}
            </span>
          )}
        </div>

        <h3 className="text-lg font-bold text-slate-800 leading-snug group-hover:text-sky-600
                       transition-colors">
          {juicio.cliente_nombre}
        </h3>
        {juicio.folio && (
          <p className="text-xs text-slate-400 mt-0.5 font-mono">{juicio.folio}</p>
        )}

        {juicio.descripcion_fecha_critica && (
          <p className="text-xs text-slate-500 mt-1 italic">{juicio.descripcion_fecha_critica}</p>
        )}
      </div>

      {/* Financial grid */}
      <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
        <div className="px-5 py-3">
          <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1">
            <DollarSign size={11} /> Deuda total
          </p>
          <p className="text-lg font-black text-red-600 leading-none">
            {fmt(juicio.deuda_total)}
          </p>
          {parseFloat(juicio.total_gastos_legales) > 0 && (
            <p className="text-xs text-slate-400 mt-0.5">
              + {fmt(juicio.total_gastos_legales)} gastos leg.
            </p>
          )}
        </div>
        <div className="px-5 py-3">
          <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1">
            <Building2 size={11} /> Valor propiedad
          </p>
          <p className="text-base font-bold text-slate-700 leading-none">
            {juicio.valor_propiedad ? fmt(juicio.valor_propiedad) : '—'}
          </p>
        </div>
      </div>

      {/* Lawyer + dates */}
      <div className="px-5 py-4 space-y-2.5">
        <div className="flex items-center gap-2">
          <User size={14} className="text-slate-400 shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="text-sm font-medium text-slate-700 truncate block">
              {juicio.abogado_nombre ?? <span className="text-slate-400 italic">Sin abogado asignado</span>}
            </span>
          </div>
          {juicio.fecha_asignacion_abogado && (
            <span className="text-xs text-slate-400 shrink-0">
              {fmtFecha(juicio.fecha_asignacion_abogado)}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Calendar size={12} className="text-slate-300" />
            <span>Inicio: <span className="font-medium text-slate-600">{fmtFecha(juicio.fecha_inicio)}</span></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={12} className="text-slate-300" />
            <span>Último pago: <span className="font-medium text-slate-600">{fmtFecha(juicio.fecha_ultimo_pago)}</span></span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 pb-4 flex justify-end">
        <span className="text-xs text-sky-500 font-medium flex items-center gap-1
                         group-hover:gap-2 transition-all duration-150">
          Ver expediente <ChevronRight size={13} />
        </span>
      </div>
    </article>
  );
};

const ListaJuicios: React.FC = () => {
  const navigate = useNavigate();
  const [juicios, setJuicios]     = useState<JuicioResumen[]>([]);
  const [total, setTotal]         = useState(0);
  const [cargando, setCargando]   = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [buscar, setBuscar]       = useState('');
  const [pagina, setPagina]       = useState(1);
  const limite = 12;

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await listarJuicios({ buscar, pagina, limite });
      setJuicios(data.juicios);
      setTotal(data.total);
    } catch {
      setError('No se pudieron cargar los juicios.');
    } finally {
      setCargando(false);
    }
  }, [buscar, pagina]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    setPagina(1);
    cargar();
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Gavel size={22} className="text-sky-500" />
            Juicios — Recuperación Legal
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {total} expediente{total !== 1 ? 's' : ''} activo{total !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={cargar}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600
                     bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RefreshCw size={14} className={cargando ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleBuscar} className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            placeholder="Buscar cliente, folio, abogado..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-sky-500 text-white text-sm font-medium rounded-lg
                     hover:bg-sky-600 transition-colors"
        >
          Buscar
        </button>
      </form>

      {/* Content */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {cargando ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 h-64 animate-pulse" />
          ))}
        </div>
      ) : juicios.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <Gavel size={28} className="text-slate-400" />
          </div>
          <p className="text-slate-500 font-medium">No hay juicios activos</p>
          <p className="text-slate-400 text-sm mt-1">
            Los juicios se crean automáticamente cuando un préstamo cambia a estatus "En juicio"
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {juicios.map((j) => (
              <TarjetaJuicio
                key={j.id}
                juicio={j}
                onClick={() => navigate(`/juicios/${j.id}`)}
              />
            ))}
          </div>

          {/* Pagination */}
          {total > limite && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina === 1}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40
                           hover:bg-slate-50 transition-colors"
              >
                Anterior
              </button>
              <span className="text-sm text-slate-500">
                Página {pagina} de {Math.ceil(total / limite)}
              </span>
              <button
                onClick={() => setPagina((p) => p + 1)}
                disabled={pagina >= Math.ceil(total / limite)}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40
                           hover:bg-slate-50 transition-colors"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ListaJuicios;
