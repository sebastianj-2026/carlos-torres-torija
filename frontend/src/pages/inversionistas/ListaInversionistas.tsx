import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { logError } from '../../utils/logError';
import { Plus, Search, X, Users, UserPlus, DollarSign, TrendingUp, Upload } from 'lucide-react';
import { PaginacionInversionistas, FiltrosInversionistas, StatsInversionistas } from '../../types/inversionista.types';
import { listarInversionistas, obtenerStatsInversionistas } from '../../services/inversionistasService';
import TablaInversionistas from '../../components/inversionistas/TablaInversionistas';

const FILTROS_INICIALES: FiltrosInversionistas = {
  buscar:     '',
  orden:      '',
  pagina:     1,
  limite:     20,
};

const DATOS_INICIALES: PaginacionInversionistas = {
  inversionistas: [],
  total:          0,
  pagina:         1,
  limite:         20,
  totalPaginas:   0,
};

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);

const ListaInversionistas: React.FC = () => {
  const navigate  = useNavigate();
  const [filtros, setFiltros]                 = useState<FiltrosInversionistas>(FILTROS_INICIALES);
  const [datos, setDatos]                     = useState<PaginacionInversionistas>(DATOS_INICIALES);
  const [cargando, setCargando]               = useState(true);
  const [error, setError]                     = useState<string | null>(null);
  const [buscarDebounced, setBuscarDebounced] = useState('');
  const [stats, setStats]                     = useState<StatsInversionistas | null>(null);

  useEffect(() => {
    obtenerStatsInversionistas().then(setStats).catch(logError);
  }, []);

  // Debounce del campo buscar (350ms)
  useEffect(() => {
    const timer = setTimeout(() => setBuscarDebounced(filtros.buscar), 350);
    return () => clearTimeout(timer);
  }, [filtros.buscar]);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const resultado = await listarInversionistas({
        buscar:     buscarDebounced,
        orden:      filtros.orden,
        pagina:     filtros.pagina,
        limite:     filtros.limite,
      });
      setDatos(resultado);
    } catch {
      setError('No se pudo cargar la lista de inversionistas.');
    } finally {
      setCargando(false);
    }
  }, [buscarDebounced, filtros.orden, filtros.pagina, filtros.limite]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleFiltro = (cambios: Partial<FiltrosInversionistas>) => {
    setFiltros((prev) => ({ ...prev, ...cambios, pagina: 1 }));
  };

  const limpiarFiltros = () => setFiltros(FILTROS_INICIALES);

  const hayFiltrosActivos = filtros.buscar || filtros.orden;

  return (
    <div className="p-6 lg:p-8">
      {/* Encabezado de página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Inversionistas</h2>
          <p className="text-slate-500 mt-0.5 text-sm">
            {datos.total > 0
              ? `${datos.total} inversionista${datos.total !== 1 ? 's' : ''} registrado${datos.total !== 1 ? 's' : ''}`
              : 'Gestión de inversionistas y sus inversiones'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/inversionistas/importar')}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200
                       text-slate-700 text-sm font-medium rounded-xl transition-colors"
          >
            <Upload size={16} />
            Importar
          </button>
          <button
            onClick={() => navigate('/inversionistas/nuevo')}
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-600
                       text-white text-sm font-medium rounded-xl shadow-sm shadow-sky-500/25
                       transition-colors"
          >
            <Plus size={16} />
            Nuevo inversionista
          </button>
        </div>
      </div>

      {/* Cards de estadísticas */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-slate-100 p-3 sm:p-4 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
              <Users size={18} className="text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Total inversionistas</p>
              <p className="text-xl font-bold text-slate-800">{stats.total_inversionistas}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-3 sm:p-4 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
              <UserPlus size={18} className="text-green-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Nuevos este mes</p>
              <p className="text-xl font-bold text-slate-800">{stats.nuevos_este_mes}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-3 sm:p-4 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center shrink-0">
              <DollarSign size={18} className="text-sky-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Capital manejado</p>
              <p className="text-xl font-bold text-slate-800">{fmt(stats.capital_total_manejado)}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-3 sm:p-4 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
              <TrendingUp size={18} className="text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Intereses pagados</p>
              <p className="text-xl font-bold text-slate-800">{fmt(stats.intereses_pagados_total)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Barra de búsqueda y filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        {/* Búsqueda */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filtros.buscar}
            onChange={(e) => handleFiltro({ buscar: e.target.value })}
            placeholder="Buscar por nombre, teléfono o correo..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl
                       focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent
                       bg-white"
          />
        </div>

        {/* Limpiar filtros */}
        {hayFiltrosActivos && (
          <button
            onClick={limpiarFiltros}
            className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-slate-500
                       border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors bg-white"
          >
            <X size={14} />
            Limpiar
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-600 flex-1">{error}</p>
          <button onClick={cargarDatos} className="text-sm text-red-600 underline hover:no-underline">
            Reintentar
          </button>
        </div>
      )}

      {/* Tabla */}
      <TablaInversionistas
        datos={datos}
        cargando={cargando}
        orden={filtros.orden}
        onOrdenar={(o) => handleFiltro({ orden: o })}
        onCambiarPagina={(p) => setFiltros((prev) => ({ ...prev, pagina: p }))}
      />
    </div>
  );
};

export default ListaInversionistas;
