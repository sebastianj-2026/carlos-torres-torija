import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, X, Check, ShieldCheck, ShieldOff } from 'lucide-react';
import { Empleado, EstatusEmpleado } from '../../../types/nominas.types';
import { listarEmpleados, crearEmpleado, editarEmpleado, EmpleadoUpdate } from '../../../services/nominasService';

const fmt = (n: number | string) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Number(n));

const ESTATUS_COLOR: Record<EstatusEmpleado, string> = {
  Activo:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  Inactivo:   'bg-slate-100 text-slate-500 border-slate-200',
  Vacaciones: 'bg-blue-50 text-blue-700 border-blue-200',
};

// ── Toggle switch ──────────────────────────────────────────────────
const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${checked ? 'bg-emerald-500' : 'bg-slate-200'}`}
  >
    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
  </button>
);

// ── Vacation bar ───────────────────────────────────────────────────
const VacBar: React.FC<{ totales: number; tomados: number }> = ({ totales, tomados }) => {
  const disponibles = Math.max(0, totales - tomados);
  const pct = totales > 0 ? Math.min(100, (tomados / totales) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] text-slate-400">
        <span>{disponibles} días disponibles</span>
        <span>{tomados}/{totales} tomados</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-blue-400 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

// ── Form ───────────────────────────────────────────────────────────
interface FormData {
  nombre: string; puesto: string; sueldo_semanal: string;
  estatus: EstatusEmpleado; dias_vacaciones_totales: string;
  fecha_ingreso: string; notas: string;
}
const emptyForm = (): FormData => ({
  nombre: '', puesto: '', sueldo_semanal: '',
  estatus: 'Activo', dias_vacaciones_totales: '6',
  fecha_ingreso: '', notas: '',
});

// ══════════════════════════════════════════════════════════════════
const EmpleadosTab: React.FC = () => {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [editId,    setEditId]    = useState<string | null>(null);
  const [form,      setForm]      = useState<FormData>(emptyForm());
  const [saving,    setSaving]    = useState(false);
  const [err,       setErr]       = useState('');
  // Local IMSS monto edits (pending save on blur)
  const [imssEdit,  setImssEdit]  = useState<Record<string, string>>({});

  const cargar = useCallback(() => {
    setLoading(true);
    listarEmpleados().then(setEmpleados).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // ── Inline saves ───────────────────────────────────────────────
  const saveField = async (emp: Empleado, patch: EmpleadoUpdate) => {
    setEmpleados(prev => prev.map(e =>
      e.id === emp.id ? { ...e, ...(patch as unknown as Partial<Empleado>) } : e
    ));
    try { await editarEmpleado(emp.id, patch); }
    catch { cargar(); }
  };

  const handleEstatus = (emp: Empleado, v: EstatusEmpleado) =>
    saveField(emp, { estatus: v });

  const handleImssToggle = (emp: Empleado, v: boolean) =>
    saveField(emp, { activo_imss: v });

  const handleImssMonto = async (emp: Empleado) => {
    const raw = imssEdit[emp.id];
    if (raw === undefined) return;
    const n = parseFloat(raw) || 0;
    setImssEdit(p => { const c = { ...p }; delete c[emp.id]; return c; });
    await saveField(emp, { monto_imss: n });
  };

  // ── Full form ─────────────────────────────────────────────────
  const set = (k: keyof FormData, v: string) => { setForm(f => ({ ...f, [k]: v })); setErr(''); };

  const openNew  = () => { setEditId(null); setForm(emptyForm()); setErr(''); setShowForm(true); };
  const openEdit = (e: Empleado) => {
    setEditId(e.id);
    setForm({
      nombre: e.nombre, puesto: e.puesto,
      sueldo_semanal: String(parseFloat(e.sueldo_semanal)),
      estatus: e.estatus,
      dias_vacaciones_totales: String(e.dias_vacaciones_totales),
      fecha_ingreso: e.fecha_ingreso ?? '', notas: e.notas ?? '',
    });
    setErr(''); setShowForm(true);
  };

  const guardar = async () => {
    if (!form.nombre.trim()) { setErr('El nombre es obligatorio.'); return; }
    if (!form.puesto.trim()) { setErr('El puesto es obligatorio.'); return; }
    if (parseFloat(form.sueldo_semanal) <= 0) { setErr('El sueldo debe ser mayor a 0.'); return; }
    setSaving(true);
    try {
      const update: EmpleadoUpdate = {
        nombre: form.nombre.trim(), puesto: form.puesto.trim(),
        sueldo_semanal: parseFloat(form.sueldo_semanal),
        estatus: form.estatus,
        dias_vacaciones_totales: parseInt(form.dias_vacaciones_totales) || 6,
        fecha_ingreso: form.fecha_ingreso || null,
        notas: form.notas.trim() || null,
      };
      if (editId) {
        await editarEmpleado(editId, update);
      } else {
        await crearEmpleado({
          nombre:                  form.nombre.trim(),
          puesto:                  form.puesto.trim(),
          sueldo_semanal:          form.sueldo_semanal,
          estatus:                 form.estatus,
          dias_vacaciones_totales: parseInt(form.dias_vacaciones_totales) || 6,
          fecha_ingreso:           form.fecha_ingreso || null,
          notas:                   form.notas.trim() || null,
        });
      }
      setShowForm(false); cargar();
    } catch { setErr('Error al guardar.'); }
    finally  { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{empleados.length} empleados</p>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-colors">
          <Plus size={15} /> Nuevo empleado
        </button>
      </div>

      {/* Form panel */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">{editId ? 'Editar empleado' : 'Nuevo empleado'}</h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
          </div>
          {err && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{err}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {([['nombre','Nombre *','text'],['puesto','Puesto *','text']] as const).map(([k, lbl, t]) => (
              <div key={k}>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{lbl}</label>
                <input type={t} value={form[k]} onChange={e => set(k, e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Sueldo semanal *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input type="number" min="0" step="0.01" value={form.sueldo_semanal} onChange={e => set('sueldo_semanal', e.target.value)}
                  className="w-full border border-slate-200 rounded-xl pl-6 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Estatus</label>
              <select value={form.estatus} onChange={e => set('estatus', e.target.value as EstatusEmpleado)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white">
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
                <option value="Vacaciones">Vacaciones</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Días vac. / año</label>
              <input type="number" min="0" value={form.dias_vacaciones_totales} onChange={e => set('dias_vacaciones_totales', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Fecha de ingreso</label>
              <input type="date" value={form.fecha_ingreso} onChange={e => set('fecha_ingreso', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Notas</label>
              <input value={form.notas} onChange={e => set('notas', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={guardar} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl disabled:opacity-40 transition-colors">
              <Check size={14} /> {saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-5 py-2.5 border border-slate-200 text-slate-600 text-sm rounded-xl hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Cards grid */}
      {loading ? (
        <p className="text-sm text-slate-400 text-center py-10">Cargando…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {empleados.map(e => {
            const sueldo   = parseFloat(e.sueldo_semanal);
            const imssVal  = imssEdit[e.id] ?? String(parseFloat(e.monto_imss || '0'));
            return (
              <div key={e.id} className={`bg-white rounded-2xl border shadow-sm p-4 space-y-3 ${e.estatus === 'Inactivo' ? 'opacity-60' : 'border-slate-100'}`}>

                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 truncate">{e.nombre}</p>
                    <p className="text-xs text-slate-400 truncate">{e.puesto}</p>
                  </div>
                  <select value={e.estatus} onChange={ev => handleEstatus(e, ev.target.value as EstatusEmpleado)}
                    className={`shrink-0 text-xs font-semibold border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white cursor-pointer ${ESTATUS_COLOR[e.estatus]}`}>
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                    <option value="Vacaciones">Vacaciones</option>
                  </select>
                </div>

                {/* Sueldo */}
                <p className="text-lg font-black text-slate-800">{fmt(sueldo)}<span className="text-xs font-normal text-slate-400 ml-1">/ semana</span></p>

                {/* Vacaciones */}
                <VacBar totales={e.dias_vacaciones_totales} tomados={e.dias_vacaciones_tomados} />

                {/* Préstamo */}
                {e.prestamo_folio ? (
                  <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                    <span className="text-[11px] text-amber-700 font-semibold">Préstamo {e.prestamo_folio}</span>
                    <span className="ml-auto text-[11px] font-bold text-amber-700">{fmt(parseFloat(e.prestamo_saldo ?? '0'))}</span>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-300">Sin préstamo vinculado</p>
                )}

                {/* IMSS */}
                <div className="flex items-center gap-3 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                  {e.activo_imss ? <ShieldCheck size={14} className="text-emerald-500 shrink-0" /> : <ShieldOff size={14} className="text-slate-300 shrink-0" />}
                  <span className="text-xs font-semibold text-slate-500">IMSS</span>
                  <Toggle checked={e.activo_imss} onChange={v => handleImssToggle(e, v)} />
                  <div className="relative ml-auto">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                    <input
                      type="number" min="0" step="1"
                      value={imssVal}
                      disabled={!e.activo_imss}
                      onChange={ev => setImssEdit(p => ({ ...p, [e.id]: ev.target.value }))}
                      onBlur={() => handleImssMonto(e)}
                      className="w-20 pl-5 pr-1 py-1 border border-slate-200 rounded-lg text-xs text-right focus:outline-none focus:ring-1 focus:ring-orange-300 disabled:opacity-30 bg-white"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400">/mes</span>
                </div>

                {/* Editar */}
                <div className="flex justify-end">
                  <button onClick={() => openEdit(e)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    <Pencil size={11} /> Editar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EmpleadosTab;
