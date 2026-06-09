import React, { useState, useEffect } from 'react';
import { Plus, Edit2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Inquilino, Inmueble, DepositoItem } from '../../../types/inmuebles.types';
import {
  listarInquilinos, editarInquilino,
  listarInmuebles, crearInquilinoCompleto,
} from '../../../services/inmueblesService';
import FileDropZone from '../../../components/shared/FileDropZone';

// ── Depósito checklist ──────────────────────────────────────────
const ITEMS_DEPOSITO = [
  'Sala', 'Comedor', 'Cocina', 'Baño Principal', 'Baño Secundario',
  'Recámara 1', 'Recámara 2', 'Recámara 3', 'Jardín / Patio',
  'Cochera', 'Fachada', 'Paredes / Pintura', 'Piso', 'Plafón / Techo',
  'Ventanas', 'Puertas',
];

const ESTADO_OPTS: { value: DepositoItem['estado']; label: string; color: string }[] = [
  { value: 'bueno',   label: 'Bueno',   color: 'text-green-600' },
  { value: 'regular', label: 'Regular', color: 'text-amber-500' },
  { value: 'malo',    label: 'Malo',    color: 'text-red-500'   },
  { value: 'na',      label: 'N/A',     color: 'text-slate-400' },
];

const itemInicial = (item: string): DepositoItem => ({ item, estado: 'bueno', notas: '' });

// ── Sección con header colapsable ───────────────────────────────
const Seccion: React.FC<{ titulo: string; children: React.ReactNode; defaultOpen?: boolean }> = ({
  titulo, children, defaultOpen = true,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 text-sm font-medium text-slate-700 hover:bg-slate-100">
        {titulo}
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      {open && <div className="px-4 pb-4 pt-3 space-y-4">{children}</div>}
    </div>
  );
};

// ── Form nuevo inquilino + contrato ─────────────────────────────
type FormNuevo = {
  // Inquilino
  nombres: string; apellidos: string; telefono: string;
  aval_nombre: string; aval_propiedad_garantia: string; url_doc_aval: string;
  // Contrato
  inmueble_id: string; num_local: string;
  monto_renta_mensual: string; dia_corte_pago: string;
  fecha_inicio: string; fecha_fin: string;
  comision_oficina_pct: string; notas: string;
  // Depósito
  monto_deposito: string;
  // Docs
  url_contrato_pdf: string; url_id_inquilino: string;
  url_pagare_pdf: string; url_deposito: string;
};

const FORM_VACIO: FormNuevo = {
  nombres: '', apellidos: '', telefono: '',
  aval_nombre: '', aval_propiedad_garantia: '', url_doc_aval: '',
  inmueble_id: '', num_local: '',
  monto_renta_mensual: '', dia_corte_pago: '1',
  fecha_inicio: '', fecha_fin: '',
  comision_oficina_pct: '', notas: '',
  monto_deposito: '',
  url_contrato_pdf: '', url_id_inquilino: '', url_pagare_pdf: '', url_deposito: '',
};

// ── Edit simple (solo datos del inquilino) ──────────────────────
type FormEdit = { nombres: string; apellidos: string; telefono: string; aval_nombre: string; aval_propiedad_garantia: string; url_doc_aval: string };
const EDIT_VACIO: FormEdit = { nombres: '', apellidos: '', telefono: '', aval_nombre: '', aval_propiedad_garantia: '', url_doc_aval: '' };

// ── Componente principal ────────────────────────────────────────
const InquilinosTab: React.FC = () => {
  const [inquilinos, setInquilinos] = useState<Inquilino[]>([]);
  const [inmuebles,  setInmuebles]  = useState<Inmueble[]>([]);
  const [cargando,   setCargando]   = useState(true);
  const [modo, setModo]             = useState<'lista' | 'nuevo' | 'editar'>('lista');
  const [editando,   setEditando]   = useState<Inquilino | null>(null);

  // Estado formulario nuevo
  const [form,     setForm]     = useState<FormNuevo>(FORM_VACIO);
  const [checklist, setChecklist] = useState<DepositoItem[]>(ITEMS_DEPOSITO.map(itemInicial));

  // Estado formulario editar
  const [formEdit, setFormEdit] = useState<FormEdit>(EDIT_VACIO);

  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');

  const cargar = () => {
    setCargando(true);
    Promise.all([listarInquilinos(), listarInmuebles()])
      .then(([i, m]) => { setInquilinos(i); setInmuebles(m); })
      .catch(() => {})
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const abrirNuevo = () => {
    setForm(FORM_VACIO);
    setChecklist(ITEMS_DEPOSITO.map(itemInicial));
    setEditando(null);
    setError('');
    setModo('nuevo');
  };

  const abrirEditar = (i: Inquilino) => {
    setFormEdit({
      nombres: i.nombres, apellidos: i.apellidos, telefono: i.telefono ?? '',
      aval_nombre: i.aval_nombre ?? '', aval_propiedad_garantia: i.aval_propiedad_garantia ?? '',
      url_doc_aval: i.url_doc_aval ?? '',
    });
    setEditando(i);
    setError('');
    setModo('editar');
  };

  const set  = (k: keyof FormNuevo, v: string) => setForm(f => ({ ...f, [k]: v }));
  const setE = (k: keyof FormEdit,  v: string) => setFormEdit(f => ({ ...f, [k]: v }));

  const updateChecklist = (idx: number, campo: keyof DepositoItem, valor: string) =>
    setChecklist(c => c.map((it, i) => i === idx ? { ...it, [campo]: valor } : it));

  const inmuebleSeleccionado = inmuebles.find(i => i.id === form.inmueble_id);

  const handleGuardarNuevo = async () => {
    if (!form.nombres.trim() || !form.apellidos.trim()) {
      setError('Nombres y apellidos son obligatorios.'); return;
    }
    if (!form.inmueble_id || !form.fecha_inicio || !form.fecha_fin || !form.monto_renta_mensual || !form.dia_corte_pago) {
      setError('Inmueble, fechas, renta y día de corte son obligatorios.'); return;
    }
    setGuardando(true);
    setError('');
    try {
      await crearInquilinoCompleto({
        // Inquilino
        nombres:                 form.nombres.trim(),
        apellidos:               form.apellidos.trim(),
        telefono:                form.telefono || undefined,
        aval_nombre:             form.aval_nombre || undefined,
        aval_propiedad_garantia: form.aval_propiedad_garantia || undefined,
        url_doc_aval:            form.url_doc_aval || undefined,
        // Contrato
        inmueble_id:          form.inmueble_id,
        num_local:            form.num_local ? Number(form.num_local) : undefined,
        fecha_inicio:         form.fecha_inicio,
        fecha_fin:            form.fecha_fin,
        monto_renta_mensual:  form.monto_renta_mensual,
        dia_corte_pago:       Number(form.dia_corte_pago),
        comision_oficina_pct: form.comision_oficina_pct || undefined,
        notas:                form.notas || undefined,
        // Depósito
        monto_deposito:  form.monto_deposito || undefined,
        deposito_items:  checklist,
        // Docs
        url_contrato_pdf: form.url_contrato_pdf || undefined,
        url_id_inquilino: form.url_id_inquilino || undefined,
        url_pagare_pdf:   form.url_pagare_pdf   || undefined,
        url_deposito:     form.url_deposito     || undefined,
      });
      cargar();
      setModo('lista');
    } catch (e: any) {
      setError(e?.response?.data?.mensaje ?? 'Error al guardar.');
    } finally {
      setGuardando(false);
    }
  };

  const handleGuardarEditar = async () => {
    if (!formEdit.nombres.trim() || !formEdit.apellidos.trim()) {
      setError('Nombres y apellidos son obligatorios.'); return;
    }
    setGuardando(true);
    setError('');
    try {
      await editarInquilino(editando!.id, {
        nombres:                 formEdit.nombres.trim(),
        apellidos:               formEdit.apellidos.trim(),
        telefono:                formEdit.telefono || undefined,
        aval_nombre:             formEdit.aval_nombre || undefined,
        aval_propiedad_garantia: formEdit.aval_propiedad_garantia || undefined,
        url_doc_aval:            formEdit.url_doc_aval || undefined,
      } as any);
      cargar();
      setModo('lista');
    } catch {
      setError('Error al guardar.');
    } finally {
      setGuardando(false);
    }
  };

  // ── FORM NUEVO ────────────────────────────────────────────────
  if (modo === 'nuevo') {
    const carpeta = `inquilinos/${form.apellidos.replace(/\s+/g, '_') || 'nuevo'}`;
    const inm = inmuebleSeleccionado;

    return (
      <div className="max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-800">Nuevo Inquilino + Contrato</h3>
          <button onClick={() => setModo('lista')} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {/* 1. Datos personales */}
        <Seccion titulo="1. Datos del inquilino">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Nombre(s) *</label>
              <input value={form.nombres} onChange={e => set('nombres', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Apellidos *</label>
              <input value={form.apellidos} onChange={e => set('apellidos', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-slate-500 mb-1">Teléfono</label>
              <input value={form.telefono} onChange={e => set('telefono', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
          </div>
        </Seccion>

        {/* 2. Aval */}
        <Seccion titulo="2. Aval">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-slate-500 mb-1">Nombre del aval</label>
              <input value={form.aval_nombre} onChange={e => set('aval_nombre', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-slate-500 mb-1">Propiedad en garantía</label>
              <textarea value={form.aval_propiedad_garantia} onChange={e => set('aval_propiedad_garantia', e.target.value)}
                rows={2} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />
            </div>
            <div className="col-span-2">
              <FileDropZone label="Documento del aval" value={form.url_doc_aval} folder={carpeta} onChange={v => set('url_doc_aval', v)} />
            </div>
          </div>
        </Seccion>

        {/* 3. Contrato */}
        <Seccion titulo="3. Contrato">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-slate-500 mb-1">Inmueble *</label>
              <select value={form.inmueble_id}
                onChange={e => { set('inmueble_id', e.target.value); set('num_local', ''); }}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
                <option value="">Seleccionar inmueble…</option>
                {inmuebles.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.ubicacion_direccion}, {i.ciudad}
                    {i.total_locales ? ` (Plaza ${i.total_locales} loc.)` : ''}
                  </option>
                ))}
              </select>
            </div>
            {inm?.total_locales && (
              <div className="col-span-2">
                <label className="block text-xs text-slate-500 mb-1">Local *</label>
                <select value={form.num_local} onChange={e => set('num_local', e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
                  <option value="">Seleccionar local…</option>
                  {Array.from({ length: inm.total_locales }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>Local {n}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs text-slate-500 mb-1">Renta mensual *</label>
              <input type="number" value={form.monto_renta_mensual} onChange={e => set('monto_renta_mensual', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Día de vencimiento *</label>
              <input type="number" min={1} max={31} value={form.dia_corte_pago} onChange={e => set('dia_corte_pago', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Inicio contrato *</label>
              <input type="date" value={form.fecha_inicio} onChange={e => set('fecha_inicio', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Fin contrato *</label>
              <input type="date" value={form.fecha_fin} onChange={e => set('fecha_fin', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
            {inm?.es_renta_externa && (
              <div className="col-span-2">
                <label className="block text-xs text-slate-500 mb-1">Comisión oficina (%)</label>
                <input type="number" min={0} max={100} step={0.01} value={form.comision_oficina_pct}
                  onChange={e => set('comision_oficina_pct', e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                {form.comision_oficina_pct && form.monto_renta_mensual && (
                  <p className="mt-1 text-[11px] text-slate-400">
                    Oficina: ${(parseFloat(form.monto_renta_mensual) * parseFloat(form.comision_oficina_pct) / 100).toFixed(0)} ·
                    Propietario ({inm.propietario_nombre ?? '—'}): ${(parseFloat(form.monto_renta_mensual) * (1 - parseFloat(form.comision_oficina_pct) / 100)).toFixed(0)}
                  </p>
                )}
              </div>
            )}
            <div className="col-span-2">
              <label className="block text-xs text-slate-500 mb-1">Notas</label>
              <textarea value={form.notas} onChange={e => set('notas', e.target.value)} rows={2}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />
            </div>
          </div>
        </Seccion>

        {/* 4. Depósito */}
        <Seccion titulo="4. Depósito" defaultOpen={false}>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Monto del depósito</label>
            <input type="number" value={form.monto_deposito} onChange={e => set('monto_deposito', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Condiciones del inmueble al ingreso</p>
          <div className="space-y-2">
            {checklist.map((it, idx) => (
              <div key={it.item} className="grid grid-cols-12 gap-2 items-center bg-slate-50 rounded-xl px-3 py-2">
                <span className="col-span-4 text-xs text-slate-700">{it.item}</span>
                <div className="col-span-4 flex gap-1">
                  {ESTADO_OPTS.map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => updateChecklist(idx, 'estado', opt.value)}
                      className={`flex-1 text-[10px] font-medium rounded-lg py-0.5 border transition-colors
                        ${it.estado === opt.value
                          ? `${opt.color} border-current bg-white`
                          : 'border-transparent text-slate-400 hover:border-slate-200'
                        }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                <input value={it.notas} onChange={e => updateChecklist(idx, 'notas', e.target.value)}
                  placeholder="Notas…"
                  className="col-span-4 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-300" />
              </div>
            ))}
          </div>
        </Seccion>

        {/* 5. Documentos */}
        <Seccion titulo="5. Documentos" defaultOpen={false}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FileDropZone label="Contrato" value={form.url_contrato_pdf} folder={carpeta} onChange={v => set('url_contrato_pdf', v)} />
            <FileDropZone label="INE del inquilino" value={form.url_id_inquilino} folder={carpeta} onChange={v => set('url_id_inquilino', v)} />
            <FileDropZone label="Pagaré" value={form.url_pagare_pdf} folder={carpeta} onChange={v => set('url_pagare_pdf', v)} />
            <FileDropZone label="Comprobante depósito" value={form.url_deposito} folder={carpeta} onChange={v => set('url_deposito', v)} />
          </div>
        </Seccion>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex gap-3 pb-6">
          <button onClick={() => setModo('lista')}
            className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button disabled={guardando} onClick={handleGuardarNuevo}
            className="px-5 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors">
            {guardando ? 'Guardando…' : 'Crear Inquilino y Contrato'}
          </button>
        </div>
      </div>
    );
  }

  // ── FORM EDITAR ──────────────────────────────────────────────
  if (modo === 'editar') {
    const carpeta = `inquilinos/${formEdit.apellidos.replace(/\s+/g, '_') || editando?.id}`;
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm max-w-xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-slate-800">Editar Inquilino</h3>
          <button onClick={() => setModo('lista')} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Nombres *</label>
            <input value={formEdit.nombres} onChange={e => setE('nombres', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Apellidos *</label>
            <input value={formEdit.apellidos} onChange={e => setE('apellidos', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-slate-500 mb-1">Teléfono</label>
            <input value={formEdit.telefono} onChange={e => setE('telefono', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-slate-500 mb-1">Nombre del aval</label>
            <input value={formEdit.aval_nombre} onChange={e => setE('aval_nombre', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-slate-500 mb-1">Propiedad en garantía</label>
            <textarea value={formEdit.aval_propiedad_garantia} onChange={e => setE('aval_propiedad_garantia', e.target.value)}
              rows={2} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />
          </div>
          <div className="col-span-2">
            <FileDropZone label="Documento del aval" value={formEdit.url_doc_aval} folder={carpeta} onChange={v => setE('url_doc_aval', v)} />
          </div>
        </div>
        {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={() => setModo('lista')} className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button disabled={guardando} onClick={handleGuardarEditar}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors">
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    );
  }

  // ── LISTA ────────────────────────────────────────────────────
  const fmtMXN = (v: string | number | null | undefined) =>
    v != null && v !== '' ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Number(v)) : '—';

  const docCount = (i: typeof inquilinos[0]) =>
    [i.url_contrato_pdf, i.url_pagare_pdf, i.url_id_inquilino, i.url_doc_aval].filter(Boolean).length;

  const DOC_LABEL  = ['Sin docs', '1/4', '2/4', '3/4', 'Completo'];
  const DOC_COLOR  = [
    'bg-slate-100 text-slate-400',
    'bg-red-100 text-red-600',
    'bg-amber-100 text-amber-600',
    'bg-yellow-100 text-yellow-700',
    'bg-green-100 text-green-700',
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">{inquilinos.length} inquilino(s)</p>
        <button onClick={abrirNuevo}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus size={15} /> Nuevo Inquilino
        </button>
      </div>
      {cargando
        ? <p className="text-sm text-slate-400 py-10 text-center">Cargando…</p>
        : inquilinos.length === 0
          ? <p className="text-sm text-slate-400 py-10 text-center">Sin inquilinos registrados.</p>
          : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="px-3 py-3 text-center w-8">#</th>
                    <th className="px-4 py-3 text-left">Nombre</th>
                    <th className="px-4 py-3 text-left">Inmueble</th>
                    <th className="px-4 py-3 text-right">Renta</th>
                    <th className="px-4 py-3 text-right">Saldo pend.</th>
                    <th className="px-4 py-3 text-left">Teléfono</th>
                    <th className="px-4 py-3 text-left">Aval</th>
                    <th className="px-4 py-3 text-center">Docs</th>
                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inquilinos.map((i, idx) => {
                    const docs = docCount(i);
                    const saldo = Number(i.saldo_pendiente ?? 0);
                    return (
                      <tr key={i.id} className="hover:bg-slate-50">
                        <td className="px-3 py-3 text-center text-xs text-slate-400 font-medium">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-medium text-slate-800">{i.nombres} {i.apellidos}</p>
                            {i.es_renta_externa
                              ? <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">Ext.</span>
                              : i.total_locales
                                ? <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Local</span>
                                : null
                            }
                          </div>
                          {i.es_renta_externa && i.comision_oficina_pct && (
                            <p className="text-[10px] text-purple-500 mt-0.5">
                              Comisión {Number(i.comision_oficina_pct)}% = {fmtMXN(Number(i.monto_renta_mensual) * Number(i.comision_oficina_pct) / 100)}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs max-w-[180px] truncate" title={i.inmueble_direccion ?? ''}>
                          {i.inmueble_direccion ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-green-600 font-medium whitespace-nowrap">
                          {fmtMXN(i.monto_renta_mensual)}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {saldo > 0
                            ? <span className="text-red-600 font-medium">{fmtMXN(Number(i.saldo_pendiente))}</span>
                            : <span className="text-slate-300">$0</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-slate-500">{i.telefono ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs max-w-[140px] truncate" title={i.aval_nombre ?? ''}>
                          {i.aval_nombre ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${DOC_COLOR[docs]}`}>
                            {DOC_LABEL[docs]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => abrirEditar(i)}
                            className="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors">
                            <Edit2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      }
    </div>
  );
};

export default InquilinosTab;
