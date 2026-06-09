import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, X, GitCompare } from 'lucide-react';
import {
  PaginacionPrestamos,
  FiltrosPrestamos,
  EstatusPrestamo,
  CampoOrden,
  StatsPrestamos,
} from '../../types/prestamo.types';
import { listarPrestamos, obtenerStatsPrestamos, sincronizarEstatusPrestamos } from '../../services/prestamosService';
import TablaPrestamos from '../../components/prestamos/TablaPrestamos';

const fmt = (v: number): string =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v);

const fmtPct = (v: number): string => `${v.toFixed(2)}%`;

const FILTROS_INICIALES: FiltrosPrestamos = {
  buscar:     '',
  estatus:    '',
  pagina:     1,
  limite:     20,
  ordenarPor: 'cliente_nombre',
  direccion:  'asc',
};

const DATOS_INICIALES: PaginacionPrestamos = {
  prestamos: [], total: 0, pagina: 1, limite: 20, totalPaginas: 0,
};

const FILTROS_ESTATUS: { valor: EstatusPrestamo | ''; etiqueta: string; color: string }[] = [
  { valor: '',          etiqueta: 'Todos',     color: 'bg-slate-100 text-slate-600 hover:bg-slate-200'       },
  { valor: 'activo',    etiqueta: 'Activo',    color: 'bg-green-100 text-green-700 hover:bg-green-200'       },
  { valor: 'atrasado',  etiqueta: 'Atrasado',  color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'   },
  { valor: 'en_juicio', etiqueta: 'En juicio', color: 'bg-red-100 text-red-700 hover:bg-red-200'             },
  { valor: 'liquidado', etiqueta: 'Liquidado', color: 'bg-slate-100 text-slate-500 hover:bg-slate-200'       },
];

interface KpiCardProps {
  label: string;
  value: string | undefined;
  sub?: string;
  danger?: boolean;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, sub, danger }) => (
  <div className={`bg-white rounded-2xl border shadow-sm px-4 py-3.5 ${danger ? 'border-red-200' : 'border-slate-100'}`}>
    <p className="text-xs text-slate-400 mb-1">{label}</p>
    {value !== undefined
      ? <p className={`text-xl font-bold leading-tight ${danger ? 'text-red-600' : 'text-slate-800'}`}>{value}</p>
      : <div className="h-6 w-24 bg-slate-100 rounded animate-pulse" />}
    {sub && value !== undefined && (
      <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
    )}
  </div>
);

const ListaPrestamos: React.FC = () => {
  const navigate = useNavigate();
  const [filtros, setFiltros]                 = useState<FiltrosPrestamos>(FILTROS_INICIALES);
  const [datos, setDatos]                     = useState<PaginacionPrestamos>(DATOS_INICIALES);
  const [stats, setStats]                     = useState<StatsPrestamos | null>(null);
  const [cargando, setCargando]               = useState(true);
  const [error, setError]                     = useState<string | null>(null);
  const [buscarDebounced, setBuscarDebounced] = useState('');

  useEffect(() => {
    sincronizarEstatusPrestamos().catch(() => null);
    obtenerStatsPrestamos().then(setStats).catch(() => null);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setBuscarDebounced(filtros.buscar), 350);
    return () => clearTimeout(timer);
  }, [filtros.buscar]);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await listarPrestamos({ ...filtros, buscar: buscarDebounced });
      setDatos(res);
    } catch {
      setError('No se pudo cargar la lista de préstamos.');
    } finally {
      setCargando(false);
    }
  }, [filtros, buscarDebounced]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const actualizarFiltro = <K extends keyof FiltrosPrestamos>(campo: K, valor: FiltrosPrestamos[K]) =>
    setFiltros((prev) => ({ ...prev, [campo]: valor, pagina: 1 }));

  const handleOrdenar = (campo: CampoOrden) => {
    setFiltros((prev) => ({
      ...prev,
      ordenarPor: campo,
      direccion: prev.ordenarPor === campo && prev.direccion === 'asc' ? 'desc' : 'asc',
      pagina: 1,
    }));
  };

  const hayFiltros = filtros.buscar !== '' || filtros.estatus !== '';

  return (
    <div className="p-6 lg:p-8 space-y-5">
      {/* Encabezado */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Préstamos</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {cargando ? 'Cargando...' : `${datos.total} préstamo(s) registrado(s)`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/prestamos/auditoria')}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium
                       bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
          >
            <GitCompare size={16} />
            Auditoría vs Excel
          </button>
          <button
            onClick={() => navigate('/prestamos/nuevo')}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium
                       bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors"
          >
            <Plus size={16} />
            Nuevo préstamo
          </button>
        </div>
      </div>

      {/* KPI Cards — 7 indicadores */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <KpiCard
          label="Capital Activo"
          value={stats ? fmt(stats.capital_activo) : undefined}
        />
        <KpiCard
          label="Créditos"
          value={stats ? String(stats.cantidad_creditos) : undefined}
          sub="activos + atrasados"
        />
        <KpiCard
          label="Interés Cobrado (año)"
          value={stats ? fmt(stats.interes_ytd) : undefined}
          sub={`${new Date().getFullYear()}`}
        />
        <KpiCard
          label="Tasa Ponderada"
          value={stats ? fmtPct(stats.tasa_ponderada) : undefined}
          sub="mensual"
        />
        <KpiCard
          label="Int. Mensual Proyectado"
          value={stats ? fmt(stats.interes_proyectado) : undefined}
        />
        <KpiCard
          label="Utilidad Neta Oficina"
          value={stats ? fmt(stats.utilidad_oficina) : undefined}
          sub="mensual"
          danger={!!stats && stats.utilidad_oficina < 0}
        />
        <KpiCard
          label="Cartera Vencida"
          value={stats ? fmt(stats.cartera_vencida) : undefined}
          danger
        />
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Buscador */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-sm bg-white
                        border border-slate-200 rounded-xl px-3 py-2.5 shadow-sm">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            type="text"
            value={filtros.buscar}
            onChange={(e) => actualizarFiltro('buscar', e.target.value)}
            placeholder="Buscar por cliente..."
            className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder-slate-400"
          />
          {filtros.buscar && (
            <button onClick={() => actualizarFiltro('buscar', '')} className="text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filtro visual por estatus */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
          {FILTROS_ESTATUS.map((op) => (
            <button
              key={op.valor}
              onClick={() => actualizarFiltro('estatus', op.valor)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${filtros.estatus === op.valor
                  ? op.valor === ''
                    ? 'bg-slate-700 text-white'
                    : op.color.replace('hover:', '') + ' ring-2 ring-offset-1 ring-current'
                  : op.color}`}
            >
              {op.etiqueta}
              {op.valor !== '' && stats?.por_estatus && (
                <span className="ml-1.5 opacity-60">
                  {stats.por_estatus[op.valor] ?? 0}
                </span>
              )}
            </button>
          ))}
        </div>

        {hayFiltros && (
          <button
            onClick={() => setFiltros(FILTROS_INICIALES)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-500
                       hover:text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <X size={12} />
            Limpiar
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 flex items-center justify-between">
          {error}
          <button onClick={cargarDatos} className="underline hover:no-underline">Reintentar</button>
        </div>
      )}

      {/* Tabla */}
      <TablaPrestamos
        datos={datos}
        cargando={cargando}
        ordenarPor={filtros.ordenarPor}
        direccion={filtros.direccion}
        onOrdenar={handleOrdenar}
        onCambiarPagina={(p) => setFiltros((prev) => ({ ...prev, pagina: p }))}
      />
    </div>
  );
};

export default ListaPrestamos;
