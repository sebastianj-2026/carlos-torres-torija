import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Pencil, Plus, Phone, Mail, User,
  TrendingUp, History, ChevronDown, ChevronUp,
} from 'lucide-react';
import { PerfilInversionista as TPerfilInversionista, Inversion, EstatusInversion, InversionistaResumen } from '../../types/inversionista.types';
import { obtenerInversionista, cambiarEstatusInversion, crearInversion, listarInversionistas } from '../../services/inversionistasService';
import { useAuth } from '../../context/AuthContext';
import CardInversion from '../../components/inversionistas/CardInversion';
import HistorialMovimientos from '../../components/inversionistas/HistorialMovimientos';
import ModalPagoInteres from '../../components/inversionistas/ModalPagoInteres';
import ModalAgregarFondos from '../../components/inversionistas/ModalAgregarFondos';

const formatearMoneda = (valor: string | number): string => {
  const num = typeof valor === 'string' ? parseFloat(valor) : valor;
  if (isNaN(num)) return '$0.00';
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num);
};

// Mini formulario de nueva inversión (inline)
interface FormNuevaInversionProps {
  inversionistaId: string;
  onCancelar: () => void;
  onExito: () => void;
}

const inputCls = `w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm
  text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent`;

const mostrarMoneda = (raw: string): string => {
  if (!raw) return '';
  const tieneDecimal = raw.includes('.');
  const partes = raw.split('.');
  const entero = parseInt(partes[0] || '0', 10);
  if (isNaN(entero)) return '';
  const formatted = entero.toLocaleString('es-MX');
  return tieneDecimal ? `${formatted}.${(partes[1] || '').slice(0, 2)}` : formatted;
};

const FormNuevaInversion: React.FC<FormNuevaInversionProps> = ({
  inversionistaId,
  onCancelar,
  onExito,
}) => {
  const [datos, setDatos] = useState({
    monto_inicial:        '',
    tasa_interes_mensual: '',
    dia_pago:             '',
    forma_ingreso:        '',
    cuenta_deposito:      '',
    tiene_pagare:         false,
    fecha_inicio:         new Date().toISOString().split('T')[0],
    fecha_vencimiento:    '',
    notas:                '',
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // Referidor (otro inversionista) + su tasa de comisión.
  const [referidor, setReferidor]     = useState<InversionistaResumen | null>(null);
  const [qRef, setQRef]               = useState('');
  const [resultadosRef, setResultRef] = useState<InversionistaResumen[]>([]);
  const [tasaRef, setTasaRef]         = useState('');

  useEffect(() => {
    if (referidor || qRef.trim().length < 2) { setResultRef([]); return; }
    let vivo = true;
    const t = setTimeout(async () => {
      try {
        const r = await listarInversionistas({ buscar: qRef.trim() });
        if (vivo) setResultRef(r.inversionistas.filter((i) => i.id !== inversionistaId));
      } catch { if (vivo) setResultRef([]); }
    }, 250);
    return () => { vivo = false; clearTimeout(t); };
  }, [qRef, referidor, inversionistaId]);

  // Día de pago y fecha de vencimiento se derivan de fecha_inicio
  useEffect(() => {
    if (!datos.fecha_inicio) return;
    const inicio = new Date(datos.fecha_inicio + 'T12:00:00');
    const dia    = inicio.getDate();
    const venc   = new Date(inicio);
    venc.setMonth(venc.getMonth() + 12);
    setDatos((prev) => ({
      ...prev,
      dia_pago:          String(dia),
      fecha_vencimiento: venc.toISOString().split('T')[0],
    }));
  }, [datos.fecha_inicio]);

  const handleMontoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw    = e.target.value.replace(/[^0-9.]/g, '');
    const partes = raw.split('.');
    let limpio   = partes[0];
    if (partes.length > 1) limpio += '.' + partes[1].slice(0, 2);
    setDatos((prev) => ({ ...prev, monto_inicial: limpio }));
  };

  const handleTasaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    const partes = raw.split('.');
    let limpio = partes[0];
    if (partes.length > 1) limpio += '.' + partes[1].slice(0, 2);
    setDatos((prev) => ({ ...prev, tasa_interes_mensual: limpio }));
  };

  // Percentage with 2 decimals — 0.50 means 0.5% (NUMERIC(5,2) scale, M11)
  const handleTasaRefChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    const partes = raw.split('.');
    let limpio = partes[0];
    if (partes.length > 1) limpio += '.' + partes[1].slice(0, 2);
    setTasaRef(limpio);
  };

  const handleGuardar = async () => {
    const monto = parseFloat(datos.monto_inicial.replace(/,/g, '')) || 0;
    const tasa  = parseFloat(datos.tasa_interes_mensual) || 0;

    if (monto <= 0) {
      setError('El monto inicial es obligatorio y debe ser mayor a cero.'); return;
    }
    if (tasa <= 0) {
      setError('La tasa de interés es obligatoria.'); return;
    }
    if (!datos.fecha_inicio) {
      setError('La fecha de inicio es obligatoria.'); return;
    }
    const tasaReferidor = parseFloat(tasaRef) || 0;
    if (referidor && tasaReferidor <= 0) {
      setError('Indica la tasa mensual del referidor.'); return;
    }

    setGuardando(true);
    setError(null);
    try {
      await crearInversion(inversionistaId, {
        monto_inicial:        String(monto),
        tasa_interes_mensual: String(tasa),
        dia_pago:             datos.dia_pago,
        forma_ingreso:        datos.forma_ingreso as 'efectivo' | 'deposito' | '',
        cuenta_deposito:      datos.cuenta_deposito,
        tiene_pagare:         String(datos.tiene_pagare),
        fecha_inicio:         datos.fecha_inicio,
        fecha_vencimiento:    datos.fecha_vencimiento,
        notas:                datos.notas,
        referenciador_id:     referidor ? referidor.id : undefined,
        tasa_referenciador:   referidor ? tasaRef.trim() : undefined,
      } as never);
      onExito();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { mensaje?: string } } };
      setError(axiosError?.response?.data?.mensaje ?? 'Error al crear la inversión.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
      <h3 className="font-semibold text-slate-700">Nueva Inversión</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Monto inicial — campo moneda */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Monto inicial <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">$</span>
            <input
              type="text"
              inputMode="decimal"
              value={mostrarMoneda(datos.monto_inicial)}
              onChange={handleMontoChange}
              placeholder="0.00"
              className={`${inputCls} pl-7`}
            />
          </div>
        </div>

        {/* Tasa mensual — solo números */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Tasa mensual (%) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="decimal"
              value={datos.tasa_interes_mensual}
              onChange={handleTasaChange}
              placeholder="Ej: 2.5"
              className={inputCls}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">%</span>
          </div>
        </div>

        {/* Fecha inicio */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Fecha inicio <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={datos.fecha_inicio}
            onChange={(e) => setDatos((prev) => ({ ...prev, fecha_inicio: e.target.value }))}
            className={inputCls}
          />
        </div>

        {/* Fecha vencimiento */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Fecha vencimiento</label>
          <input
            type="date"
            value={datos.fecha_vencimiento}
            min={datos.fecha_inicio}
            onChange={(e) => setDatos((prev) => ({ ...prev, fecha_vencimiento: e.target.value }))}
            className={inputCls}
          />
        </div>

        {/* Día de pago — auto desde fecha inicio */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Día de pago
            <span className="text-slate-400 font-normal ml-1">(auto)</span>
          </label>
          <input
            type="number"
            min="1"
            max="31"
            value={datos.dia_pago}
            onChange={(e) => setDatos((prev) => ({ ...prev, dia_pago: e.target.value }))}
            className={inputCls}
          />
        </div>

        {/* Forma de ingreso — fondo blanco */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Forma de ingreso</label>
          <select
            value={datos.forma_ingreso}
            onChange={(e) => setDatos((prev) => ({ ...prev, forma_ingreso: e.target.value }))}
            className={inputCls}
          >
            <option value="">Seleccionar...</option>
            <option value="efectivo">Efectivo</option>
            <option value="deposito">Depósito</option>
          </select>
        </div>

        {/* Cuenta depósito */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Cuenta depósito</label>
          <input
            type="text"
            value={datos.cuenta_deposito}
            onChange={(e) => setDatos((prev) => ({ ...prev, cuenta_deposito: e.target.value }))}
            placeholder="Número de cuenta (si aplica)"
            className={inputCls}
          />
        </div>
      </div>

      {/* Pagaré */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={datos.tiene_pagare}
          onChange={(e) => setDatos((prev) => ({ ...prev, tiene_pagare: e.target.checked }))}
          className="w-4 h-4 rounded border-slate-300 text-sky-500 focus:ring-sky-400"
        />
        <span className="text-sm text-slate-700">Tiene pagaré</span>
      </label>

      {/* Referidor (otro inversionista) + su tasa */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <p className="text-xs font-medium text-slate-600">Referidor (opcional)</p>
        {referidor ? (
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1 flex items-center justify-between gap-2 px-3 py-2 bg-sky-50 rounded-lg border border-sky-100">
              <span className="text-sm text-slate-800">
                {referidor.nombres} {referidor.apellido_paterno}
              </span>
              <button
                type="button"
                onClick={() => { setReferidor(null); setQRef(''); setTasaRef(''); }}
                className="text-xs text-slate-400 hover:text-slate-700"
              >
                Quitar
              </button>
            </div>
            <div className="sm:w-40">
              <label className="block text-xs font-medium text-slate-600 mb-1">Tasa referidor (%)</label>
              <input
                type="text"
                inputMode="decimal"
                value={tasaRef}
                onChange={handleTasaRefChange}
                placeholder="Ej: 0.50"
                className={inputCls}
              />
              <p className="mt-1 text-[11px] text-slate-400">0.50 = 0.5% mensual</p>
            </div>
          </div>
        ) : (
          <div className="relative">
            <input
              type="text"
              value={qRef}
              onChange={(e) => setQRef(e.target.value)}
              placeholder="Buscar inversionista que refirió…"
              className={inputCls}
            />
            {resultadosRef.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full bg-white border border-slate-100 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {resultadosRef.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => { setReferidor(r); setResultRef([]); }}
                      className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      {r.nombres} {r.apellido_paterno}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Notas */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Notas</label>
        <textarea
          value={datos.notas}
          onChange={(e) => setDatos((prev) => ({ ...prev, notas: e.target.value }))}
          rows={2}
          className={`${inputCls} resize-none`}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancelar}
          className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200
                     rounded-xl hover:bg-white transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleGuardar}
          disabled={guardando}
          className="px-5 py-2 text-sm font-medium bg-sky-500 text-white rounded-xl
                     hover:bg-sky-600 transition-colors disabled:opacity-60"
        >
          {guardando ? 'Guardando...' : 'Crear inversión'}
        </button>
      </div>
    </div>
  );
};

// ================================================================
// Página principal del perfil
// ================================================================
const PerfilInversionista: React.FC = () => {
  const { id }      = useParams<{ id: string }>();
  const navigate    = useNavigate();
  const { usuario } = useAuth();
  const esAdmin     = usuario?.rol === 'administrador';

  const [perfil, setPerfil]                     = useState<TPerfilInversionista | null>(null);
  const [cargando, setCargando]                 = useState(true);
  const [error, setError]                       = useState<string | null>(null);
  const [mostrarFormInv, setMostrarFormInv]     = useState(false);
  const [inversionSeleccionada, setInvSelec]    = useState<Inversion | null>(null);
  const [modalAbierto, setModalAbierto]         = useState<'pago' | 'fondos' | null>(null);
  const [recargarHistorial, setRecargarHistorial] = useState(0);
  const [historialExpandido, setHistorialExp]   = useState<string | null>(null);
  const [menuEstatus, setMenuEstatus]           = useState<string | null>(null);

  const cargarPerfil = useCallback(async () => {
    if (!id) return;
    setCargando(true);
    setError(null);
    try {
      const datos = await obtenerInversionista(id);
      setPerfil(datos);
    } catch {
      setError('No se pudo cargar el perfil del inversionista.');
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => { cargarPerfil(); }, [cargarPerfil]);

  const handleRegistrarPago = (inv: Inversion) => {
    setInvSelec(inv);
    setModalAbierto('pago');
  };

  const handleAgregarFondos = (inv: Inversion) => {
    setInvSelec(inv);
    setModalAbierto('fondos');
  };

  const handleCerrarModal = () => {
    setModalAbierto(null);
    setInvSelec(null);
  };

  const handleExitoModal = () => {
    handleCerrarModal();
    setRecargarHistorial((prev) => prev + 1);
    cargarPerfil(); // recargar para actualizar montos
  };

  const handleCambiarEstatus = async (inv: Inversion, estatus: EstatusInversion) => {
    try {
      await cambiarEstatusInversion(inv.id, estatus);
      setMenuEstatus(null);
      cargarPerfil();
    } catch {
      // silencio — podría mostrarse toast en el futuro
    }
  };

  // ── Render de carga ──
  if (cargando) {
    return (
      <div className="p-6 lg:p-8 space-y-4 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/3" />
        <div className="bg-white rounded-2xl p-6 border border-slate-100">
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-4 bg-slate-200 rounded w-2/3" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error || !perfil) {
    return (
      <div className="p-6 lg:p-8 text-center">
        <p className="text-red-600 mb-4">{error ?? 'Inversionista no encontrado.'}</p>
        <button onClick={() => navigate('/inversionistas')} className="text-sky-500 underline">
          Volver a la lista
        </button>
      </div>
    );
  }

  // Totales calculados
  const invActivas  = perfil.inversiones.filter((i) => i.estatus === 'activo');
  const totalActivo = invActivas.reduce((s, i) => s + parseFloat(i.monto_actual), 0);

  return (
    <div className="p-6 lg:p-8">
      {/* Breadcrumb y acciones */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/inversionistas')}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {perfil.apellido_paterno} {perfil.apellido_materno ?? ''} {perfil.nombres}
            </h2>
            <p className="text-sm text-slate-500">Perfil de inversionista</p>
          </div>
        </div>
        <button
          onClick={() => navigate(`/inversionistas/${perfil.id}/editar`)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium
                     border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <Pencil size={14} />
          Editar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Columna izquierda: datos personales y resumen ── */}
        <div className="space-y-5">
          {/* Datos personales */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <User size={16} className="text-slate-400" />
              <h3 className="font-semibold text-slate-700 text-sm">Datos personales</h3>
            </div>
            <div className="space-y-3">
              {perfil.telefono && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone size={14} className="text-slate-400 shrink-0" />
                  <span className="text-slate-700">{perfil.telefono}</span>
                </div>
              )}
              {perfil.correo && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail size={14} className="text-slate-400 shrink-0" />
                  <span className="text-slate-700">{perfil.correo}</span>
                </div>
              )}
              <p className="text-xs text-slate-400">
                Registrado: {new Date(perfil.fecha_registro).toLocaleDateString('es-MX')}
              </p>
            </div>
          </div>

          {/* Resumen financiero */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-sky-400" />
              <h3 className="font-semibold text-slate-700 text-sm">Resumen</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-500">Total activo</p>
                <p className="font-bold text-slate-800">{formatearMoneda(totalActivo)}</p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-500">Inversiones activas</p>
                <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-600
                                 text-xs font-bold flex items-center justify-center">
                  {invActivas.length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-500">Total inversiones</p>
                <p className="text-sm font-medium text-slate-700">{perfil.inversiones.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Columna derecha: inversiones + historial ── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Encabezado de inversiones */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-700">
              Inversiones ({perfil.inversiones.length})
            </h3>
            {esAdmin && (
              <button
                onClick={() => setMostrarFormInv(!mostrarFormInv)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                           bg-sky-500 text-white rounded-xl hover:bg-sky-600 transition-colors"
              >
                <Plus size={14} />
                Nueva inversión
              </button>
            )}
          </div>

          {/* Formulario inline para nueva inversión */}
          {mostrarFormInv && esAdmin && (
            <FormNuevaInversion
              inversionistaId={perfil.id}
              onCancelar={() => setMostrarFormInv(false)}
              onExito={() => { setMostrarFormInv(false); cargarPerfil(); }}
            />
          )}

          {/* Cards de inversiones */}
          {perfil.inversiones.length === 0 && !mostrarFormInv ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center">
              <p className="text-slate-500 text-sm">Sin inversiones registradas.</p>
              {esAdmin && (
                <button
                  onClick={() => setMostrarFormInv(true)}
                  className="mt-3 text-sky-500 text-sm hover:underline"
                >
                  + Crear primera inversión
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {perfil.inversiones.map((inv) => (
                <div key={inv.id}>
                  <div className="relative">
                    <CardInversion
                      inversion={inv}
                      onRegistrarPago={handleRegistrarPago}
                      onAgregarFondos={handleAgregarFondos}
                      onCambiarEstatus={esAdmin ? () => setMenuEstatus(menuEstatus === inv.id ? null : inv.id) : undefined}
                    />

                    {/* Menú de cambio de estatus */}
                    {menuEstatus === inv.id && (
                      <div className="absolute right-3 bottom-14 z-10 bg-white border border-slate-200
                                      rounded-xl shadow-lg py-1 min-w-[160px]">
                        {(['activo', 'pausado', 'liquidado', 'vencido'] as EstatusInversion[]).map((e) => (
                          <button
                            key={e}
                            onClick={() => handleCambiarEstatus(inv, e)}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 capitalize
                                       ${inv.estatus === e ? 'text-sky-600 font-semibold' : 'text-slate-700'}`}
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Historial desplegable por inversión */}
                  <button
                    onClick={() => setHistorialExp(historialExpandido === inv.id ? null : inv.id)}
                    className="w-full mt-1.5 flex items-center justify-center gap-1.5
                               text-xs text-slate-400 hover:text-slate-700 transition-colors py-1"
                  >
                    <History size={12} />
                    Historial
                    {historialExpandido === inv.id
                      ? <ChevronUp size={12} />
                      : <ChevronDown size={12} />}
                  </button>

                  {historialExpandido === inv.id && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mt-1 p-4">
                      <HistorialMovimientos
                        inversionId={inv.id}
                        recargarClave={recargarHistorial}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modales */}
      {modalAbierto === 'pago' && inversionSeleccionada && (
        <ModalPagoInteres
          inversion={inversionSeleccionada}
          onCerrar={handleCerrarModal}
          onExito={handleExitoModal}
        />
      )}
      {modalAbierto === 'fondos' && inversionSeleccionada && (
        <ModalAgregarFondos
          inversion={inversionSeleccionada}
          onCerrar={handleCerrarModal}
          onExito={handleExitoModal}
        />
      )}

      {/* Cerrar menú estatus al hacer clic afuera */}
      {menuEstatus && (
        <div className="fixed inset-0 z-[5]" onClick={() => setMenuEstatus(null)} />
      )}
    </div>
  );
};

export default PerfilInversionista;
