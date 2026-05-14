import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, X, Building2, AlertTriangle, Calendar, Pencil } from 'lucide-react';
import {
  CreditoBancario, TipoTasaCredito, EsquemaPagoCredito,
} from '../../../types/egresos.types';
import {
  listarCreditos, crearCredito, editarCredito, registrarPagoCredito,
} from '../../../services/egresosService';

const fmt = (n: string | number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n));

const TIPO_TASA: TipoTasaCredito[]     = ['Fija', 'Variable'];
const ESQUEMAS:  EsquemaPagoCredito[]  = ['Pagos Fijos', 'Pagos Decrecientes', 'Solo Intereses'];

const INPUT = 'w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400';

const stripNum     = (s: string) => s.replace(/,/g, '');
const fmtBanco     = (s: string) => s.replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ ]/g, '').toUpperCase();
const fmtDigitos   = (s: string) => s.replace(/\D/g, '');
const fmtDinero    = (s: string) => s.replace(/[^\d.,]/g, '');
const fmtDecimal   = (s: string) => s.replace(/[^\d.]/g, '');
const fmtDiaCorte  = (s: string) => {
  const n = parseInt(s.replace(/\D/g, ''), 10);
  if (isNaN(n)) return '';
  return String(Math.min(31, Math.max(1, n)));
};

const FechaInput: React.FC<{ label: string; value: string; onChange: (iso: string) => void }> = ({ label, value, onChange }) => {
  const isoToDisplay = (iso: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8)}/${iso.slice(5,7)}/${iso.slice(0,4)}` : '';

  const [local, setLocal] = useState(() => isoToDisplay(value));
  const dateRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const d = isoToDisplay(value);
    if (d) setLocal(d);
    else if (!value) setLocal('');
  }, [value]);

  const handleType = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    let display = digits;
    if (digits.length > 4) display = `${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4)}`;
    else if (digits.length > 2) display = `${digits.slice(0,2)}/${digits.slice(2)}`;
    setLocal(display);
    if (digits.length === 8) {
      const d = digits.slice(0,2), m = digits.slice(2,4), y = digits.slice(4);
      onChange(`${y}-${m}-${d}`);
    } else onChange('');
  };

  const handleCalendar = (iso: string) => {
    onChange(iso);
    setLocal(isoToDisplay(iso));
  };

  return (
    <div>
      <label className="text-xs text-slate-500">{label}</label>
      <div className="relative mt-1">
        <input type="text" value={local} onChange={e => handleType(e.target.value)}
          placeholder="DD/MM/AAAA" maxLength={10} className={INPUT + ' pr-9'} />
        <button type="button" onClick={() => dateRef.current?.showPicker()}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
          <Calendar size={14} />
        </button>
        <input type="date" ref={dateRef} value={value} onChange={e => handleCalendar(e.target.value)}
          className="absolute opacity-0 w-0 h-0 pointer-events-none" />
      </div>
    </div>
  );
};

const VACÍO_CREDITO = {
  banco: '', alias_credito: '', concepto: '', monto_original: '', saldo_actual: '',
  tipo_tasa:    'Fija'         as TipoTasaCredito,
  esquema_pago: 'Pagos Fijos'  as EsquemaPagoCredito,
  cuota_base_mensual: '', dia_corte: '',
  tasa_anual: '', fecha_fin: '',
};

const diffMeses = (desde: string, hasta: string) => {
  const a = new Date(desde + 'T12:00:00');
  const b = new Date(hasta + 'T12:00:00');
  return Math.max(1, (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + 1);
};

const calcPago = (
  saldo: number,
  montoOriginal: number,
  tasaAnualPct: number,
  fechaFin: string | null | undefined,
  fechaInicio: string | null | undefined,
  esquema: EsquemaPagoCredito,
): { capital: string; interes: string; iva: string } | null => {
  if (tasaAnualPct <= 0 || saldo <= 0) return null;
  const tm      = tasaAnualPct / 12 / 100;
  const interes = saldo * tm;           // interés del mes sobre saldo actual
  const iva     = interes * 0.16;

  if (esquema === 'Solo Intereses') {
    return { capital: '0', interes: interes.toFixed(2), iva: iva.toFixed(2) };
  }

  if (esquema === 'Pagos Decrecientes') {
    if (!fechaFin) return { capital: '', interes: interes.toFixed(2), iva: iva.toFixed(2) };
    const hoy = new Date().toISOString().slice(0, 10);
    const n   = diffMeses(hoy, fechaFin);
    return { capital: (saldo / n).toFixed(2), interes: interes.toFixed(2), iva: iva.toFixed(2) };
  }

  // Pagos Fijos — pago pactado desde saldo original + plazo total
  if (!fechaFin) return { capital: '', interes: interes.toFixed(2), iva: iva.toFixed(2) };
  const n  = fechaInicio ? diffMeses(fechaInicio, fechaFin) : (() => {
    const hoy = new Date().toISOString().slice(0, 10);
    return diffMeses(hoy, fechaFin);
  })();
  const pv = fechaInicio ? montoOriginal : saldo;
  if (!pv || isNaN(pv) || pv <= 0) return null;
  const pagoFijo = pv * (tm * Math.pow(1 + tm, n)) / (Math.pow(1 + tm, n) - 1);
  if (!isFinite(pagoFijo) || isNaN(pagoFijo)) return null;
  const capital  = Math.max(0, pagoFijo - interes);
  return { capital: capital.toFixed(2), interes: interes.toFixed(2), iva: iva.toFixed(2) };
};

interface PagoForm {
  capital: string;
  interes: string;
  iva:     string;
  fecha_pago:      string;
  tasa_aplicable:  string;
}

const DeudasTab: React.FC<{ mes: number; anio: number }> = ({ mes, anio }) => {
  const [creditos,      setCreditos]      = useState<CreditoBancario[]>([]);
  const [cargando,      setCargando]      = useState(true);
  const [modalCredito,  setModalCredito]  = useState(false);
  const [editandoId,    setEditandoId]    = useState<string | null>(null);
  const [modalPago,     setModalPago]     = useState<CreditoBancario | null>(null);
  const [formCredito,   setFormCredito]   = useState({ ...VACÍO_CREDITO });
  const [formPago,      setFormPago]      = useState<PagoForm>({ capital: '', interes: '', iva: '', fecha_pago: '', tasa_aplicable: '' });
  const [guardando,     setGuardando]     = useState(false);
  const [error,         setError]         = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    try { setCreditos(await listarCreditos(mes, anio)); }
    finally { setCargando(false); }
  }, [mes, anio]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirModalPago = (c: CreditoBancario) => {
    const tasa  = c.tasa_anual ? parseFloat(c.tasa_anual) : 0;
    const saldo = parseFloat(c.saldo_actual);
    let capital = '', interes = '', iva = '';

    if (c.esquema_pago === 'Pagos Fijos' && c.cuota_base_mensual && tasa > 0) {
      // Desglose: interés sobre saldo actual, capital = pago_pactado − interés
      const tm      = tasa / 12 / 100;
      const int     = saldo * tm;
      const cap     = Math.max(0, parseFloat(c.cuota_base_mensual) - int);
      capital = cap.toFixed(2);
      interes = int.toFixed(2);
      iva     = (int * 0.16).toFixed(2);
    } else if (c.esquema_pago === 'Solo Intereses') {
      capital = '0';
    } else if (tasa > 0) {
      // Decrecientes o Variable: fórmula
      const calc = calcPago(saldo, parseFloat(c.monto_original), tasa, c.fecha_fin, null, c.esquema_pago);
      if (calc) { capital = calc.capital; interes = calc.interes; iva = calc.iva; }
    }

    setFormPago({ capital, interes, iva, fecha_pago: '', tasa_aplicable: '' });
    setError('');
    setModalPago(c);
  };

  const handleInteresChange = (val: string) => {
    const iva = val !== '' ? (parseFloat(val) * 0.16).toFixed(2) : '';
    setFormPago(f => ({ ...f, interes: val, iva }));
  };

  const handleTasaAplicableChange = (val: string) => {
    if (!modalPago) return;
    setFormPago(f => {
      const newF = { ...f, tasa_aplicable: val };
      const tasa = parseFloat(val);
      if (tasa > 0) {
        const calc = calcPago(parseFloat(modalPago.saldo_actual), parseFloat(modalPago.monto_original), tasa, modalPago.fecha_fin, modalPago.fecha_inicio, modalPago.esquema_pago);
        if (calc) return { ...newF, capital: calc.capital, interes: calc.interes, iva: calc.iva };
      }
      return newF;
    });
  };

  const totalPago = () => {
    const c = parseFloat(formPago.capital) || 0;
    const i = parseFloat(formPago.interes) || 0;
    const v = parseFloat(formPago.iva)     || 0;
    return c + i + v;
  };

  const mostrarWarningPF = () => {
    if (!modalPago || modalPago.esquema_pago !== 'Pagos Fijos' || !modalPago.cuota_base_mensual) return false;
    return Math.abs(totalPago() - parseFloat(modalPago.cuota_base_mensual)) > 0.01;
  };

  const abrirEditar = (c: CreditoBancario) => {
    setFormCredito({
      banco:               c.banco,
      alias_credito:       c.alias_credito       ?? '',
      concepto:            c.concepto            ?? '',
      monto_original:      c.monto_original,
      saldo_actual:        c.saldo_actual,
      tipo_tasa:           c.tipo_tasa,
      esquema_pago:        c.esquema_pago,
      cuota_base_mensual:  c.cuota_base_mensual  ?? '',
      dia_corte:           c.dia_corte != null ? String(c.dia_corte) : '',
      tasa_anual:          c.tasa_anual           ?? '',
      fecha_fin:           c.fecha_fin            ?? '',
    });
    setEditandoId(c.id);
    setError('');
    setModalCredito(true);
  };

  const guardarCredito = async () => {
    const montoStr = stripNum(formCredito.monto_original);
    const saldoStr = stripNum(formCredito.saldo_actual);
    if (!formCredito.banco?.trim()) {
      setError('El banco es obligatorio.'); return;
    }
    if (!montoStr || isNaN(parseFloat(montoStr))) {
      setError('El monto original es obligatorio.'); return;
    }
    if (saldoStr === '' || isNaN(parseFloat(saldoStr))) {
      setError('El saldo actual es obligatorio.'); return;
    }
    setGuardando(true); setError('');
    const payload: any = {
      ...formCredito,
      monto_original:     montoStr,
      saldo_actual:       saldoStr,
      concepto:           formCredito.concepto           || null,
      dia_corte:          formCredito.dia_corte          ? Number(formCredito.dia_corte) : null,
      tasa_anual:         formCredito.tasa_anual         ? stripNum(formCredito.tasa_anual) : null,
      cuota_base_mensual: formCredito.cuota_base_mensual ? stripNum(formCredito.cuota_base_mensual) : null,
      fecha_fin:          formCredito.fecha_fin          || null,
    };
    try {
      if (editandoId) {
        await editarCredito(editandoId, payload);
      } else {
        await crearCredito(payload);
      }
      setModalCredito(false);
      setEditandoId(null);
      cargar();
    } catch { setError(editandoId ? 'Error al editar crédito.' : 'Error al crear crédito.'); }
    finally { setGuardando(false); }
  };

  const guardarPago = async () => {
    if (!modalPago) return;
    if (!formPago.fecha_pago || formPago.interes === '') {
      setError('Intereses ordinarios y fecha de pago son obligatorios.'); return;
    }
    setGuardando(true); setError('');
    try {
      await registrarPagoCredito({
        credito_id:    modalPago.id,
        monto_capital: parseFloat(formPago.capital) || 0,
        monto_interes: parseFloat(formPago.interes) || 0,
        monto_iva:     parseFloat(formPago.iva)     || 0,
        fecha_pago:    formPago.fecha_pago,
        ...(formPago.tasa_aplicable ? { tasa_aplicable: parseFloat(formPago.tasa_aplicable) } : {}),
      });
      setModalPago(null);
      cargar();
    } catch { setError('Error al registrar pago.'); }
    finally { setGuardando(false); }
  };

  if (cargando) return <div className="py-20 text-center text-slate-400 text-sm">Cargando…</div>;

  return (
    <div>
      {/* Toolbar */}
      <div className="flex justify-end mb-5">
        <button
          onClick={() => { setFormCredito({ ...VACÍO_CREDITO }); setEditandoId(null); setError(''); setModalCredito(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-xl shadow-sm shadow-orange-500/25"
        >
          <Plus size={16} /> Nuevo crédito
        </button>
      </div>

      {/* Cards */}
      {creditos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400 shadow-sm">
          Sin créditos bancarios registrados.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {creditos.map(c => {
            const pct = Math.min(100, Math.max(0, parseFloat(c.porcentaje_pagado ?? '0')));
            // Pagos Fijos: usar cuota_base_mensual pactada directamente
            // Decrecientes/Solo Intereses: calcular con fórmula
            const pagoMes = (() => {
              if (c.esquema_pago === 'Pagos Fijos') {
                return c.cuota_base_mensual ? parseFloat(c.cuota_base_mensual) : null;
              }
              if (!c.tasa_anual || parseFloat(c.tasa_anual) <= 0) return null;
              const calc = calcPago(parseFloat(c.saldo_actual), parseFloat(c.monto_original), parseFloat(c.tasa_anual), c.fecha_fin, null, c.esquema_pago);
              if (!calc) return null;
              const v = parseFloat(calc.capital || '0') + parseFloat(calc.interes);
              return isNaN(v) ? null : v;
            })();
            return (
              <div key={c.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col gap-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      <Building2 size={18} className="text-blue-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{c.banco}</p>
                      <p className="text-xs text-slate-400">{c.alias_credito ?? '—'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      c.tipo_tasa === 'Variable'
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-slate-50 text-slate-500'
                    }`}>
                      {c.tipo_tasa}
                    </span>
                    <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                      {c.esquema_pago}
                    </span>
                  </div>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                    <span>Saldo: <strong className="text-slate-700">{fmt(c.saldo_actual)}</strong></span>
                    <span>{pct.toFixed(1)}% pagado</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div className="bg-orange-500 h-2.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Original: {fmt(c.monto_original)}</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-slate-50 rounded-xl p-2.5">
                    <p className="text-slate-400">Pago del mes</p>
                    <p className="font-semibold text-slate-700">
                      {pagoMes != null ? fmt(pagoMes) : '—'}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-2.5">
                    <p className="text-slate-400">Tasa anual</p>
                    <p className="font-semibold text-slate-700">
                      {c.tasa_anual ? `${parseFloat(c.tasa_anual).toFixed(2)}%` : '—'}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-2.5">
                    <p className="text-slate-400">Día de corte</p>
                    <p className="font-semibold text-slate-700">{c.dia_corte ?? '—'}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => abrirModalPago(c)}
                    className="flex-1 py-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded-xl transition-colors">
                    Registrar Pago
                  </button>
                  <button onClick={() => abrirEditar(c)}
                    className="px-3 py-2 text-sm bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-colors">
                    <Pencil size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal nuevo crédito ── */}
      {modalCredito && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">{editandoId ? 'Editar crédito' : 'Nuevo crédito bancario'}</h3>
              <button onClick={() => { setModalCredito(false); setEditandoId(null); }}><X size={18} className="text-slate-400" /></button>
            </div>
            {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500">Banco *</label>
                  <input value={formCredito.banco}
                    onChange={e => setFormCredito(f => ({ ...f, banco: fmtBanco(e.target.value) }))}
                    placeholder="BBVA" className={INPUT} />
                </div>
                <div>
                  <label className="text-xs text-slate-500">No. Referencia</label>
                  <input type="text" inputMode="numeric" value={formCredito.alias_credito}
                    onChange={e => setFormCredito(f => ({ ...f, alias_credito: fmtDigitos(e.target.value) }))}
                    placeholder="123456789" className={INPUT} />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500">Concepto</label>
                <input value={formCredito.concepto}
                  onChange={e => setFormCredito(f => ({ ...f, concepto: e.target.value }))}
                  placeholder="Ej. Crédito hipotecario casa cañada" className={INPUT} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500">Monto original *</label>
                  <input type="text" inputMode="decimal" value={formCredito.monto_original}
                    onChange={e => setFormCredito(f => ({ ...f, monto_original: fmtDinero(e.target.value) }))}
                    placeholder="500,000" className={INPUT} />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Saldo actual *</label>
                  <input type="text" inputMode="decimal" value={formCredito.saldo_actual}
                    onChange={e => setFormCredito(f => ({ ...f, saldo_actual: fmtDinero(e.target.value) }))}
                    placeholder="480,000" className={INPUT} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500">Tipo de tasa</label>
                  <select value={formCredito.tipo_tasa}
                    onChange={e => setFormCredito(f => ({ ...f, tipo_tasa: e.target.value as TipoTasaCredito }))}
                    className={INPUT + ' bg-white'}>
                    {TIPO_TASA.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Esquema de pago</label>
                  <select value={formCredito.esquema_pago}
                    onChange={e => setFormCredito(f => ({ ...f, esquema_pago: e.target.value as EsquemaPagoCredito }))}
                    className={INPUT + ' bg-white'}>
                    {ESQUEMAS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500">Tasa anual (%)</label>
                  <input type="text" inputMode="decimal" value={formCredito.tasa_anual}
                    onChange={e => setFormCredito(f => ({ ...f, tasa_anual: fmtDecimal(e.target.value) }))}
                    placeholder="11.7"
                    className={INPUT} />
                  {formCredito.tipo_tasa === 'Fija' && formCredito.tasa_anual && parseFloat(formCredito.tasa_anual) > 0 && (
                    <p className="text-xs text-blue-500 mt-0.5">
                      Tasa mensual: {parseFloat((parseFloat(formCredito.tasa_anual) / 12).toFixed(4))}%
                    </p>
                  )}
                </div>
                <FechaInput label="Fecha fin del crédito"
                  value={formCredito.fecha_fin}
                  onChange={v => setFormCredito(f => ({ ...f, fecha_fin: v }))} />
              </div>

              {formCredito.esquema_pago === 'Pagos Fijos' && (
                <div>
                  <label className="text-xs text-slate-500">Pago mensual pactado</label>
                  <input type="text" inputMode="decimal" value={formCredito.cuota_base_mensual}
                    onChange={e => setFormCredito(f => ({ ...f, cuota_base_mensual: fmtDinero(e.target.value) }))}
                    placeholder="27,781.08" className={INPUT} />
                  <p className="text-xs text-slate-400 mt-0.5">El monto fijo que acordaste con el banco cada mes</p>
                </div>
              )}

              <div>
                <label className="text-xs text-slate-500">Día de corte (1–31)</label>
                <input type="text" inputMode="numeric" value={formCredito.dia_corte}
                  onChange={e => setFormCredito(f => ({ ...f, dia_corte: fmtDiaCorte(e.target.value) }))}
                  placeholder="15" className={INPUT} />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => { setModalCredito(false); setEditandoId(null); }}
                className="flex-1 py-2 text-sm border border-slate-200 rounded-xl hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={guardarCredito} disabled={guardando}
                className="flex-1 py-2 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium disabled:opacity-50">
                {guardando ? 'Guardando…' : editandoId ? 'Guardar cambios' : 'Crear crédito'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Desglose Asistido ── */}
      {modalPago && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-slate-800">Registrar Pago</h3>
              <button onClick={() => setModalPago(null)}><X size={18} className="text-slate-400" /></button>
            </div>

            {/* Info del crédito */}
            <div className="bg-slate-50 rounded-xl p-3 mb-4 text-xs text-slate-500 space-y-0.5">
              <p>
                <span className="font-medium text-slate-700">{modalPago.banco}</span>
                {modalPago.alias_credito ? ` — ${modalPago.alias_credito}` : ''}
              </p>
              <p>
                Esquema: <span className="font-medium text-slate-700">{modalPago.esquema_pago}</span>
                {' · '}Saldo: <span className="font-medium text-slate-700">{fmt(modalPago.saldo_actual)}</span>
              </p>
              {modalPago.cuota_base_mensual && (
                <p>Cuota pactada: <span className="font-medium text-slate-700">{fmt(modalPago.cuota_base_mensual)}</span></p>
              )}
            </div>

            {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

            <div className="space-y-3">
              {/* Tasa variable — calcula el desglose al cambiar */}
              {modalPago.tipo_tasa === 'Variable' && (
                <div>
                  <label className="text-xs text-amber-600 font-medium">
                    Tasa aplicable este mes (%) <span className="font-normal text-slate-400">— autocompleta el desglose</span>
                  </label>
                  <input type="number" step="0.001" value={formPago.tasa_aplicable}
                    onChange={e => handleTasaAplicableChange(e.target.value)}
                    placeholder="Ingresa el % que te cobran este mes"
                    className="w-full mt-1 px-3 py-2 text-sm border border-amber-200 bg-amber-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
              )}

              <FechaInput label="Fecha de pago *"
                value={formPago.fecha_pago}
                onChange={v => setFormPago(f => ({ ...f, fecha_pago: v }))} />

              {/* Caja 1 — Capital */}
              <div>
                <label className="text-xs text-slate-500">
                  Caja 1 — Abono a Capital
                  {modalPago.esquema_pago === 'Solo Intereses' && (
                    <span className="ml-1 text-slate-400">(pre-llenado $0)</span>
                  )}
                  {modalPago.esquema_pago === 'Pagos Decrecientes' && modalPago.cuota_base_mensual && (
                    <span className="ml-1 text-slate-400">(cuota fija de capital)</span>
                  )}
                </label>
                <input type="number" step="0.01" value={formPago.capital}
                  onChange={e => setFormPago(f => ({ ...f, capital: e.target.value }))}
                  className={INPUT} />
              </div>

              {/* Caja 2 — Intereses */}
              <div>
                <label className="text-xs text-slate-500">Caja 2 — Intereses Ordinarios *</label>
                <input type="number" step="0.01" value={formPago.interes}
                  onChange={e => handleInteresChange(e.target.value)}
                  className={INPUT} />
              </div>

              {/* Caja 3 — IVA */}
              <div>
                <label className="text-xs text-slate-500">
                  Caja 3 — IVA de Intereses
                  <span className="ml-1 text-slate-400">(16% auto, editable)</span>
                </label>
                <input type="number" step="0.01" value={formPago.iva}
                  onChange={e => setFormPago(f => ({ ...f, iva: e.target.value }))}
                  className={INPUT} />
              </div>

              {/* Total + advertencia */}
              <div className={`rounded-xl p-3 ${mostrarWarningPF() ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Total a pagar</span>
                  <span className={`text-lg font-bold ${mostrarWarningPF() ? 'text-amber-600' : 'text-blue-700'}`}>
                    {fmt(totalPago())}
                  </span>
                </div>
                {mostrarWarningPF() && (
                  <div className="flex items-start gap-1.5 mt-2 text-xs text-amber-700">
                    <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                    <span>
                      El total ({fmt(totalPago())}) difiere de la cuota pactada ({fmt(modalPago.cuota_base_mensual!)}). Puedes guardar de todos modos.
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setModalPago(null)}
                className="flex-1 py-2 text-sm border border-slate-200 rounded-xl hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={guardarPago} disabled={guardando}
                className="flex-1 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium disabled:opacity-50">
                {guardando ? 'Guardando…' : 'Registrar pago'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeudasTab;
