import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { logError } from '../../../utils/logError';
import { Plus, ExternalLink, Edit2, X, Upload } from 'lucide-react';
import { Inmueble, EstatusInmueble } from '../../../types/inmuebles.types';
import { listarInmuebles, crearInmueble, editarInmueble } from '../../../services/inmueblesService';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);

const ESTATUS_BADGE: Record<EstatusInmueble, string> = {
  disponible:      'bg-green-100 text-green-700',
  rentado:         'bg-blue-100 text-blue-700',
  en_mantenimiento:'bg-amber-100 text-amber-700',
  vendido:         'bg-slate-100 text-slate-500',
};

const MESES = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

type FormData = {
  ubicacion_direccion: string;
  ciudad: string;
  estado: string;
  valor_propiedad: string;
  estatus: EstatusInmueble;
  foto_principal_url: string;
  predial_cuenta: string;
  predial_mes_pago: string;
  es_renta_externa: boolean;
  propietario_nombre: string;
  total_locales: string;
};

const FORM_VACIO: FormData = {
  ubicacion_direccion: '', ciudad: '', estado: '', valor_propiedad: '',
  estatus: 'disponible', foto_principal_url: '', predial_cuenta: '', predial_mes_pago: '',
  es_renta_externa: false, propietario_nombre: '', total_locales: '',
};

/* ── Drag-and-drop image picker ── */
const ImagePicker: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const processFile = useCallback((file: File) => {
    if (!file.type.match(/^image\/(png|jpe?g)$/)) return;
    const reader = new FileReader();
    reader.onload = e => onChange(e.target?.result as string);
    reader.readAsDataURL(file);
  }, [onChange]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  if (value) {
    return (
      <div className="relative w-full h-36 rounded-xl overflow-hidden border border-slate-200 group">
        <img src={value} alt="foto" className="w-full h-full object-cover" />
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={onFileInput} />
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center gap-2 w-full h-36 rounded-xl border-2 border-dashed cursor-pointer transition-colors
          ${dragging ? 'border-orange-400 bg-orange-50' : 'border-slate-200 hover:border-orange-300 hover:bg-slate-50'}`}
      >
        <Upload size={22} className={dragging ? 'text-orange-400' : 'text-slate-300'} />
        <span className="text-xs text-slate-400">Arrastra o haz clic para seleccionar</span>
        <span className="text-[10px] text-slate-300">PNG · JPG</span>
      </div>
    </>
  );
};

const InmueblesListTab: React.FC = () => {
  const [inmuebles, setInmuebles] = useState<Inmueble[]>([]);
  const [cargando, setCargando]   = useState(true);
  const [modo, setModo]           = useState<'lista' | 'nuevo' | 'editar'>('lista');
  const [editando, setEditando]   = useState<Inmueble | null>(null);
  const [form, setForm]           = useState<FormData>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError]         = useState('');

  // Filters
  const [filtroTipo,    setFiltroTipo]    = useState<'todos' | 'propiedad' | 'externa'>('todos');
  const [filtroEstatus, setFiltroEstatus] = useState<'todos' | EstatusInmueble>('todos');
  const [sortRenta,     setSortRenta]     = useState(false);

  const cargar = () => {
    setCargando(true);
    listarInmuebles().then(setInmuebles).catch(logError).finally(() => setCargando(false));
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const abrirNuevo = () => { setForm(FORM_VACIO); setEditando(null); setError(''); setModo('nuevo'); };

  const abrirEditar = (i: Inmueble) => {
    setForm({
      ubicacion_direccion:  i.ubicacion_direccion,
      ciudad:               i.ciudad,
      estado:               i.estado,
      valor_propiedad:      i.valor_propiedad ?? '',
      estatus:              i.estatus,
      foto_principal_url:   i.foto_principal_url ?? '',
      predial_cuenta:       i.predial_cuenta ?? '',
      predial_mes_pago:     i.predial_mes_pago ? String(i.predial_mes_pago) : '',
      es_renta_externa:   i.es_renta_externa ?? false,
      propietario_nombre: i.propietario_nombre ?? '',
      total_locales:      i.total_locales ? String(i.total_locales) : '',
    });
    setEditando(i);
    setError('');
    setModo('editar');
  };

  const handleGuardar = async () => {
    if (!form.ubicacion_direccion.trim() || !form.ciudad.trim() || !form.estado.trim()) {
      setError('Dirección, ciudad y estado son obligatorios.'); return;
    }
    setGuardando(true);
    setError('');
    try {
      const payload = {
        ...form,
        valor_propiedad:      form.valor_propiedad      || undefined,
        foto_principal_url:   form.foto_principal_url   || undefined,
        predial_cuenta:       form.predial_cuenta       || undefined,
        predial_mes_pago:     form.predial_mes_pago     ? Number(form.predial_mes_pago) : undefined,
        es_renta_externa:   form.es_renta_externa,
        propietario_nombre: form.es_renta_externa ? (form.propietario_nombre || undefined) : undefined,
        total_locales:      form.total_locales ? Number(form.total_locales) : undefined,
      };
      if (editando) {
        await editarInmueble(editando.id, payload);
      } else {
        await crearInmueble(payload);
      }
      cargar();
      setModo('lista');
    } catch {
      setError('Error al guardar. Verifica los datos.');
    } finally {
      setGuardando(false);
    }
  };

  const set  = (k: keyof FormData, v: string)  => setForm(f => ({ ...f, [k]: v }));
  const setB = (k: keyof FormData, v: boolean) => setForm(f => ({ ...f, [k]: v }));

  if (modo !== 'lista') {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-slate-800">
            {modo === 'nuevo' ? 'Nuevo Inmueble' : 'Editar Inmueble'}
          </h3>
          <button onClick={() => setModo('lista')} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-500 mb-1">Dirección *</label>
            <input value={form.ubicacion_direccion} onChange={e => set('ubicacion_direccion', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Ciudad *</label>
            <input value={form.ciudad} onChange={e => set('ciudad', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Estado *</label>
            <input value={form.estado} onChange={e => set('estado', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Valor propiedad</label>
            <input type="number" value={form.valor_propiedad} onChange={e => set('valor_propiedad', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Estatus</label>
            <select value={form.estatus} onChange={e => set('estatus', e.target.value as EstatusInmueble)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
              <option value="disponible">Disponible</option>
              <option value="rentado">Rentado</option>
              <option value="en_mantenimiento">En mantenimiento</option>
              <option value="vendido">Vendido</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Cuenta predial</label>
            <input value={form.predial_cuenta} onChange={e => set('predial_cuenta', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Mes pago predial</label>
            <select value={form.predial_mes_pago} onChange={e => set('predial_mes_pago', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
              <option value="">—</option>
              {MESES.slice(1).map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          {/* Plaza / multi-local */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Núm. de locales (plaza)</label>
            <input
              type="number" min={1} max={100}
              value={form.total_locales}
              onChange={e => set('total_locales', e.target.value)}
              placeholder="Dejar vacío si no aplica"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>

          {/* Renta externa */}
          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.es_renta_externa}
                onChange={e => setB('es_renta_externa', e.target.checked)}
                className="w-4 h-4 rounded accent-orange-500"
              />
              <span className="text-sm text-slate-700 font-medium">Renta externa (no es propiedad de la oficina)</span>
            </label>
          </div>
          {form.es_renta_externa && (
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-500 mb-1">Nombre del propietario</label>
              <input
                value={form.propietario_nombre}
                onChange={e => set('propietario_nombre', e.target.value)}
                placeholder="Nombre y apellido del dueño"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
              <p className="mt-1 text-[11px] text-slate-400">El % de comisión se define en el contrato.</p>
            </div>
          )}

          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-500 mb-1">Foto principal</label>
            <ImagePicker value={form.foto_principal_url} onChange={v => set('foto_principal_url', v)} />
          </div>
        </div>

        {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

        <div className="flex gap-3 mt-5">
          <button onClick={() => setModo('lista')} className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button disabled={guardando} onClick={handleGuardar}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors">
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    );
  }

  const visibles = inmuebles
    .filter(i => filtroTipo === 'todos' ? true : filtroTipo === 'externa' ? i.es_renta_externa : !i.es_renta_externa)
    .filter(i => filtroEstatus === 'todos' ? true : i.estatus === filtroEstatus)
    .sort((a, b) => {
      if (!sortRenta) return 0;
      return (parseFloat(b.renta_actual ?? '0')) - (parseFloat(a.renta_actual ?? '0'));
    });

  return (
    <div className="space-y-4">
      {/* Header + filters */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value as typeof filtroTipo)}
            className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-300">
            <option value="todos">Todos</option>
            <option value="propiedad">Propios</option>
            <option value="externa">Externos</option>
          </select>
          <select value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value as typeof filtroEstatus)}
            className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-300">
            <option value="todos">Todos los estatus</option>
            <option value="disponible">Disponible</option>
            <option value="rentado">Rentado</option>
            <option value="en_mantenimiento">En mantenimiento</option>
            <option value="vendido">Vendido</option>
          </select>
          <button
            onClick={() => setSortRenta(s => !s)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm transition-colors ${
              sortRenta
                ? 'border-orange-400 bg-orange-50 text-orange-600 font-medium'
                : 'border-slate-200 text-slate-500 hover:border-orange-300'
            }`}
          >
            Renta ↓
          </button>
          <span className="text-xs text-slate-400">{visibles.length} inmueble(s)</span>
        </div>
        <button onClick={abrirNuevo}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus size={15} /> Nuevo Inmueble
        </button>
      </div>

      {cargando
        ? <p className="text-sm text-slate-400 py-10 text-center">Cargando…</p>
        : visibles.length === 0
          ? <p className="text-sm text-slate-400 py-10 text-center">Sin inmuebles para los filtros aplicados.</p>
          : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="px-3 py-3 text-center w-8">#</th>
                    <th className="px-4 py-3 text-left">Dirección</th>
                    <th className="px-4 py-3 text-left">Ciudad</th>
                    <th className="px-4 py-3 text-left">Estatus</th>
                    <th className="px-4 py-3 text-left">Inquilino / Locales</th>
                    <th className="px-4 py-3 text-right">Renta</th>
                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibles.map((i, idx) => (
                    <tr key={i.id} className="hover:bg-slate-50">
                      <td className="px-3 py-3 text-center text-xs text-slate-400 font-medium">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        <div className="flex items-center gap-2">
                          {i.ubicacion_direccion}
                          {i.es_renta_externa && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 whitespace-nowrap"
                              title={`Propietario: ${i.propietario_nombre ?? '—'}`}>
                              Ext.
                            </span>
                          )}
                          {i.total_locales && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 whitespace-nowrap">
                              Plaza
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{i.ciudad}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${ESTATUS_BADGE[i.estatus]}`}>
                          {i.estatus.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {i.total_locales
                          ? <span className="text-xs font-medium text-blue-600">{i.inquilino_actual ?? '0'} locales</span>
                          : (i.inquilino_actual ?? '—')
                        }
                      </td>
                      <td className="px-4 py-3 text-right text-green-600 font-medium">
                        {i.renta_actual ? fmt(parseFloat(i.renta_actual)) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <Link to={`/inmuebles/${i.id}`}
                            className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Ver ficha">
                            <ExternalLink size={15} />
                          </Link>
                          <button onClick={() => abrirEditar(i)}
                            className="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                            title="Editar">
                            <Edit2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      }
    </div>
  );
};

export default InmueblesListTab;
