import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Landmark, X, Copy, Check, CreditCard } from 'lucide-react';
import { CuentaBancaria, FormCuentaData } from '../../types/tesoreria.types';
import { listarCuentas, crearCuenta, editarCuenta, desactivarCuenta } from '../../services/tesoreriaService';
import { useAuth } from '../../context/AuthContext';

const fmt = (v: string | number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(
    typeof v === 'string' ? parseFloat(v) : v
  );

// ── Gradientes por banco ──────────────────────────────────────────
const BANK_GRADIENTS: [string, string][] = [
  ['BBVA',        'from-[#004481] to-[#1464A5]'],
  ['BANORTE',     'from-[#8B0E23] to-[#C41230]'],
  ['SCOTIABANK',  'from-[#B31920] to-[#7A1015]'],
  ['BANBAJIO',    'from-[#005530] to-[#007A45]'],
  ['HSBC',        'from-[#A50009] to-[#DB0011]'],
  ['BANAMEX',     'from-[#002060] to-[#003F8A]'],
  ['CITIBANAMEX', 'from-[#002060] to-[#003F8A]'],
  ['SANTANDER',   'from-[#8B0E23] to-[#C41230]'],
  ['INBURSA',     'from-[#003F5C] to-[#1A6B8A]'],
  ['AZTECA',      'from-[#F59E0B] to-[#D97706]'],
];
const getBankGradient = (banco: string) => {
  const up = banco.toUpperCase();
  return BANK_GRADIENTS.find(([k]) => up.includes(k))?.[1] ?? 'from-slate-600 to-slate-800';
};

// ── Máscaras ──────────────────────────────────────────────────────
const maskEnd4  = (s: string) => `**** ${s.slice(-4)}`;
const maskCard  = (s: string) => `**** **** **** ${s.slice(-4)}`;

// ── Validadores ───────────────────────────────────────────────────
const onlyDigits = (s: string) => s.replace(/\D/g, '');

// ── Botón copiar ──────────────────────────────────────────────────
const CopyBtn: React.FC<{ text: string }> = ({ text }) => {
  const [ok, setOk] = useState(false);
  const handle = async () => {
    await navigator.clipboard.writeText(text);
    setOk(true);
    setTimeout(() => setOk(false), 1500);
  };
  return (
    <button onClick={handle}
      className="p-0.5 rounded text-white/50 hover:text-white transition-colors">
      {ok ? <Check size={11} /> : <Copy size={11} />}
    </button>
  );
};

// ── Tarjeta bancaria visual ───────────────────────────────────────
const BankCard: React.FC<{
  cuenta: CuentaBancaria;
  esAdmin: boolean;
  onEditar: () => void;
  onDesactivar: () => void;
}> = ({ cuenta: c, esAdmin, onEditar, onDesactivar }) => {
  const grad = getBankGradient(c.banco);

  return (
    <div className="flex flex-col gap-3">
      {/* Plástico */}
      <div className={`relative bg-gradient-to-br ${grad} rounded-2xl p-5 text-white shadow-lg
                       aspect-[86/54] flex flex-col justify-between overflow-hidden select-none`}>
        {/* Círculos decorativos */}
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -right-4 -bottom-10 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />

        {/* Fila superior: banco + chip */}
        <div className="flex items-start justify-between relative z-10">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">
              {c.banco}
            </p>
            <p className="text-sm font-bold truncate max-w-[180px] mt-0.5">{c.alias}</p>
          </div>
          <CreditCard size={20} className="text-white/35 shrink-0" />
        </div>

        {/* Números */}
        <div className="relative z-10 space-y-1">
          {c.numero_tarjeta && (
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-sm tracking-[0.14em]">{maskCard(c.numero_tarjeta)}</span>
              <CopyBtn text={c.numero_tarjeta} />
            </div>
          )}
          {c.numero_cuenta && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-white/55 uppercase tracking-wide w-8">CTA</span>
              <span className="font-mono text-xs tracking-widest">{maskEnd4(c.numero_cuenta)}</span>
              <CopyBtn text={c.numero_cuenta} />
            </div>
          )}
          {c.clabe && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-white/55 uppercase tracking-wide w-8">CLABE</span>
              <span className="font-mono text-xs tracking-widest">{maskEnd4(c.clabe)}</span>
              <CopyBtn text={c.clabe} />
            </div>
          )}
        </div>

        {/* Fila inferior: titular + estatus */}
        <div className="flex items-end justify-between relative z-10">
          <p className="text-[11px] text-white/65 uppercase tracking-wider truncate max-w-[170px]">
            {c.titular}
          </p>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
            c.activa ? 'bg-white/20' : 'bg-red-500/60'
          }`}>
            {c.activa ? 'Activa' : 'Inactiva'}
          </span>
        </div>
      </div>

      {/* Saldo + acciones */}
      <div className="flex items-center justify-between px-1">
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">Saldo actual</p>
          <p className="text-xl font-bold text-orange-600">{fmt(c.saldo_actual)}</p>
        </div>
        <div className="flex gap-1">
          <button onClick={onEditar}
            className="p-2 text-slate-400 hover:text-orange-500 rounded-xl hover:bg-orange-50 transition-colors">
            <Pencil size={14} />
          </button>
          {esAdmin && (
            <button onClick={onDesactivar}
              className="p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 transition-colors">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Componente principal ──────────────────────────────────────────
const DATOS_VACIOS: FormCuentaData = {
  alias: '', titular: '', banco: '', clabe: '',
  numero_cuenta: '', numero_tarjeta: '', saldo_inicial: '', notas: '',
};

interface FormErrors {
  clabe?: string;
  numero_tarjeta?: string;
  general?: string;
}

const SeccionCuentas: React.FC = () => {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === 'administrador';

  const [cuentas,  setCuentas]  = useState<CuentaBancaria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modal,    setModal]    = useState(false);
  const [editTarget, setEdit]   = useState<CuentaBancaria | null>(null);
  const [form,     setForm]     = useState<FormCuentaData>(DATOS_VACIOS);
  const [errors,   setErrors]   = useState<FormErrors>({});
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try { setCuentas(await listarCuentas()); }
    finally { setCargando(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirCrear = () => {
    setEdit(null); setForm(DATOS_VACIOS); setErrors({}); setModal(true);
  };

  const abrirEditar = (c: CuentaBancaria) => {
    setEdit(c);
    setForm({
      alias: c.alias, titular: c.titular, banco: c.banco,
      clabe: c.clabe ?? '', numero_cuenta: c.numero_cuenta ?? '',
      numero_tarjeta: c.numero_tarjeta ?? '', saldo_inicial: '', notas: c.notas ?? '',
    });
    setErrors({}); setModal(true);
  };

  const cerrar = () => { setModal(false); setErrors({}); };

  // Setters con filtro numérico donde aplica
  const setField = (k: keyof FormCuentaData, v: string) => {
    const numericFields: (keyof FormCuentaData)[] = ['clabe', 'numero_cuenta', 'numero_tarjeta'];
    const val = numericFields.includes(k) ? onlyDigits(v) : v;
    setForm(f => ({ ...f, [k]: val }));

    // Validación en tiempo real
    if (k === 'clabe' && val.length > 0 && val.length !== 18) {
      setErrors(e => ({ ...e, clabe: `${val.length}/18 dígitos` }));
    } else if (k === 'clabe') {
      setErrors(e => ({ ...e, clabe: undefined }));
    }
    if (k === 'numero_tarjeta' && val.length > 0 && val.length !== 16) {
      setErrors(e => ({ ...e, numero_tarjeta: `${val.length}/16 dígitos` }));
    } else if (k === 'numero_tarjeta') {
      setErrors(e => ({ ...e, numero_tarjeta: undefined }));
    }
  };

  const validate = (): boolean => {
    const errs: FormErrors = {};
    if (!form.banco.trim() || !form.titular.trim()) {
      errs.general = 'Banco y titular son obligatorios.';
    }
    if (form.clabe && form.clabe.length !== 18) {
      errs.clabe = 'La CLABE debe tener exactamente 18 dígitos.';
    }
    if (form.numero_tarjeta && form.numero_tarjeta.length !== 16) {
      errs.numero_tarjeta = 'El número de tarjeta debe tener exactamente 16 dígitos.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleGuardar = async () => {
    if (!validate()) return;
    setGuardando(true);
    try {
      const payload = {
        alias:          form.alias.trim() || form.banco.trim(),
        titular:        form.titular.trim(),
        banco:          form.banco.trim(),
        clabe:          form.clabe          || undefined,
        numero_cuenta:  form.numero_cuenta  || undefined,
        numero_tarjeta: form.numero_tarjeta || undefined,
        notas:          form.notas.trim()   || undefined,
        ...(!editTarget && { saldo_inicial: parseFloat(form.saldo_inicial) || 0 }),
      };
      if (editTarget) { await editarCuenta(editTarget.id, payload); }
      else            { await crearCuenta(payload); }
      await cargar();
      cerrar();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { mensaje?: string } } };
      setErrors({ general: e?.response?.data?.mensaje ?? 'Error al guardar.' });
    } finally {
      setGuardando(false);
    }
  };

  const handleDesactivar = async (c: CuentaBancaria) => {
    if (!window.confirm(`¿Desactivar la cuenta "${c.alias}"?`)) return;
    try { await desactivarCuenta(c.id); await cargar(); } catch { /* silencioso */ }
  };

  const totalSaldo = cuentas.reduce((s, c) => s + parseFloat(c.saldo_actual), 0);

  const inputCls = (err?: string) =>
    `w-full px-3 py-2.5 text-sm border rounded-lg bg-white text-slate-800
     placeholder-slate-300 focus:outline-none focus:ring-2 transition-all ${
       err
         ? 'border-red-300 focus:ring-red-400'
         : 'border-slate-200 focus:ring-orange-400'
     }`;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {cuentas.length} cuenta{cuentas.length !== 1 ? 's' : ''}
          {cuentas.length > 0 && (
            <span className="ml-2 font-semibold text-slate-700">
              · Total: {fmt(totalSaldo)}
            </span>
          )}
        </p>
        <button onClick={abrirCrear}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600
                     text-white text-sm font-medium rounded-xl shadow-sm transition-colors">
          <Plus size={15} /> Nueva cuenta
        </button>
      </div>

      {/* Grid */}
      {cargando ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-slate-200 animate-pulse aspect-[86/54]" />
          ))}
        </div>
      ) : cuentas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <Landmark size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Sin cuentas bancarias registradas.</p>
          <button onClick={abrirCrear} className="mt-3 text-orange-500 text-sm font-medium hover:underline">
            Agregar primera cuenta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cuentas.map(c => (
            <BankCard
              key={c.id}
              cuenta={c}
              esAdmin={esAdmin}
              onEditar={() => abrirEditar(c)}
              onDesactivar={() => handleDesactivar(c)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={e => { if (e.target === e.currentTarget) cerrar(); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">
                {editTarget ? 'Editar cuenta' : 'Nueva cuenta bancaria'}
              </h3>
              <button onClick={cerrar} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Banco */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Banco <span className="text-orange-500">*</span>
                </label>
                <input value={form.banco}
                  onChange={e => setField('banco', e.target.value)}
                  placeholder="BBVA, BANORTE, SCOTIABANK…"
                  className={inputCls()} />
              </div>

              {/* Titular */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Titular <span className="text-orange-500">*</span>
                </label>
                <input value={form.titular}
                  onChange={e => setField('titular', e.target.value)}
                  placeholder="Nombre en la cuenta"
                  className={inputCls()} />
              </div>

              {/* Alias */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Alias interno
                </label>
                <input value={form.alias}
                  onChange={e => setField('alias', e.target.value)}
                  placeholder="Ej: BBVA Operaciones (opcional)"
                  className={inputCls()} />
              </div>

              {/* CLABE */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  CLABE interbancaria
                  <span className="ml-1 font-normal text-slate-400">(18 dígitos)</span>
                </label>
                <input
                  inputMode="numeric"
                  maxLength={18}
                  value={form.clabe}
                  onChange={e => setField('clabe', e.target.value)}
                  placeholder="000000000000000000"
                  className={inputCls(errors.clabe)}
                />
                {errors.clabe && (
                  <p className="mt-1 text-xs text-red-500 font-medium">
                    CLABE inválida — {errors.clabe}
                  </p>
                )}
                {!errors.clabe && form.clabe.length === 18 && (
                  <p className="mt-1 text-xs text-emerald-600 font-medium">✓ CLABE válida</p>
                )}
              </div>

              {/* Número de cuenta */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Número de cuenta
                </label>
                <input
                  inputMode="numeric"
                  value={form.numero_cuenta}
                  onChange={e => setField('numero_cuenta', e.target.value)}
                  placeholder="Solo dígitos"
                  className={inputCls()} />
              </div>

              {/* Número de tarjeta */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Número de tarjeta
                  <span className="ml-1 font-normal text-slate-400">(16 dígitos, opcional)</span>
                </label>
                <input
                  inputMode="numeric"
                  maxLength={16}
                  value={form.numero_tarjeta}
                  onChange={e => setField('numero_tarjeta', e.target.value)}
                  placeholder="0000000000000000"
                  className={inputCls(errors.numero_tarjeta)}
                />
                {errors.numero_tarjeta && (
                  <p className="mt-1 text-xs text-red-500 font-medium">
                    Tarjeta inválida — {errors.numero_tarjeta}
                  </p>
                )}
                {!errors.numero_tarjeta && form.numero_tarjeta.length === 16 && (
                  <p className="mt-1 text-xs text-emerald-600 font-medium">✓ Número válido</p>
                )}
              </div>

              {/* Saldo inicial — solo en creación */}
              {!editTarget && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    Saldo inicial (MXN)
                  </label>
                  <input type="number" min="0" step="0.01"
                    value={form.saldo_inicial}
                    onChange={e => setForm(f => ({ ...f, saldo_inicial: e.target.value }))}
                    placeholder="0.00"
                    className={inputCls()} />
                </div>
              )}

              {/* Notas */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Notas
                </label>
                <textarea value={form.notas}
                  onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                  rows={2} placeholder="Observaciones opcionales…"
                  className={`${inputCls()} resize-none`} />
              </div>

              {errors.general && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{errors.general}</p>
              )}
            </div>

            <div className="flex gap-2 px-6 pb-6 pt-2 border-t border-slate-100">
              <button onClick={cerrar}
                className="flex-1 py-2 text-sm text-slate-500 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors">
                Cancelar
              </button>
              <button onClick={handleGuardar} disabled={guardando}
                className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold
                           rounded-xl transition-colors disabled:opacity-60">
                {guardando ? 'Guardando…' : editTarget ? 'Actualizar' : 'Crear cuenta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeccionCuentas;
