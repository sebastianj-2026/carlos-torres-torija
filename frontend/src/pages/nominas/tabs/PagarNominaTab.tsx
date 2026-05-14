import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calculator, CreditCard, AlertCircle } from 'lucide-react';
import { Empleado, PreCalculo, TipoHoraExtra } from '../../../types/nominas.types';
import { listarEmpleados, getPreCalculo, pagarNomina } from '../../../services/nominasService';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(n);

const hoy = new Date().toISOString().split('T')[0];

// Lunes de la semana actual
const lunesActual = (() => {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
})();

// Domingo de la semana actual
const domingoActual = (() => {
  const d = new Date(lunesActual);
  d.setDate(d.getDate() + 6);
  return d.toISOString().split('T')[0];
})();

const HORAS_SEMANA = 48;
const MULTIPLICADOR: Record<TipoHoraExtra, number> = { Normal: 1, Doble: 2, Triple: 3 };

interface PagoForm {
  empleado_id: string;
  semana_inicio: string;
  semana_fin: string;
  horas_extras: string;
  tipo_hora_extra: TipoHoraExtra;
  dias_vacaciones: string;
  descuento_prestamo: string;
  forma_pago: string;
  notas: string;
}

const emptyForm = (): PagoForm => ({
  empleado_id: '',
  semana_inicio:      lunesActual,
  semana_fin:         domingoActual,
  horas_extras:       '',
  tipo_hora_extra:    'Normal',
  dias_vacaciones:    '',
  descuento_prestamo: '',
  forma_pago:         'efectivo',
  notas:              '',
});

const PagarNominaTab: React.FC = () => {
  const [empleados,   setEmpleados]   = useState<Empleado[]>([]);
  const [preCalculo,  setPreCalculo]  = useState<PreCalculo | null>(null);
  const [loadingPre,  setLoadingPre]  = useState(false);
  const [form,        setForm]        = useState<PagoForm>(emptyForm());
  const [saving,      setSaving]      = useState(false);
  const [err,         setErr]         = useState('');
  const [ok,          setOk]          = useState('');

  useEffect(() => {
    listarEmpleados().then(setEmpleados).catch(() => {});
  }, []);

  const set = (k: keyof PagoForm, v: string) => { setForm(f => ({ ...f, [k]: v })); setErr(''); setOk(''); };

  const fetchPre = useCallback(async (id: string, dias: number) => {
    if (!id) { setPreCalculo(null); return; }
    setLoadingPre(true);
    try {
      const data = await getPreCalculo(id, dias);
      setPreCalculo(data);
    } catch {
      setPreCalculo(null);
    } finally {
      setLoadingPre(false);
    }
  }, []);

  useEffect(() => {
    fetchPre(form.empleado_id, parseInt(form.dias_vacaciones) || 0);
  }, [form.empleado_id, form.dias_vacaciones, fetchPre]);

  // Live total calculation — mirrors backend formula exactly
  const preview = useMemo(() => {
    if (!preCalculo) return null;
    const sueldo  = preCalculo.empleado.sueldo_semanal;
    const horas   = parseFloat(form.horas_extras) || 0;
    const tipo    = form.tipo_hora_extra;
    const dias    = parseInt(form.dias_vacaciones) || 0;
    const desc    = parseFloat(form.descuento_prestamo) || 0;

    let monto_horas = 0;
    if (horas > 0) {
      const tarifa = sueldo / HORAS_SEMANA;
      monto_horas  = parseFloat((tarifa * horas * MULTIPLICADOR[tipo]).toFixed(2));
    }

    let prima = 0;
    if (preCalculo.empleado.estatus === 'Vacaciones' && dias > 0) {
      prima = parseFloat(((sueldo / 6) * dias * 0.25).toFixed(2));
    }

    const total = Math.max(0, parseFloat((sueldo + monto_horas + prima - desc).toFixed(2)));

    return { sueldo, monto_horas, prima, desc, total };
  }, [preCalculo, form.horas_extras, form.tipo_hora_extra, form.dias_vacaciones, form.descuento_prestamo]);

  const pagar = async () => {
    if (!form.empleado_id)   { setErr('Selecciona un empleado.'); return; }
    if (!form.semana_inicio) { setErr('Semana inicio es obligatoria.'); return; }
    if (!form.semana_fin)    { setErr('Semana fin es obligatoria.'); return; }

    setSaving(true);
    try {
      const horas = parseFloat(form.horas_extras) || 0;
      const dias  = parseInt(form.dias_vacaciones) || 0;
      const desc  = parseFloat(form.descuento_prestamo) || 0;

      const res = await pagarNomina({
        empleado_id:           form.empleado_id,
        semana_inicio:         form.semana_inicio,
        semana_fin:            form.semana_fin,
        horas_extras_cantidad: horas > 0 ? horas : undefined,
        tipo_hora_extra:       horas > 0 ? form.tipo_hora_extra : undefined,
        dias_vacaciones_periodo: dias > 0 ? dias : undefined,
        descuento_prestamo:    desc > 0 ? desc : undefined,
        forma_pago:            form.forma_pago,
        notas:                 form.notas.trim() || undefined,
      });

      setOk(`Nómina registrada. Total pagado: ${fmt(res.desglose.total_pagado)}`);
      setForm(emptyForm());
      setPreCalculo(null);
    } catch {
      setErr('Error al registrar nómina. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const empleadoSeleccionado = empleados.find(e => e.id === form.empleado_id);
  const enVacaciones = preCalculo?.empleado.estatus === 'Vacaciones';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

      {/* ── Formulario ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <CreditCard size={16} /> Registrar Pago de Nómina
        </h3>

        {err && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{err}</p>}
        {ok  && <p className="text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">{ok}</p>}

        {/* Empleado */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Empleado *</label>
          <select value={form.empleado_id} onChange={e => set('empleado_id', e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white">
            <option value="">— Selecciona —</option>
            {empleados.filter(e => e.estatus !== 'Inactivo').map(e => (
              <option key={e.id} value={e.id}>
                {e.nombre} — {e.puesto} ({e.estatus})
              </option>
            ))}
          </select>
        </div>

        {/* Semana */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Semana inicio *</label>
            <input type="date" value={form.semana_inicio} max={hoy} onChange={e => set('semana_inicio', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Semana fin *</label>
            <input type="date" value={form.semana_fin} max={hoy} onChange={e => set('semana_fin', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>
        </div>

        {/* Horas extras */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Horas extras</label>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" min="0" step="0.5" value={form.horas_extras}
              onChange={e => set('horas_extras', e.target.value)}
              placeholder="0"
              className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            <select value={form.tipo_hora_extra} onChange={e => set('tipo_hora_extra', e.target.value as TipoHoraExtra)}
              disabled={!form.horas_extras || parseFloat(form.horas_extras) <= 0}
              className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white disabled:opacity-40">
              <option value="Normal">Normal (×1)</option>
              <option value="Doble">Doble (×2)</option>
              <option value="Triple">Triple (×3)</option>
            </select>
          </div>
          {preCalculo && (
            <p className="text-[11px] text-slate-400 mt-1">
              Tarifa: {fmt(preCalculo.empleado.sueldo_semanal / HORAS_SEMANA)}/h ·
              Normal {fmt(preCalculo.calculo.tarifas_hora_extra.Normal)} ·
              Doble {fmt(preCalculo.calculo.tarifas_hora_extra.Doble)} ·
              Triple {fmt(preCalculo.calculo.tarifas_hora_extra.Triple)}
            </p>
          )}
        </div>

        {/* Vacaciones — solo si estatus = Vacaciones */}
        {enVacaciones && (
          <div>
            <label className="block text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1.5">
              Días de vacaciones este período
              <span className="ml-2 text-[10px] font-normal text-slate-400 normal-case">
                ({preCalculo?.empleado.dias_disponibles} disponibles)
              </span>
            </label>
            <input type="number" min="0" value={form.dias_vacaciones} onChange={e => set('dias_vacaciones', e.target.value)}
              placeholder="0"
              className="w-full border border-blue-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            {preview && preview.prima > 0 && (
              <p className="text-[11px] text-blue-600 mt-1">
                Prima vacacional: {fmt(preview.prima)}
              </p>
            )}
          </div>
        )}

        {/* Descuento préstamo */}
        {preCalculo?.prestamo_activo && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
            <div className="flex items-center gap-2 text-amber-700 text-xs font-semibold">
              <AlertCircle size={13} />
              Préstamo activo · {preCalculo.prestamo_activo.folio} ·
              Saldo {fmt(parseFloat(preCalculo.prestamo_activo.saldo_pendiente))}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Descuento a capital esta semana
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input type="number" min="0" step="0.01" value={form.descuento_prestamo}
                  onChange={e => set('descuento_prestamo', e.target.value)}
                  placeholder="0"
                  className="w-full border border-slate-200 rounded-xl pl-6 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white" />
              </div>
            </div>
          </div>
        )}

        {/* Forma de pago */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Forma de pago</label>
          <select value={form.forma_pago} onChange={e => set('forma_pago', e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white">
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
          </select>
        </div>

        {/* Notas */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Notas <span className="text-slate-300 font-normal normal-case">(opcional)</span>
          </label>
          <input value={form.notas} onChange={e => set('notas', e.target.value)}
            placeholder="Observaciones…"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
        </div>

        <button onClick={pagar} disabled={saving || !form.empleado_id}
          className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-40">
          {saving ? 'Procesando…' : 'Registrar Pago'}
        </button>
      </div>

      {/* ── Panel derecho: Pre-cálculo ── */}
      <div className="space-y-4">
        {!form.empleado_id && (
          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-8 text-center">
            <Calculator size={32} className="mx-auto text-slate-200 mb-2" />
            <p className="text-sm text-slate-400">Selecciona un empleado para ver el pre-cálculo.</p>
          </div>
        )}

        {form.empleado_id && loadingPre && (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
            <p className="text-sm text-slate-400">Calculando…</p>
          </div>
        )}

        {preCalculo && preview && !loadingPre && (
          <>
            {/* Ficha empleado */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-2">Empleado</p>
              <p className="font-bold text-slate-800 text-base">{preCalculo.empleado.nombre}</p>
              <p className="text-sm text-slate-500">{preCalculo.empleado.puesto}</p>
              <div className="mt-3 flex gap-4 text-xs text-slate-500">
                <span>Sueldo base: <strong className="text-slate-800">{fmt(preCalculo.empleado.sueldo_semanal)}</strong></span>
                <span>Vac. disponibles: <strong className={preCalculo.empleado.dias_disponibles > 0 ? 'text-blue-600' : 'text-slate-300'}>
                  {preCalculo.empleado.dias_disponibles}
                </strong></span>
              </div>
            </div>

            {/* Desglose */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
              <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Desglose estimado</p>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Sueldo base</span>
                  <span className="font-semibold text-slate-800">{fmt(preview.sueldo)}</span>
                </div>
                {preview.monto_horas > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Horas extras ({form.horas_extras}h × {form.tipo_hora_extra})</span>
                    <span className="font-semibold text-emerald-600">+{fmt(preview.monto_horas)}</span>
                  </div>
                )}
                {preview.prima > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Prima vacacional ({form.dias_vacaciones} días)</span>
                    <span className="font-semibold text-blue-600">+{fmt(preview.prima)}</span>
                  </div>
                )}
                {preview.desc > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Descuento préstamo</span>
                    <span className="font-semibold text-red-500">-{fmt(preview.desc)}</span>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-2 flex justify-between">
                  <span className="font-bold text-slate-800">Total a pagar</span>
                  <span className="font-black text-xl text-orange-600">{fmt(preview.total)}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PagarNominaTab;
