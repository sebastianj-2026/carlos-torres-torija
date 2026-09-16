import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { logError } from '../../utils/logError';
import { Plus, Search, X, Users, UserPlus, DollarSign, TrendingUp, Upload, UserCog } from 'lucide-react';
import { StatsInversionistas } from '../../types/inversionista.types';
import { obtenerStatsInversionistas } from '../../services/inversionistasService';
import { PersonaLista } from '../../types/referenciador.types';
import {
  listarPersonasTresFormas,
  darDeBajaReferenciador,
} from '../../services/referenciadoresService';
import TablaReferenciadores from '../../components/referenciadores/TablaReferenciadores';

// M45 (FLUJOS §1): los referenciadores viven DENTRO de Inversionistas.
// Esta es la lista combinada de las tres formas de ganar, con un solo menú.

const POR_PAGINA = 20;

// Filtro principal. Inversionistas = formas 1+2 · Referenciadores = formas 2+3.
type FiltroLista = 'todos' | 'inversionistas' | 'referenciadores';
const FILTROS: { valor: FiltroLista; etiqueta: string }[] = [
  { valor: 'todos',           etiqueta: 'Todos' },
  { valor: 'inversionistas',  etiqueta: 'Inversionistas' },
  { valor: 'referenciadores', etiqueta: 'Referenciadores' },
];
const pasaFiltro = (p: PersonaLista, f: FiltroLista): boolean =>
  f === 'todos' || (f === 'inversionistas' ? p.forma !== 3 : p.forma !== 1);

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);

// Compara dos NUMERIC no negativos como string, sin pasar por float.
const compararNumeric = (x: string, y: string): number => {
  const [xi, xd = ''] = x.split('.');
  const [yi, yd = ''] = y.split('.');
  if (xi.length !== yi.length) return xi.length - yi.length;
  if (xi !== yi) return xi < yi ? -1 : 1;
  const dx = xd.padEnd(6, '0');
  const dy = yd.padEnd(6, '0');
  return dx === dy ? 0 : dx < dy ? -1 : 1;
};

// Orden por defecto: *se le debe* descendente — lo que urge, arriba.
// null (motor pendiente) empata: el sort estable conserva el alfabético.
const porDeudaDesc = (a: PersonaLista, b: PersonaLista): number => {
  if (a.se_le_debe === null && b.se_le_debe === null) return 0;
  if (a.se_le_debe === null) return 1;
  if (b.se_le_debe === null) return -1;
  return compararNumeric(b.se_le_debe, a.se_le_debe);
};

const ListaInversionistas: React.FC = () => {
  const navigate = useNavigate();
  const [personas, setPersonas]   = useState<PersonaLista[]>([]);
  const [cargando, setCargando]   = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [buscar, setBuscar]       = useState('');
  const [buscarDebounced, setBuscarDebounced] = useState('');
  const [filtro, setFiltro]       = useState<FiltroLista>('todos');
  const [pagina, setPagina]       = useState(1);
  const [stats, setStats]         = useState<StatsInversionistas | null>(null);

  useEffect(() => {
    obtenerStatsInversionistas().then(setStats).catch(logError);
  }, []);

  // Debounce del campo buscar (350ms)
  useEffect(() => {
    const timer = setTimeout(() => setBuscarDebounced(buscar), 350);
    return () => clearTimeout(timer);
  }, [buscar]);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setPersonas(await listarPersonasTresFormas());
    } catch {
      setError('No se pudo cargar la lista de inversionistas.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Filtro, búsqueda y paginación en el cliente: la lista combinada
  // de las tres formas no existe como endpoint (decisión de M3/M5).
  const filtradas = useMemo(() => {
    const texto = buscarDebounced.trim().toLowerCase();
    return personas
      .filter((p) => {
        if (!pasaFiltro(p, filtro)) return false;
        if (!texto) return true;
        const nombre = `${p.nombres} ${p.apellido_paterno} ${p.apellido_materno ?? ''}`.toLowerCase();
        return (
          nombre.includes(texto) ||
          (p.telefono ?? '').toLowerCase().includes(texto) ||
          (p.correo ?? '').toLowerCase().includes(texto)
        );
      })
      .sort(porDeudaDesc);
  }, [personas, filtro, buscarDebounced]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = filtradas.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  const handleBaja = async (id: string) => {
    try {
      await darDeBajaReferenciador(id);
      await cargarDatos();
    } catch {
      setError('No se pudo dar de baja al referenciador.');
    }
  };

  const hayFiltrosActivos = buscar || filtro !== 'todos';

  return (
    <div className="p-6 lg:p-8">
      {/* Encabezado de página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Inversionistas</h2>
          <p className="text-slate-500 mt-0.5 text-sm">
            {filtradas.length > 0
              ? `${filtradas.length} persona${filtradas.length !== 1 ? 's' : ''}`
              : 'Inversionistas y referenciadores — quién aporta capital, quién trae gente, o ambos'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => navigate('/inversionistas/importar')}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200
                       text-slate-700 text-sm font-medium rounded-xl transition-colors"
          >
            <Upload size={16} />
            Importar
          </button>
          <button
            onClick={() => navigate('/referenciadores/nuevo')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50
                       text-slate-700 text-sm font-medium rounded-xl transition-colors"
          >
            <UserCog size={16} />
            Nuevo referenciador
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

      {/* Cards de estadísticas (legacy, se conservan) */}
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

      {/* Filtro principal — Todos / Inversionistas / Referenciadores. Lo primero que se ve. */}
      <div className="flex flex-wrap gap-2 mb-4">
        {FILTROS.map((f) => {
          const activo = filtro === f.valor;
          return (
            <button
              key={f.valor}
              onClick={() => { setFiltro(f.valor); setPagina(1); }}
              className={`px-3.5 py-2 text-sm font-medium rounded-xl border transition-colors ${
                activo
                  ? 'bg-sky-500 border-sky-500 text-white shadow-sm shadow-sky-500/25'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f.etiqueta}
            </button>
          );
        })}
      </div>

      {/* Búsqueda */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={buscar}
            onChange={(e) => { setBuscar(e.target.value); setPagina(1); }}
            placeholder="Buscar por nombre, teléfono o correo..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl
                       focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent bg-white"
          />
        </div>
        {hayFiltrosActivos && (
          <button
            onClick={() => { setBuscar(''); setFiltro('todos'); setPagina(1); }}
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
          <p className="text-sm text-red-600 flex-1">{error}</p>
          <button onClick={cargarDatos} className="text-sm text-red-600 underline hover:no-underline">
            Reintentar
          </button>
        </div>
      )}

      {/* Lista combinada */}
      <TablaReferenciadores
        personas={visibles}
        total={filtradas.length}
        pagina={paginaActual}
        limite={POR_PAGINA}
        totalPaginas={totalPaginas}
        cargando={cargando}
        onCambiarPagina={setPagina}
        onDarDeBaja={handleBaja}
      />
    </div>
  );
};

export default ListaInversionistas;
