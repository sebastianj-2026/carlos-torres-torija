import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { PersonaLista, FiltroForma } from '../../types/referenciador.types';
import {
  listarPersonasTresFormas,
  darDeBajaReferenciador,
} from '../../services/referenciadoresService';
import TablaReferenciadores from '../../components/referenciadores/TablaReferenciadores';

const POR_PAGINA = 20;

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
// null (motor pendiente, M12) empata: el sort estable conserva el alfabético.
const porDeudaDesc = (a: PersonaLista, b: PersonaLista): number => {
  if (a.se_le_debe === null && b.se_le_debe === null) return 0;
  if (a.se_le_debe === null) return 1;
  if (b.se_le_debe === null) return -1;
  return compararNumeric(b.se_le_debe, a.se_le_debe);
};

// Filtro principal — las tres formas de ganar. Lo primero que se ve.
const FORMAS: { valor: FiltroForma; etiqueta: string }[] = [
  { valor: '',  etiqueta: 'Todos' },
  { valor: '1', etiqueta: 'Solo inversionista' },
  { valor: '2', etiqueta: 'Inversionista y referenciador' },
  { valor: '3', etiqueta: 'Solo referenciador' },
];

const ListaReferenciadores: React.FC = () => {
  const [personas, setPersonas]   = useState<PersonaLista[]>([]);
  const [cargando, setCargando]   = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [buscar, setBuscar]       = useState('');
  const [buscarDebounced, setBuscarDebounced] = useState('');
  const [forma, setForma]         = useState<FiltroForma>('');
  const [pagina, setPagina]       = useState(1);

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
      setError('No se pudo cargar la lista de referenciadores.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Filtro, búsqueda y paginación en el cliente: la lista combinada
  // de las tres formas no existe como endpoint (decisión de M3).
  const filtradas = useMemo(() => {
    const texto = buscarDebounced.trim().toLowerCase();
    return personas
      .filter((p) => {
        if (forma && p.forma !== Number(forma)) return false;
        if (!texto) return true;
        const nombre = `${p.nombres} ${p.apellido_paterno} ${p.apellido_materno ?? ''}`.toLowerCase();
        return (
          nombre.includes(texto) ||
          (p.telefono ?? '').toLowerCase().includes(texto) ||
          (p.correo ?? '').toLowerCase().includes(texto)
        );
      })
      .sort(porDeudaDesc);
  }, [personas, forma, buscarDebounced]);

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

  const hayFiltrosActivos = buscar || forma;

  return (
    <div className="p-6 lg:p-8">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Referenciadores</h2>
          <p className="text-slate-500 mt-0.5 text-sm">
            {filtradas.length > 0
              ? `${filtradas.length} persona${filtradas.length !== 1 ? 's' : ''}`
              : 'Quién trajo a quién, con o sin capital propio'}
          </p>
        </div>
        {/* El formulario de alta llega en M22; mientras, el botón se ve pero no navega. */}
        <button
          disabled
          title="Pendiente: formulario de alta de referenciador (M22)"
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-200 text-slate-400
                     text-sm font-medium rounded-xl cursor-not-allowed self-start"
        >
          <Plus size={16} />
          Nuevo referenciador
        </button>
      </div>

      {/* Filtro principal — las tres formas de ganar. Lo primero que se ve. */}
      <div className="flex flex-wrap gap-2 mb-4">
        {FORMAS.map((f) => {
          const activo = forma === f.valor;
          return (
            <button
              key={f.valor || 'todos'}
              onClick={() => { setForma(f.valor); setPagina(1); }}
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
            onClick={() => { setBuscar(''); setForma(''); setPagina(1); }}
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

      {/* Lista */}
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

export default ListaReferenciadores;
