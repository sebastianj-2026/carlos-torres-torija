import React, { useState, useEffect } from 'react';
import { Plus, X, ChevronDown, ChevronUp, Building2, UserCircle, CalendarClock, Search } from 'lucide-react';
import { ContratoArrendamiento, DetalleServicio, EstatusContrato, Inmueble, Inquilino } from '../../../types/inmuebles.types';
import { listarContratos, crearContrato, editarContrato, listarInmuebles, listarInquilinos } from '../../../services/inmueblesService';
import FileDropZone from '../../../components/shared/FileDropZone';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);

const TIPOS_SERVICIO = ['CFE', 'Agua', 'Gas', 'Internet', 'Mantenimiento', 'Otro'];
const SERVICIO_VACIO: DetalleServicio = { tipo: 'CFE', cuenta: null, dia_pago: 15, frecuencia: 'mensual' };

type FormData = {
  inmueble_id: string; inquilino_id: string; fecha_inicio: string; fecha_fin: string;
  monto_renta_mensual: string; dia_corte_pago: string;
  url_contrato_pdf: string; url_pagare_pdf: string; url_llaves_entrega: string;
  url_inventario_pdf: string; url_id_inquilino: string;
  incluye_servicios: boolean; comision_oficina_pct: string; num_local: string;
  estatus: EstatusContrato; notas: string;
};

const FORM_VACIO: FormData = {
  inmueble_id: '', inquilino_id: '', fecha_inicio: '', fecha_fin: '',
  monto_renta_mensual: '', dia_corte_pago: '1',
  url_contrato_pdf: '', url_pagare_pdf: '', url_llaves_entrega: '',
  url_inventario_pdf: '', url_id_inquilino: '',
  incluye_servicios: false, comision_oficina_pct: '', num_local: '', estatus: 'activo', notas: '',
};

// ── Card ─────────────────────────────────────────────────────────
const ESTATUS_CFG: Record<EstatusContrato, { cls: string; dot: string; label: string }> = {
  activo:    { cls: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400', label: 'Activo'    },
  vencido:   { cls: 'bg-red-100    text-red-700',      dot: 'bg-red-400',     label: 'Vencido'   },
  terminado: { cls: 'bg-slate-100  text-slate-500',    dot: 'bg-slate-400',   label: 'Terminado' },
};

interface CardProps {
  contrato: ContratoArrendamiento;
  inmueble: Inmueble | undefined;
  onEditar: () => void;
}

const ContractCard: React.FC<CardProps> = ({ contrato: c, inmueble: inm, onEditar }) => {
  const cfg = ESTATUS_CFG[c.estatus];

  const tipoBadge = inm?.es_renta_externa
    ? { cls: 'bg-purple-100 text-purple-700', label: 'Externo' }
    : inm?.total_locales
      ? { cls: 'bg-blue-100 text-blue-700', label: 'Local' }
      : { cls: 'bg-slate-100 text-slate-500', label: 'Casa' };

  const venceLabel = (() => {
    const dias = c.dias_para_vencer ?? null;
    if (dias === null) return null;
    if (dias < 0)  return { text: `Venció hace ${Math.abs(dias)}d`, color: 'text-red-500' };
    if (dias === 0) return { text: 'Vence hoy', color: 'text-red-500' };
    if (dias <= 30) return { text: `Vence en ${dias}d`, color: 'text-amber-500' };
    const m = Math.round(dias / 30);
    return { text: `Vence en ${m} mes${m !== 1 ? 'es' : ''}`, color: 'text-slate-400' };
  })();

  const apagada = c.estatus !== 'activo';

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden flex flex-col transition-all hover:shadow-md ${
      apagada ? 'border-slate-200 opacity-70' : 'border-slate-100 shadow-sm'
    }`}>
      {/* ── Foto ── */}
      <div className="relative h-40 bg-slate-100 overflow-hidden shrink-0">
        {inm?.foto_principal_url
          ? <img src={inm.foto_principal_url} alt={c.ubicacion_direccion ?? ''} className="w-full h-full object-cover" />
          : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <Building2 size={36} className="text-slate-300" />
              <span className="text-[10px] text-slate-300 uppercase tracking-wide">Sin foto</span>
            </div>
          )
        }
        <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${tipoBadge.cls}`}>
          {tipoBadge.label}
        </span>
        <span className={`absolute top-2 right-2 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.cls}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </div>

      {/* ── Contenido ── */}
      <div className="px-4 pt-3 pb-2 flex flex-col gap-2 flex-1">
        <p className="font-bold text-slate-800 text-sm leading-snug line-clamp-2">
          {c.ubicacion_direccion ?? '—'}
          {c.ciudad ? `, ${c.ciudad}` : ''}
          {c.num_local ? <span className="text-orange-500 font-semibold"> · L{c.num_local}</span> : null}
        </p>

        {c.estatus === 'activo' ? (
          <>
            <div className="flex items-center gap-1.5">
              <UserCircle size={13} className="text-slate-400 shrink-0" />
              <span className="text-sm text-slate-600 truncate">{c.inquilino_nombre ?? '—'}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-emerald-600">
                {fmt(parseFloat(c.monto_renta_mensual))}
              </span>
              {venceLabel && (
                <span className={`flex items-center gap-1 text-xs font-medium ${venceLabel.color}`}>
                  <CalendarClock size={12} />
                  {venceLabel.text}
                </span>
              )}
            </div>

            {inm?.es_renta_externa && c.comision_oficina_pct && (
              <p className="text-[10px] text-purple-500">
                Com. {Number(c.comision_oficina_pct)}% ={' '}
                {fmt(parseFloat(c.monto_renta_mensual) * Number(c.comision_oficina_pct) / 100)}
                {' '}· Neto{' '}
                {fmt(parseFloat(c.monto_renta_mensual) * (1 - Number(c.comision_oficina_pct) / 100))}
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-slate-400">
            {c.inquilino_nombre ?? '—'} · Finalizó {c.fecha_fin?.slice(0, 10)}
          </p>
        )}
      </div>

      {/* ── Botón principal ── */}
      <div className="px-4 pb-4 mt-auto">
        <button
          onClick={onEditar}
          className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            c.estatus === 'activo'
              ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-500/25'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
          }`}
        >
          Abrir Contrato
        </button>
      </div>
    </div>
  );
};

// ── Componente principal ─────────────────────────────────────────
const ContratosTab: React.FC = () => {
  const [contratos,  setContratos]  = useState<ContratoArrendamiento[]>([]);
  const [inmuebles,  setInmuebles]  = useState<Inmueble[]>([]);
  const [inquilinos, setInquilinos] = useState<Inquilino[]>([]);
  const [cargando,   setCargando]   = useState(true);
  const [modo, setModo]             = useState<'lista' | 'nuevo' | 'editar'>('lista');
  const [editando, setEditando]     = useState<ContratoArrendamiento | null>(null);
  const [form, setForm]             = useState<FormData>(FORM_VACIO);
  const [servicios, setServicios]   = useState<DetalleServicio[]>([]);
  const [mostrarDocs, setMostrarDocs] = useState(false);
  const [guardando, setGuardando]   = useState(false);
  const [error, setError]           = useState('');
  const [filtro, setFiltro]         = useState<'todos' | EstatusContrato>('todos');
  const [busqueda, setBusqueda]     = useState('');

  const cargar = () => {
    setCargando(true);
    Promise.all([listarContratos(), listarInmuebles(), listarInquilinos()])
      .then(([c, i, iq]) => { setContratos(c); setInmuebles(i); setInquilinos(iq); })
      .catch(() => {})
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const abrirNuevo = () => {
    setForm(FORM_VACIO); setServicios([]); setEditando(null);
    setError(''); setMostrarDocs(false); setModo('nuevo');
  };

  const abrirEditar = (c: ContratoArrendamiento) => {
    setForm({
      inmueble_id: c.inmueble_id, inquilino_id: c.inquilino_id,
      fecha_inicio: c.fecha_inicio.slice(0, 10), fecha_fin: c.fecha_fin.slice(0, 10),
      monto_renta_mensual: c.monto_renta_mensual, dia_corte_pago: String(c.dia_corte_pago),
      url_contrato_pdf: c.url_contrato_pdf ?? '', url_pagare_pdf: c.url_pagare_pdf ?? '',
      url_llaves_entrega: c.url_llaves_entrega ?? '', url_inventario_pdf: c.url_inventario_pdf ?? '',
      url_id_inquilino: c.url_id_inquilino ?? '', incluye_servicios: c.incluye_servicios,
      comision_oficina_pct: c.comision_oficina_pct ?? '', num_local: c.num_local ? String(c.num_local) : '',
      estatus: c.estatus, notas: c.notas ?? '',
    });
    setServicios(c.detalles_servicios ?? []);
    setEditando(c); setError(''); setMostrarDocs(false); setModo('editar');
  };

  const handleGuardar = async () => {
    if (!form.inmueble_id || !form.inquilino_id || !form.fecha_inicio || !form.fecha_fin || !form.monto_renta_mensual || !form.dia_corte_pago) {
      setError('Inmueble, inquilino, fechas, renta y día de corte son obligatorios.'); return;
    }
    setGuardando(true); setError('');
    try {
      const payload = {
        ...form,
        dia_corte_pago:       Number(form.dia_corte_pago),
        url_contrato_pdf:     form.url_contrato_pdf    || undefined,
        url_pagare_pdf:       form.url_pagare_pdf      || undefined,
        url_llaves_entrega:   form.url_llaves_entrega  || undefined,
        url_inventario_pdf:   form.url_inventario_pdf  || undefined,
        url_id_inquilino:     form.url_id_inquilino    || undefined,
        notas:                form.notas               || undefined,
        comision_oficina_pct: form.comision_oficina_pct || undefined,
        num_local:            form.num_local ? Number(form.num_local) : undefined,
        detalles_servicios:   form.incluye_servicios ? servicios : [],
      };
      if (editando) { await editarContrato(editando.id, payload); }
      else          { await crearContrato(payload); }
      cargar(); setModo('lista');
    } catch {
      setError('Error al guardar contrato.');
    } finally { setGuardando(false); }
  };

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) => setForm(f => ({ ...f, [k]: v }));
  const addServicio    = () => setServicios(s => [...s, { ...SERVICIO_VACIO }]);
  const removeServicio = (i: number) => setServicios(s => s.filter((_, idx) => idx !== i));
  const updateServicio = (i: number, k: keyof DetalleServicio, v: string | number) =>
    setServicios(s => s.map((srv, idx) => idx === i ? { ...srv, [k]: v } : srv));

  // ── Formulario ────────────────────────────────────────────────
  if (modo !== 'lista') {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm max-w-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-slate-800">
            {modo === 'nuevo' ? 'Nuevo Contrato' : 'Editar Contrato'}
          </h3>
          <button onClick={() => setModo('lista')} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Inmueble *</label>
              <select value={form.inmueble_id}
                onChange={e => { set('inmueble_id', e.target.value); set('num_local', ''); }}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
                <option value="">Seleccionar…</option>
                {inmuebles.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.ubicacion_direccion}, {i.ciudad}{i.total_locales ? ` (Plaza ${i.total_locales} loc.)` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Inquilino *</label>
              <select value={form.inquilino_id} onChange={e => set('inquilino_id', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
                <option value="">Seleccionar…</option>
                {inquilinos.map(i => (
                  <option key={i.id} value={i.id}>{i.nombres} {i.apellidos}</option>
                ))}
              </select>
            </div>
          </div>

          {(() => {
            const inm = inmuebles.find(i => i.id === form.inmueble_id);
            if (!inm?.total_locales) return null;
            return (
              <div>
                <label className="block text-xs text-slate-500 mb-1">Local *</label>
                <select value={form.num_local} onChange={e => set('num_local', e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
                  <option value="">Seleccionar local…</option>
                  {Array.from({ length: inm.total_locales }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>Local {n}</option>
                  ))}
                </select>
              </div>
            );
          })()}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Fecha inicio *</label>
              <input type="date" value={form.fecha_inicio} onChange={e => set('fecha_inicio', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Fecha fin *</label>
              <input type="date" value={form.fecha_fin} onChange={e => set('fecha_fin', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Renta mensual *</label>
              <input type="number" value={form.monto_renta_mensual} onChange={e => set('monto_renta_mensual', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Día de corte/cobro *</label>
              <input type="number" min={1} max={31} value={form.dia_corte_pago} onChange={e => set('dia_corte_pago', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
            {inmuebles.find(i => i.id === form.inmueble_id)?.es_renta_externa && (
              <div>
                <label className="block text-xs text-slate-500 mb-1">Comisión oficina (%)</label>
                <input type="number" min={0} max={100} step={0.01}
                  value={form.comision_oficina_pct} onChange={e => set('comision_oficina_pct', e.target.value)}
                  placeholder="Ej. 10"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                {form.comision_oficina_pct && form.monto_renta_mensual && (
                  <p className="mt-1 text-[11px] text-slate-400">
                    Oficina: ${(parseFloat(form.monto_renta_mensual) * parseFloat(form.comision_oficina_pct) / 100).toFixed(0)} ·
                    Propietario: ${(parseFloat(form.monto_renta_mensual) * (1 - parseFloat(form.comision_oficina_pct) / 100)).toFixed(0)}
                  </p>
                )}
              </div>
            )}
          </div>

          {modo === 'editar' && (
            <div>
              <label className="block text-xs text-slate-500 mb-1">Estatus</label>
              <select value={form.estatus} onChange={e => set('estatus', e.target.value as EstatusContrato)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
                <option value="activo">Activo</option>
                <option value="vencido">Vencido</option>
                <option value="terminado">Terminado</option>
              </select>
            </div>
          )}

          <div className="p-4 border border-slate-200 rounded-xl space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.incluye_servicios}
                onChange={e => set('incluye_servicios', e.target.checked)}
                className="w-4 h-4 rounded accent-orange-500" />
              <span className="text-sm font-medium text-slate-700">¿Incluye servicios? (CFE, Agua, etc.)</span>
            </label>
            {form.incluye_servicios && (
              <div className="space-y-2 pt-1">
                {servicios.length === 0 && <p className="text-xs text-slate-400">Sin servicios agregados.</p>}
                {servicios.map((s, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center bg-slate-50 rounded-xl p-2">
                    <div className="col-span-3">
                      <select value={s.tipo} onChange={e => updateServicio(i, 'tipo', e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-300">
                        {TIPOS_SERVICIO.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <input placeholder="No. cuenta/medidor" value={s.cuenta ?? ''}
                        onChange={e => updateServicio(i, 'cuenta', e.target.value || null as any)}
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-300" />
                    </div>
                    <div className="col-span-2">
                      <input type="number" min={1} max={31} placeholder="Día pago" value={s.dia_pago}
                        onChange={e => updateServicio(i, 'dia_pago', Number(e.target.value))}
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-300" />
                    </div>
                    <div className="col-span-3">
                      <select value={s.frecuencia} onChange={e => updateServicio(i, 'frecuencia', e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-300">
                        <option value="mensual">Mensual</option>
                        <option value="bimestral">Bimestral</option>
                      </select>
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button onClick={() => removeServicio(i)}
                        className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors">
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ))}
                <button onClick={addServicio}
                  className="text-xs text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1 mt-1">
                  <Plus size={13} /> Agregar Servicio
                </button>
              </div>
            )}
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button type="button" onClick={() => setMostrarDocs(!mostrarDocs)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Documentos del expediente
              {mostrarDocs ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
            {mostrarDocs && (
              <div className="px-4 pb-4 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {([
                    ['url_contrato_pdf',   'Contrato (PDF)'],
                    ['url_pagare_pdf',     'Pagaré (PDF)'],
                    ['url_llaves_entrega', 'Acta entrega de llaves'],
                    ['url_inventario_pdf', 'Inventario (PDF)'],
                    ['url_id_inquilino',   'INE del Inquilino'],
                  ] as [keyof FormData, string][]).map(([k, label]) => (
                    <FileDropZone
                      key={k}
                      label={label}
                      value={form[k] as string}
                      folder={`contratos/${editando?.id ?? 'nuevo'}`}
                      onChange={url => set(k, url)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Notas</label>
            <textarea value={form.notas} onChange={e => set('notas', e.target.value)} rows={2}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />
          </div>
        </div>

        {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

        <div className="flex gap-3 mt-5">
          <button onClick={() => setModo('lista')}
            className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button disabled={guardando} onClick={handleGuardar}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors">
            {guardando ? 'Guardando…' : 'Guardar Contrato'}
          </button>
        </div>
      </div>
    );
  }

  // ── Vista lista → Card Grid ──────────────────────────────────
  const q = busqueda.toLowerCase().trim();
  const contratosFiltrados = contratos.filter(c =>
    (filtro === 'todos' || c.estatus === filtro) &&
    (!q || (c.inquilino_nombre ?? '').toLowerCase().includes(q) || (c.ubicacion_direccion ?? '').toLowerCase().includes(q))
  );

  const FILTROS: { key: 'todos' | EstatusContrato; label: string }[] = [
    { key: 'todos',     label: `Todos (${contratos.length})` },
    { key: 'activo',    label: `Activos (${contratos.filter(c => c.estatus === 'activo').length})` },
    { key: 'vencido',   label: `Vencidos (${contratos.filter(c => c.estatus === 'vencido').length})` },
    { key: 'terminado', label: `Terminados (${contratos.filter(c => c.estatus === 'terminado').length})` },
  ];

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Buscador */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar inquilino o dirección…"
            className="pl-8 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 w-64"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {FILTROS.map(f => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filtro === f.key
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/25'
                  : 'bg-white border border-slate-200 text-slate-500 hover:border-orange-300 hover:text-orange-500'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button onClick={abrirNuevo}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors shadow-sm shadow-orange-500/25">
          <Plus size={15} /> Nuevo Contrato
        </button>
      </div>

      {/* Grid */}
      {cargando ? (
        <p className="text-sm text-slate-400 py-16 text-center">Cargando…</p>
      ) : contratosFiltrados.length === 0 ? (
        <p className="text-sm text-slate-400 py-16 text-center">Sin contratos para este filtro.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {contratosFiltrados.map(c => (
            <ContractCard
              key={c.id}
              contrato={c}
              inmueble={inmuebles.find(i => i.id === c.inmueble_id)}
              onEditar={() => abrirEditar(c)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ContratosTab;
