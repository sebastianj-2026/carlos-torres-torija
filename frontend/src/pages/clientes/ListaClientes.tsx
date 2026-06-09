import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PaginacionClientes, FiltrosClientes, StatsClientes } from '../../types/cliente.types';
import { listarClientes, obtenerStatsClientes } from '../../services/clientesService';
import TablaClientes from '../../components/clientes/TablaClientes';
import BuscadorClientes from '../../components/clientes/BuscadorClientes';

const FILTROS_INICIALES: FiltrosClientes = {
  buscar: '',
  estatus: '',
  pagina: 1,
  limite: 20,
};

interface StatCard {
  label: string;
  value: number | undefined;
  color: string;
  icon: React.ReactNode;
}

const StatCardItem: React.FC<StatCard> = ({ label, value, color, icon }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 flex items-center gap-4">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-2xl font-bold text-slate-800 leading-none">
        {value ?? <span className="w-8 h-5 bg-slate-100 rounded animate-pulse inline-block" />}
      </p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  </div>
);

const ListaClientes: React.FC = () => {
  const navigate = useNavigate();
  const [filtros, setFiltros] = useState<FiltrosClientes>(FILTROS_INICIALES);
  const [datos, setDatos] = useState<PaginacionClientes>({
    clientes: [],
    total: 0,
    pagina: 1,
    limite: 20,
    totalPaginas: 0,
  });
  const [stats, setStats] = useState<StatsClientes | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    obtenerStatsClientes().then(setStats).catch((err) => { console.error(err); });
  }, []);

  // Debounce para la búsqueda en tiempo real
  const [buscarDebounced, setBuscarDebounced] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setBuscarDebounced(filtros.buscar);
    }, 350);
    return () => clearTimeout(timer);
  }, [filtros.buscar]);

  const cargarClientes = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const resultado = await listarClientes({
        buscar: buscarDebounced,
        estatus: filtros.estatus,
        pagina: filtros.pagina,
        limite: filtros.limite,
      });
      setDatos(resultado);
    } catch {
      setError('No se pudo cargar la lista de clientes.');
    } finally {
      setCargando(false);
    }
  }, [buscarDebounced, filtros.estatus, filtros.pagina, filtros.limite]);

  useEffect(() => {
    cargarClientes();
  }, [cargarClientes]);

  const handleFiltroChange = (cambios: Partial<FiltrosClientes>) => {
    setFiltros((prev) => ({ ...prev, ...cambios }));
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Encabezado de página */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Clientes</h2>
            <p className="text-slate-500 mt-0.5 text-sm">
              {datos.total > 0
                ? `${datos.total} cliente${datos.total !== 1 ? 's' : ''} registrado${datos.total !== 1 ? 's' : ''}`
                : 'Gestión de expedientes de clientes'}
            </p>
          </div>
          <button
            onClick={() => navigate('/clientes/nuevo')}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600
                       text-white text-sm font-medium rounded-xl shadow-sm shadow-orange-500/25
                       transition-colors duration-150 self-start sm:self-auto"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Cliente
          </button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          <StatCardItem
            label="Total clientes"
            value={stats?.total}
            color="bg-slate-100"
            icon={<svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          />
          <StatCardItem
            label="Con préstamo vigente"
            value={stats?.con_prestamo_vigente}
            color="bg-green-100"
            icon={<svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <StatCardItem
            label="Inactivos"
            value={stats?.inactivos}
            color="bg-slate-100"
            icon={<svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>}
          />
          <StatCardItem
            label="En juicio"
            value={stats?.en_juicio}
            color="bg-red-100"
            icon={<svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>}
          />
          <StatCardItem
            label="Negociados"
            value={stats?.negociados}
            color="bg-blue-100"
            icon={<svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>}
          />
        </div>

        {/* Buscador y filtros */}
        <div className="mb-5">
          <BuscadorClientes filtros={filtros} onChange={handleFiltroChange} />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-3">
            <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={cargarClientes}
              className="ml-auto text-sm text-red-600 underline hover:no-underline"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Tabla */}
        <TablaClientes
          datos={datos}
          cargando={cargando}
          onCambiarPagina={(p) => handleFiltroChange({ pagina: p })}
        />
    </div>
  );
};

export default ListaClientes;
