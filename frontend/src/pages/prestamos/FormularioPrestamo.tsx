import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Save, FileText, Plus, X, TrendingDown,
  Building2, CheckCircle2, Upload, AlertCircle,
} from 'lucide-react';
import {
  FormularioPrestamoData,
  TipoGarantia,
  TipoArchivoPrestamo,
  ETIQUETAS_ARCHIVO_PRESTAMO,
} from '../../types/prestamo.types';
import {
  crearPrestamo,
  editarPrestamo,
  obtenerPrestamo,
  listarArchivosPrestamo,
  subirArchivoPrestamo,
} from '../../services/prestamosService';
import { listarClientes } from '../../services/clientesService';
import { listarInversionistas } from '../../services/inversionistasService';
import { ClienteResumen } from '../../types/cliente.types';
import { InversionistaResumen } from '../../types/inversionista.types';

// ── Tipos internos ────────────────────────────────────────────────
interface InvParticipante {
  uid: string;
  inversionista_id: string;
  monto_aportado: string;
  tasa_rendimiento: string;
}

type ArchivosState = Record<TipoArchivoPrestamo, File | null>;

const archivosParaTipo = (tipo: TipoGarantia): TipoArchivoPrestamo[] => {
  if (tipo === 'pagare') return ['pagare_firmado', 'contrato_firmado'];
  if (tipo === 'otra')   return ['documento_propiedad', 'contrato_terminos'];
  return ['avaluo', 'gastos_notariales', 'escritura', 'contrato_firmado'];
};

// ── Helpers ───────────────────────────────────────────────────────
const parsear = (s: string): number =>
  parseFloat((s || '').replace(/,/g, '')) || 0;

const mostrarMoneda = (raw: string): string => {
  if (!raw) return '';
  const tieneDecimal = raw.includes('.');
  const partes = raw.split('.');
  const entero = parseInt(partes[0] || '0', 10);
  if (isNaN(entero)) return '';
  const formatted = entero.toLocaleString('es-MX');
  return tieneDecimal ? `${formatted}.${(partes[1] || '').slice(0, 2)}` : formatted;
};

const fmt = (n: number): string =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

const fmtBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ── Opciones de garantía ──────────────────────────────────────────
const OPCIONES_GARANTIA: { valor: TipoGarantia; etiqueta: string; icono: string; descripcion: string }[] = [
  { valor: 'hipotecaria', etiqueta: 'Garantía Hipotecaria', icono: '🏠', descripcion: 'Inmueble como respaldo'  },
  { valor: 'pagare',      etiqueta: 'Pagaré',               icono: '📄', descripcion: 'Documento notarial'     },
  { valor: 'otra',        etiqueta: 'Otra Garantía',        icono: '📎', descripcion: 'Otro tipo de respaldo'  },
];

const inputCls = `w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white
  text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2
  focus:ring-orange-400 focus:border-transparent transition-all`;

// ── Selector de garantía ──────────────────────────────────────────
const SelectorGarantia: React.FC<{
  valor: TipoGarantia;
  onChange: (v: TipoGarantia) => void;
}> = ({ valor, onChange }) => (
  <div>
    <label className="block text-xs font-medium text-slate-600 mb-2">
      Tipo de garantía <span className="text-orange-500">*</span>
    </label>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {OPCIONES_GARANTIA.map((op) => (
        <button
          key={op.valor}
          type="button"
          onClick={() => onChange(op.valor)}
          className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 text-center
                      transition-all duration-150 ${
                        valor === op.valor
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
        >
          <span className="text-xl leading-none">{op.icono}</span>
          <span className={`text-xs font-semibold leading-tight ${valor === op.valor ? 'text-orange-600' : 'text-slate-600'}`}>
            {op.etiqueta}
          </span>
          <span className="text-[10px] text-slate-400 leading-tight">{op.descripcion}</span>
        </button>
      ))}
    </div>
  </div>
);

// ── Campo de texto genérico ───────────────────────────────────────
const Campo: React.FC<{
  label: string;
  valor: string;
  onChange: (v: string) => void;
  tipo?: string;
  requerido?: boolean;
  placeholder?: string;
  min?: string;
}> = ({ label, valor, onChange, tipo = 'text', requerido = false, placeholder, min }) => (
  <div>
    <label className="block text-xs font-medium text-slate-600 mb-1.5">
      {label}{requerido && <span className="text-orange-500 ml-0.5">*</span>}
    </label>
    <input
      type={tipo}
      value={valor}
      min={min}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={inputCls}
    />
  </div>
);

// ── Campo moneda con formato de comas ─────────────────────────────
const CampoMoneda: React.FC<{
  label: string;
  valor: string;
  onChange: (v: string) => void;
  requerido?: boolean;
  placeholder?: string;
}> = ({ label, valor, onChange, requerido = false, placeholder = '0.00' }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw    = e.target.value.replace(/[^0-9.]/g, '');
    const partes = raw.split('.');
    let limpio   = partes[0];
    if (partes.length > 1) limpio += '.' + partes[1].slice(0, 2);
    onChange(limpio);
  };
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">
        {label}{requerido && <span className="text-orange-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">$</span>
        <input
          type="text"
          inputMode="decimal"
          value={mostrarMoneda(valor)}
          onChange={handleChange}
          placeholder={placeholder}
          className={`${inputCls} pl-7`}
        />
      </div>
    </div>
  );
};

// ── Card de inversionista participante ────────────────────────────
const CardInversionista: React.FC<{
  part: InvParticipante;
  tasaPrestamo: number;
  inversionistas: InversionistaResumen[];
  onChange: (uid: string, campo: keyof InvParticipante, valor: string) => void;
  onEliminar: (uid: string) => void;
}> = ({ part, tasaPrestamo, inversionistas, onChange, onEliminar }) => {
  const monto        = parsear(part.monto_aportado);
  const tasa         = parseFloat(part.tasa_rendimiento) || 0;
  const interesMensual = monto * tasa / 100;
  const diferencial  = monto * (tasaPrestamo - tasa) / 100;
  const tasaInvalida = tasa > 0 && tasaPrestamo > 0 && tasa > tasaPrestamo;

  const invSeleccionado = inversionistas.find((inv) => inv.id === part.inversionista_id);
  const capitalDisponible = invSeleccionado ? parseFloat(invSeleccionado.capital_disponible) : null;
  const capitalInsuficiente = capitalDisponible !== null && monto > 0 && monto > capitalDisponible + 0.009;

  return (
    <div className={`border rounded-xl p-4 bg-white relative ${capitalInsuficiente ? 'border-red-300' : 'border-slate-200'}`}>
      <button
        type="button"
        onClick={() => onEliminar(part.uid)}
        className="absolute top-3 right-3 p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
      >
        <X size={14} />
      </button>
      <div className="flex items-center gap-2 mb-3">
        <TrendingDown size={14} className="text-orange-400" />
        <span className="text-sm font-semibold text-slate-700">Inversionista</span>
      </div>
      <select
        value={part.inversionista_id}
        onChange={(e) => onChange(part.uid, 'inversionista_id', e.target.value)}
        className={inputCls}
      >
        <option value="">— Selecciona inversionista —</option>
        {inversionistas.map((inv) => {
          const disp = parseFloat(inv.capital_disponible);
          return (
            <option key={inv.id} value={inv.id}>
              {inv.nombres} {inv.apellido_paterno}{inv.apellido_materno ? ` ${inv.apellido_materno}` : ''} — {fmt(disp)} Disp.
            </option>
          );
        })}
      </select>

      {invSeleccionado && capitalDisponible !== null && (
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-slate-500">Capital disponible:</span>
          <span className={`font-semibold ${capitalDisponible > 0 ? 'text-green-600' : 'text-red-500'}`}>
            {fmt(capitalDisponible)}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
        <CampoMoneda
          label="Monto aportado"
          valor={part.monto_aportado}
          onChange={(v) => onChange(part.uid, 'monto_aportado', v)}
        />
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Tasa que recibe (%)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={part.tasa_rendimiento}
            onChange={(e) => onChange(part.uid, 'tasa_rendimiento', e.target.value)}
            placeholder="Ej: 1.5"
            className={`${inputCls} ${tasaInvalida ? 'border-red-300 focus:ring-red-400' : ''}`}
          />
        </div>
      </div>
      {capitalInsuficiente && (
        <p className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg mt-2">
          Capital insuficiente: disponible {fmt(capitalDisponible!)}, requerido {fmt(monto)}
        </p>
      )}
      {tasaInvalida && (
        <p className="text-xs text-red-500 mt-1.5">
          La tasa no puede ser mayor a la del préstamo ({tasaPrestamo}%)
        </p>
      )}
      {monto > 0 && tasa > 0 && !tasaInvalida && !capitalInsuficiente && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
          <div className="flex justify-between text-xs font-bold text-green-700">
            <span>Interés al inversionista</span>
            <span>{fmt(interesMensual)}/mes</span>
          </div>
          {diferencial > 0.001 && (
            <div className="flex justify-between text-xs text-orange-500">
              <span>Diferencial → Oficina TS ({(tasaPrestamo - tasa).toFixed(2)}%)</span>
              <span>{fmt(diferencial)}/mes</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Panel de Resumen Financiero reactivo ──────────────────────────
const PanelResumenFinanciero: React.FC<{
  montoTotal: number;
  montoOficina: number;
  tasaPrestamo: number;
  tasaMoratoria: number;
  plazoMeses: number;
  fechaInicio: string;
  apertura: number;
  avaluo: number;
  gastosNotariales: number;
  invParticipantes: InvParticipante[];
  inversionistas: InversionistaResumen[];
}> = ({
  montoTotal, montoOficina, tasaPrestamo, tasaMoratoria,
  plazoMeses, fechaInicio, apertura, avaluo, gastosNotariales,
  invParticipantes, inversionistas,
}) => {
  if (montoTotal <= 0 || tasaPrestamo <= 0) return null;

  const interesAnticipado   = montoTotal * tasaPrestamo / 100;
  const totalDeducciones    = interesAnticipado + apertura + avaluo + gastosNotariales;
  const netoCliente         = montoTotal - totalDeducciones;
  const interesOficina      = montoOficina > 0 ? montoOficina * tasaPrestamo / 100 : 0;
  const diferencialOficina  = invParticipantes.reduce((sum, p) => {
    const m = parsear(p.monto_aportado);
    const t = parseFloat(p.tasa_rendimiento) || 0;
    return sum + m * (tasaPrestamo - t) / 100;
  }, 0);
  const totalOficina        = interesOficina + diferencialOficina;
  const totalInversionistas = invParticipantes.reduce((sum, p) => {
    const m = parsear(p.monto_aportado);
    const t = parseFloat(p.tasa_rendimiento) || 0;
    return sum + m * t / 100;
  }, 0);
  const totalInteresMensual = montoTotal * tasaPrestamo / 100;
  const interesMoretorio    = montoTotal * tasaMoratoria / 100;
  // Proyecciones de rentabilidad
  const gananciaAnual       = plazoMeses > 0 ? totalOficina * 12 : 0;
  // % Ganancia Anual de la Oficina = (interés anual oficina / monto prestado) × 100
  const pctGananciaAnual    = montoTotal > 0 ? (gananciaAnual / montoTotal) * 100 : 0;

  let fechaVenc = '';
  let diaPago = 0;
  if (fechaInicio && plazoMeses > 0) {
    const inicio = new Date(fechaInicio + 'T12:00:00');
    diaPago = inicio.getDate();
    const d = new Date(inicio);
    d.setMonth(d.getMonth() + plazoMeses);
    d.setDate(d.getDate() - 1);
    fechaVenc = d.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  return (
    <div className="rounded-xl border border-orange-100 overflow-hidden bg-white shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-orange-700 uppercase tracking-wide">Resumen Financiero</p>
          {fechaVenc && (
            <p className="text-[10px] text-slate-500 mt-0.5">Vencimiento: {fechaVenc}</p>
          )}
          {diaPago > 0 && (
            <p className="text-[10px] text-orange-500 mt-0.5">Día de pago mensual: <span className="font-bold">día {diaPago}</span></p>
          )}
        </div>
        <CheckCircle2 size={16} className="text-orange-400" />
      </div>

      {/* Cálculo de neto al cliente */}
      <div className="p-4 border-b border-slate-100 space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-600">Monto del préstamo</span>
          <span className="font-bold text-slate-800">{fmt(montoTotal)}</span>
        </div>
        <div className="flex justify-between items-center text-sm text-orange-600">
          <span>− Interés anticipado ({tasaPrestamo}%)</span>
          <span className="font-semibold">{fmt(interesAnticipado)}</span>
        </div>
        {apertura > 0 && (
          <div className="flex justify-between items-center text-sm text-orange-500">
            <span>− Apertura</span>
            <span className="font-semibold">{fmt(apertura)}</span>
          </div>
        )}
        {avaluo > 0 && (
          <div className="flex justify-between items-center text-sm text-orange-500">
            <span>− Avalúo</span>
            <span className="font-semibold">{fmt(avaluo)}</span>
          </div>
        )}
        {gastosNotariales > 0 && (
          <div className="flex justify-between items-center text-sm text-orange-500">
            <span>− Gastos Notariales</span>
            <span className="font-semibold">{fmt(gastosNotariales)}</span>
          </div>
        )}
        <div className="flex justify-between items-center border-t border-slate-100 pt-2">
          <span className="text-sm font-bold text-slate-700">Neto a entregar al cliente</span>
          <span className={`text-base font-bold ${netoCliente >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {fmt(netoCliente)}
          </span>
        </div>
        {tasaMoratoria > 0 && (
          <div className="flex justify-between items-center text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            <span className="text-slate-500">Interés moratorio mensual (si aplica)</span>
            <span className="font-semibold text-red-500">{fmt(interesMoretorio)} · {tasaMoratoria}%</span>
          </div>
        )}
      </div>

      {/* Desglose mensual por participante */}
      <div className="p-4 space-y-3">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
          Desglose de pagos mensuales de interés
        </p>

        {montoOficina > 0.009 && (
          <div className="rounded-lg border border-orange-100 bg-orange-50/40 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Building2 size={12} className="text-orange-500" />
              <span className="text-xs font-bold text-orange-700">Oficina TS</span>
            </div>
            <div className="space-y-1 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Capital: {fmt(montoOficina)} @ {tasaPrestamo}%</span>
                <span className="font-semibold">{fmt(interesOficina)}/mes</span>
              </div>
              {diferencialOficina > 0.009 && (
                <div className="flex justify-between text-orange-500">
                  <span>+ Diferencial de inversionistas</span>
                  <span className="font-semibold">+ {fmt(diferencialOficina)}/mes</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-orange-700 border-t border-orange-100 pt-1 mt-1">
                <span>Total Oficina TS</span>
                <span>{fmt(totalOficina)}/mes</span>
              </div>
            </div>
          </div>
        )}

        {invParticipantes.map((p, i) => {
          const monto   = parsear(p.monto_aportado);
          const tasa    = parseFloat(p.tasa_rendimiento) || 0;
          const interes = monto * tasa / 100;
          const dif     = tasaPrestamo - tasa;
          const inv     = inversionistas.find((inv) => inv.id === p.inversionista_id);
          const nombre  = inv
            ? `${inv.nombres} ${inv.apellido_paterno}`
            : `Inversionista ${i + 1}`;
          if (monto <= 0 || tasa <= 0) return null;
          return (
            <div key={p.uid} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingDown size={12} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-700">{nombre}</span>
              </div>
              <div className="space-y-1 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Capital: {fmt(monto)} @ {tasa}%</span>
                  <span className="font-semibold text-slate-700">{fmt(interes)}/mes</span>
                </div>
                {dif > 0.001 && (
                  <div className="flex justify-between text-orange-400">
                    <span>Diferencial → Oficina TS ({dif.toFixed(2)}%)</span>
                    <span>{fmt(monto * dif / 100)}/mes</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div className="border-t border-slate-200 pt-3 space-y-1.5">
          <div className="flex justify-between text-sm font-bold text-slate-700">
            <span>Total interés mensual (cliente paga)</span>
            <span>{fmt(totalInteresMensual)}</span>
          </div>
          {totalInversionistas > 0 && (
            <div className="flex justify-between text-xs text-slate-500">
              <span>→ A inversionistas</span>
              <span>{fmt(totalInversionistas)}</span>
            </div>
          )}
          <div className="flex justify-between text-xs text-orange-600 font-semibold">
            <span>→ A Oficina TS (total)</span>
            <span>{fmt(totalOficina)}</span>
          </div>
        </div>
      </div>

      {/* Proyecciones de rentabilidad */}
      {plazoMeses > 0 && (
        <div className="p-4 border-t border-slate-100 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-green-50 border border-green-100 p-3 text-center">
            <p className="text-[10px] font-bold text-green-600 uppercase tracking-wide mb-1">
              Ganancia Anual Proyectada
            </p>
            <p className="text-base font-bold text-green-700">{fmt(gananciaAnual)}</p>
            <p className="text-[10px] text-green-500 mt-0.5">
              {fmt(totalOficina)}/mes × 12
            </p>
          </div>
          <div className="rounded-xl bg-orange-50 border border-orange-100 p-3 text-center">
            <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wide mb-1">
              % Ganancia Anual Oficina
            </p>
            <p className="text-base font-bold text-orange-700">
              {pctGananciaAnual.toFixed(2)}%
            </p>
            <p className="text-[10px] text-orange-500 mt-0.5">
              sobre el capital prestado
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Uploader PDF binario ──────────────────────────────────────────
const UploaderPDF: React.FC<{
  tipo: TipoArchivoPrestamo;
  file: File | null;
  existeEnBd: boolean;
  onChange: (tipo: TipoArchivoPrestamo, file: File | null) => void;
}> = ({ tipo, file, existeEnBd, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const etiqueta = ETIQUETAS_ARCHIVO_PRESTAMO[tipo];

  const handleSeleccion = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    if (archivo.type !== 'application/pdf') {
      alert('Solo se permiten archivos PDF.');
      return;
    }
    if (archivo.size > 10 * 1024 * 1024) {
      alert('El archivo no puede pesar más de 10 MB.');
      return;
    }
    onChange(tipo, archivo);
  };

  const estadoBase = file
    ? 'border-green-300 bg-green-50/40'
    : existeEnBd
    ? 'border-blue-200 bg-blue-50/30'
    : 'border-slate-200 bg-white';

  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">
        {etiqueta}
        <span className="text-slate-400 ml-1 font-normal">(opcional)</span>
      </label>
      <div
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer border-2 border-dashed rounded-xl p-3 transition-all
                    hover:border-orange-300 hover:bg-orange-50/20 ${estadoBase}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleSeleccion}
          className="hidden"
        />
        {file ? (
          <div className="flex items-center gap-2">
            <FileText size={15} className="text-green-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-green-700 truncate">{file.name}</p>
              <p className="text-[10px] text-slate-400">{fmtBytes(file.size)}</p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(tipo, null); }}
              className="ml-auto p-0.5 text-slate-400 hover:text-red-500 rounded transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        ) : existeEnBd ? (
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-blue-500 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-blue-700">Archivo guardado en BD</p>
              <p className="text-[10px] text-slate-400">Clic para reemplazar</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Upload size={15} className="text-slate-400 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Clic para seleccionar PDF</p>
              <p className="text-[10px] text-slate-400">Máx. 10 MB</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Stepper ───────────────────────────────────────────────────────
const Stepper: React.FC<{ pasoActual: number; pasos: string[] }> = ({ pasoActual, pasos }) => (
  <div className="flex items-center justify-center gap-0 mb-8">
    {pasos.map((nombre, idx) => {
      const num        = idx + 1;
      const activo     = num === pasoActual;
      const completado = num < pasoActual;
      return (
        <React.Fragment key={num}>
          <div className="flex flex-col items-center">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
              completado
                ? 'bg-orange-500 border-orange-500 text-white'
                : activo
                ? 'bg-white border-orange-500 text-orange-500'
                : 'bg-white border-slate-200 text-slate-400'
            }`}>
              {completado
                ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                : num}
            </div>
            <span className={`text-xs mt-1.5 font-medium hidden sm:block ${activo ? 'text-orange-600' : 'text-slate-400'}`}>
              {nombre}
            </span>
          </div>
          {idx < pasos.length - 1 && (
            <div className={`h-0.5 w-12 sm:w-16 mx-1 mb-5 transition-colors ${completado ? 'bg-orange-400' : 'bg-slate-200'}`} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ── Datos iniciales ───────────────────────────────────────────────
const DATOS_INICIALES: FormularioPrestamoData = {
  cliente_id:             '',
  tipo_garantia:          'hipotecaria',
  monto_prestado:         '',
  valor_propiedad:        '',
  tasa_interes_mensual:   '',
  tasa_moratoria_mensual: '',
  plazo_meses:            '',
  fecha_inicio:           new Date().toISOString().split('T')[0],
  apertura:               '',
  avaluo:                 '',
  gastos_notariales:      '',
  notaria:                '',
  aval_nombre:            '',
  descripcion_garantia:   '',
  notas:                  '',
};

const ARCHIVOS_VACIOS: ArchivosState = {
  avaluo:              null,
  gastos_notariales:   null,
  escritura:           null,
  contrato_firmado:    null,
  pagare_firmado:      null,
  documento_propiedad: null,
  contrato_terminos:   null,
};

// ── Componente principal ──────────────────────────────────────────
const FormularioPrestamo: React.FC = () => {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const esEdicion = Boolean(id);

  const [paso, setPaso]   = useState(1);
  const [datos, setDatos] = useState<FormularioPrestamoData>(DATOS_INICIALES);
  const [invParticipantes, setInvParticipantes] = useState<InvParticipante[]>([]);
  const [archivos, setArchivos]                 = useState<ArchivosState>(ARCHIVOS_VACIOS);
  const [archivosEnBd, setArchivosEnBd]         = useState<Set<TipoArchivoPrestamo>>(new Set());

  const [cargando, setCargando]       = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(esEdicion);
  const [error, setError]             = useState<string | null>(null);
  const [exito, setExito]             = useState(false);
  const [progresoArchivos, setProgresoArchivos] = useState('');

  const [clientes, setClientes]             = useState<ClienteResumen[]>([]);
  const [inversionistas, setInversionistas] = useState<InversionistaResumen[]>([]);

  const esHipotecaria = datos.tipo_garantia === 'hipotecaria';
  const pasos = ['Cliente y garantía', 'Resumen Financiero', 'Documentación'];

  // ── Derivados reactivos ─────────────────────────────────────────
  const montoTotal    = parsear(datos.monto_prestado);
  const tasaPrestamo  = parseFloat(datos.tasa_interes_mensual) || 0;
  const tasaMoratoria = parseFloat(datos.tasa_moratoria_mensual) || 0;
  const plazoMeses         = parseInt(datos.plazo_meses) || 0;
  const aperturaN          = parsear(datos.apertura);
  const avaluoN            = parsear(datos.avaluo);
  const gastosNotarialesN  = parsear(datos.gastos_notariales);
  const sumaInversionistas = invParticipantes.reduce((s, p) => s + parsear(p.monto_aportado), 0);
  const montoOficina       = montoTotal - sumaInversionistas;

  const hayTasaInvalida = invParticipantes.some(
    (p) => (parseFloat(p.tasa_rendimiento) || 0) > tasaPrestamo && tasaPrestamo > 0
  );

  const resumenFinancieroCompleto =
    montoTotal > 0 &&
    tasaPrestamo > 0 &&
    plazoMeses > 0 &&
    Boolean(datos.fecha_inicio) &&
    montoOficina >= -0.01 &&
    !hayTasaInvalida;

  // PDFs opcionales: el préstamo se crea con estatus documentos_incompletos si faltan
  const archivosCompletos = true;

  useEffect(() => {
    listarClientes({ pagina: 1, limite: 200 }).then((r) => setClientes(r.clientes)).catch(() => {});
    listarInversionistas({ pagina: 1, limite: 200 }).then((r) => setInversionistas(r.inversionistas)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!esEdicion || !id) return;
    const cargar = async () => {
      try {
        const [expediente, metas] = await Promise.all([
          obtenerPrestamo(id),
          listarArchivosPrestamo(id).catch(() => []),
        ]);
        setDatos({
          cliente_id:             expediente.cliente_id,
          tipo_garantia:          expediente.tipo_garantia ?? 'hipotecaria',
          monto_prestado:         expediente.monto_prestado,
          valor_propiedad:        expediente.valor_propiedad ?? '',
          tasa_interes_mensual:   expediente.tasa_interes_mensual,
          tasa_moratoria_mensual: expediente.tasa_moratoria_mensual,
          plazo_meses:            String(expediente.plazo_meses),
          fecha_inicio:           expediente.fecha_inicio.substring(0, 10),
          apertura:               expediente.apertura ?? '',
          avaluo:                 expediente.avaluo ?? '',
          gastos_notariales:      expediente.gastos_notariales ?? '',
          notaria:                expediente.notaria ?? '',
          aval_nombre:            expediente.aval_nombre ?? '',
          descripcion_garantia:   expediente.descripcion_garantia ?? '',
          notas:                  expediente.notas ?? '',
        });
        setInvParticipantes(
          (expediente.participantes ?? [])
            .filter((p) => !p.es_oficina)
            .map((p) => ({
              uid:              p.id,
              inversionista_id: p.inversionista_id ?? '',
              monto_aportado:   p.monto_aportado,
              tasa_rendimiento: p.tasa_rendimiento,
            }))
        );
        setArchivosEnBd(new Set(metas.map((m) => m.tipo)));
      } catch {
        setError('No se pudieron cargar los datos del préstamo.');
      } finally {
        setCargandoDatos(false);
      }
    };
    cargar();
  }, [esEdicion, id]);

  const actualizar = (campo: keyof FormularioPrestamoData, valor: string) => {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
    setError(null);
  };

  const actualizarGarantia = (tipo: TipoGarantia) => {
    setDatos((prev) => ({ ...prev, tipo_garantia: tipo }));
    setArchivos(ARCHIVOS_VACIOS);
    setError(null);
  };

  const agregarInversionista = () => {
    setInvParticipantes((prev) => [
      ...prev,
      { uid: crypto.randomUUID(), inversionista_id: '', monto_aportado: '', tasa_rendimiento: '' },
    ]);
  };

  const actualizarInvParticipante = (uid: string, campo: keyof InvParticipante, valor: string) => {
    setInvParticipantes((prev) =>
      prev.map((p) => (p.uid === uid ? { ...p, [campo]: valor } : p))
    );
  };

  const eliminarInvParticipante = (uid: string) => {
    setInvParticipantes((prev) => prev.filter((p) => p.uid !== uid));
  };

  const cambiarArchivo = (tipo: TipoArchivoPrestamo, file: File | null) => {
    setArchivos((prev) => ({ ...prev, [tipo]: file }));
  };

  // ── Validaciones ────────────────────────────────────────────────
  const validarPaso1 = (): boolean => {
    if (!datos.cliente_id.trim()) {
      setError('El cliente es obligatorio.'); return false;
    }
    return true;
  };

  const validarPaso2 = (): boolean => {
    if (!datos.monto_prestado || montoTotal <= 0) {
      setError('El monto prestado debe ser mayor a cero.'); return false;
    }
    if (!datos.tasa_interes_mensual || tasaPrestamo <= 0) {
      setError('La tasa de interés mensual es obligatoria.'); return false;
    }
    if (!datos.plazo_meses || plazoMeses <= 0) {
      setError('El plazo en meses es obligatorio.'); return false;
    }
    if (!datos.fecha_inicio) {
      setError('La fecha de inicio es obligatoria.'); return false;
    }
    if (montoOficina < -0.01) {
      setError(`Los aportes de inversionistas exceden ${fmt(-montoOficina)} el monto prestado.`);
      return false;
    }
    if (hayTasaInvalida) {
      setError(`La tasa de algún inversionista supera la tasa del préstamo (${tasaPrestamo}%).`);
      return false;
    }
    // Validar capital disponible de cada inversionista
    for (const part of invParticipantes) {
      if (!part.inversionista_id) continue;
      const monto = parsear(part.monto_aportado);
      if (monto <= 0) continue;
      const inv = inversionistas.find((i) => i.id === part.inversionista_id);
      if (!inv) continue;
      const disponible = parseFloat(inv.capital_disponible);
      if (monto > disponible + 0.009) {
        setError(
          `Capital insuficiente: ${inv.nombres} ${inv.apellido_paterno} tiene ${fmt(disponible)} disponible, se requieren ${fmt(monto)}.`
        );
        return false;
      }
    }
    return true;
  };

  const validarPaso3 = (): boolean => true; // PDFs opcionales, el backend maneja el estatus

  const handleSiguiente = () => {
    setError(null);
    if (paso === 1 && !validarPaso1()) return;
    if (paso === 2 && !validarPaso2()) return;
    if (paso < 3) setPaso(paso + 1);
  };

  // Oficina TS absorbe el remanente automáticamente
  const construirParticipantes = () => {
    const montoOficinaDef = invParticipantes.length > 0 ? montoOficina : montoTotal;
    return [
      ...(montoOficinaDef > 0.009
        ? [{ inversionista_id: null, es_oficina: true, monto_aportado: montoOficinaDef, tasa_rendimiento: tasaPrestamo }]
        : []),
      ...invParticipantes.map((p) => ({
        inversionista_id: p.inversionista_id || null,
        es_oficina:       false,
        monto_aportado:   parsear(p.monto_aportado),
        tasa_rendimiento: parseFloat(p.tasa_rendimiento) || 0,
      })),
    ];
  };

  const handleGuardar = async () => {
    if (!validarPaso1() || !validarPaso2() || !validarPaso3()) return;
    setCargando(true);
    setError(null);
    try {
      const tiposArchivo = archivosParaTipo(datos.tipo_garantia);
      const payload = {
        cliente_id:           datos.cliente_id.trim(),
        tipo_garantia:        datos.tipo_garantia,
        monto_prestado:       montoTotal,
        valor_propiedad:      esHipotecaria && datos.valor_propiedad ? parsear(datos.valor_propiedad) : null,
        tasa_interes_mensual: tasaPrestamo,
        tasa_moratoria_mensual: tasaMoratoria || 0,
        plazo_meses:          plazoMeses,
        fecha_inicio:         datos.fecha_inicio,
        apertura:             aperturaN || 0,
        avaluo:               avaluoN || 0,
        gastos_notariales:    gastosNotarialesN || 0,
        notaria:              esHipotecaria ? (datos.notaria.trim() || null) : null,
        aval_nombre:          datos.tipo_garantia === 'pagare' ? (datos.aval_nombre.trim() || null) : null,
        descripcion_garantia: datos.tipo_garantia === 'otra' ? (datos.descripcion_garantia.trim() || null) : null,
        notas:         datos.notas.trim() || undefined,
        participantes: construirParticipantes(),
      };

      let prestamoId: string;

      if (esEdicion && id) {
        await editarPrestamo(id, payload as never);
        prestamoId = id;
      } else {
        const res = await crearPrestamo(payload as never);
        prestamoId = res.prestamo.id;
      }

      // Subir archivos binarios
      const archivosASubir = tiposArchivo.filter((t) => archivos[t] !== null);
      for (let i = 0; i < archivosASubir.length; i++) {
        const tipo = archivosASubir[i];
        const file = archivos[tipo]!;
        setProgresoArchivos(
          `Subiendo ${ETIQUETAS_ARCHIVO_PRESTAMO[tipo]} (${i + 1}/${archivosASubir.length})...`
        );
        await subirArchivoPrestamo(prestamoId, tipo, file);
      }

      setProgresoArchivos('');
      setExito(true);
      setTimeout(() => navigate(`/prestamos/${prestamoId}`), 1200);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { mensaje?: string } } };
      setError(axiosError?.response?.data?.mensaje ?? 'Error al guardar el préstamo.');
      setProgresoArchivos('');
    } finally {
      setCargando(false);
    }
  };

  if (cargandoDatos) {
    return (
      <div className="px-4 sm:px-6 py-8 max-w-2xl mx-auto w-full space-y-4 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/3" />
        <div className="bg-white rounded-2xl p-6 border border-slate-100 space-y-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-slate-200 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-8 max-w-2xl mx-auto w-full">
      {/* Encabezado */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(esEdicion && id ? `/prestamos/${id}` : '/prestamos')}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            {esEdicion ? 'Editar préstamo' : 'Nuevo préstamo'}
          </h2>
          <p className="text-sm text-slate-500">
            {esEdicion ? 'Actualiza los datos del préstamo' : 'Registra un nuevo préstamo'}
          </p>
        </div>
      </div>

      <Stepper pasoActual={paso} pasos={pasos} />

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-5">

        {/* ── PASO 1: Cliente y garantía ── */}
        {paso === 1 && (
          <div className="space-y-5">
            <h3 className="text-base font-semibold text-slate-700">Cliente y tipo de garantía</h3>
            <SelectorGarantia valor={datos.tipo_garantia} onChange={actualizarGarantia} />

            {/* Nombre del avalista — solo Pagaré */}
            {datos.tipo_garantia === 'pagare' && (
              <Campo
                label="Aval en el Pagaré"
                valor={datos.aval_nombre}
                onChange={(v) => actualizar('aval_nombre', v)}
                placeholder="Nombre del avalista (opcional)"
              />
            )}

            <div className="border-t border-slate-100 pt-4">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Cliente <span className="text-orange-500">*</span>
              </label>
              <select
                value={datos.cliente_id}
                onChange={(e) => actualizar('cliente_id', e.target.value)}
                className={inputCls}
              >
                <option value="">— Selecciona un cliente —</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombres} {c.apellido_paterno} {c.apellido_materno ?? ''}{c.rfc ? ` — ${c.rfc}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* ── PASO 2: Resumen Financiero ── */}
        {paso === 2 && (
          <div className="space-y-5">
            <h3 className="text-base font-semibold text-slate-700">Resumen Financiero</h3>

            {/* Monto y valor propiedad */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CampoMoneda
                label="Monto prestado"
                valor={datos.monto_prestado}
                onChange={(v) => actualizar('monto_prestado', v)}
                requerido
              />
              {esHipotecaria && (
                <CampoMoneda
                  label="Valor de la propiedad"
                  valor={datos.valor_propiedad}
                  onChange={(v) => actualizar('valor_propiedad', v)}
                  placeholder="0.00 (opcional)"
                />
              )}
            </div>

            {/* Tasas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Campo
                label="Tasa de interés mensual (%)"
                valor={datos.tasa_interes_mensual}
                onChange={(v) => actualizar('tasa_interes_mensual', v)}
                tipo="number"
                requerido
                min="0"
                placeholder="Ej: 2.5"
              />
              <Campo
                label="Tasa moratoria mensual (%)"
                valor={datos.tasa_moratoria_mensual}
                onChange={(v) => actualizar('tasa_moratoria_mensual', v)}
                tipo="number"
                min="0"
                placeholder="0 (opcional)"
              />
            </div>

            {/* Plazo y fecha */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Campo
                label="Plazo (meses)"
                valor={datos.plazo_meses}
                onChange={(v) => actualizar('plazo_meses', v)}
                tipo="number"
                requerido
                min="1"
                placeholder="Ej: 12"
              />
              <Campo
                label="Fecha de inicio"
                valor={datos.fecha_inicio}
                onChange={(v) => actualizar('fecha_inicio', v)}
                tipo="date"
                requerido
              />
            </div>

            {/* Deducciones del neto */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <h4 className="text-sm font-semibold text-slate-700">Deducciones al neto del cliente</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                <CampoMoneda
                  label="Apertura"
                  valor={datos.apertura}
                  onChange={(v) => actualizar('apertura', v)}
                  placeholder="0.00"
                />
                <CampoMoneda
                  label="Avalúo"
                  valor={datos.avaluo}
                  onChange={(v) => actualizar('avaluo', v)}
                  placeholder="0.00"
                />
                <CampoMoneda
                  label="Gastos Notariales"
                  valor={datos.gastos_notariales}
                  onChange={(v) => actualizar('gastos_notariales', v)}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Distribución del capital */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-700">¿De dónde viene el dinero?</h4>
                <button
                  type="button"
                  onClick={agregarInversionista}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                             text-orange-600 border border-orange-200 rounded-lg
                             hover:bg-orange-50 transition-colors"
                >
                  <Plus size={12} />
                  Agregar inversionista
                </button>
              </div>

              {/* Card Oficina TS */}
              <div className="border-2 border-orange-200 rounded-xl p-4 bg-orange-50/40">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 size={14} className="text-orange-500" />
                  <span className="text-sm font-semibold text-orange-700">Oficina TS</span>
                  <span className="text-xs text-orange-400 ml-auto">
                    {invParticipantes.length === 0 ? 'capital propio total' : 'absorbe el remanente'}
                  </span>
                </div>
                {(() => {
                  const capitalOficina = invParticipantes.length > 0 ? Math.max(0, montoOficina) : montoTotal;
                  const interesPropio  = capitalOficina * tasaPrestamo / 100;
                  const diferencial    = invParticipantes.reduce((sum, p) => {
                    const m = parsear(p.monto_aportado);
                    const t = parseFloat(p.tasa_rendimiento) || 0;
                    return sum + m * (tasaPrestamo - t) / 100;
                  }, 0);
                  const totalOficina = interesPropio + diferencial;
                  return (
                    <div className="space-y-2 mb-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[10px] text-slate-400 mb-0.5">Capital aportado</p>
                          <p className="text-sm font-bold text-slate-800">
                            {montoTotal > 0 ? fmt(capitalOficina) : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 mb-0.5">Tasa del préstamo</p>
                          <p className="text-sm font-bold text-orange-600">
                            {tasaPrestamo > 0 ? `${tasaPrestamo}%` : '—'}
                          </p>
                        </div>
                      </div>
                      {montoTotal > 0 && tasaPrestamo > 0 && (
                        <div className="bg-orange-50 rounded-lg px-3 py-2 space-y-1">
                          {capitalOficina > 0.009 && (
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Interés sobre capital propio</span>
                              <span className="font-semibold text-slate-700">{fmt(interesPropio)}/mes</span>
                            </div>
                          )}
                          {diferencial > 0.009 && (
                            <div className="flex justify-between text-xs text-orange-600">
                              <span>+ Diferencial de tasa (inversionistas)</span>
                              <span className="font-semibold">{fmt(diferencial)}/mes</span>
                            </div>
                          )}
                          <div className="flex justify-between text-xs font-bold text-green-700 border-t border-orange-100 pt-1 mt-1">
                            <span>Total Oficina TS</span>
                            <span>{fmt(totalOficina)}/mes</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {invParticipantes.map((part) => (
                <CardInversionista
                  key={part.uid}
                  part={part}
                  tasaPrestamo={tasaPrestamo}
                  inversionistas={inversionistas}
                  onChange={actualizarInvParticipante}
                  onEliminar={eliminarInvParticipante}
                />
              ))}

              {invParticipantes.length > 0 && montoTotal > 0 && (
                montoOficina < -0.01 ? (
                  <div className="p-3 rounded-lg border bg-red-50 border-red-100 text-sm font-medium text-red-600">
                    Los aportes exceden en {fmt(-montoOficina)} el monto del préstamo
                  </div>
                ) : montoOficina > 0.009 ? (
                  <div className="p-3 rounded-lg border bg-orange-50 border-orange-100 text-sm font-medium text-orange-700">
                    <Building2 size={13} className="inline mr-1.5 -mt-0.5" />
                    Oficina TS aportará el remanente: {fmt(montoOficina)}
                  </div>
                ) : (
                  <div className="p-3 rounded-lg border bg-green-50 border-green-100 text-sm font-medium text-green-700">
                    ✓ Capital 100% cubierto por inversionistas
                  </div>
                )
              )}
            </div>

            {/* Panel reactivo */}
            <PanelResumenFinanciero
              montoTotal={montoTotal}
              montoOficina={invParticipantes.length > 0 ? Math.max(0, montoOficina) : montoTotal}
              tasaPrestamo={tasaPrestamo}
              tasaMoratoria={tasaMoratoria}
              plazoMeses={plazoMeses}
              fechaInicio={datos.fecha_inicio}
              apertura={aperturaN}
              avaluo={avaluoN}
              gastosNotariales={gastosNotarialesN}
              invParticipantes={invParticipantes}
              inversionistas={inversionistas}
            />
          </div>
        )}

        {/* ── PASO 3: Documentación ── */}
        {paso === 3 && (
          <div className="space-y-5">
            <h3 className="text-base font-semibold text-slate-700">Documentación</h3>

            {/* Advertencia si resumen financiero no está completo */}
            {!resumenFinancieroCompleto && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                <AlertCircle size={15} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-700">
                  Regresa al paso 2 y completa el Resumen Financiero para poder guardar.
                </p>
              </div>
            )}

            {/* Notaría (solo texto, no URL) */}
            {esHipotecaria && (
              <Campo
                label="Notaría"
                valor={datos.notaria}
                onChange={(v) => actualizar('notaria', v)}
                placeholder="Nombre de la notaría (opcional)"
              />
            )}

            {datos.tipo_garantia === 'otra' && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Descripción de la garantía
                </label>
                <textarea
                  value={datos.descripcion_garantia}
                  onChange={(e) => {
                    if (e.target.value.length <= 500) actualizar('descripcion_garantia', e.target.value);
                  }}
                  rows={3}
                  maxLength={500}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white
                             text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2
                             focus:ring-orange-400 focus:border-transparent resize-none"
                  placeholder="Describe brevemente la garantía..."
                />
                <p className="text-xs text-slate-400 mt-0.5 text-right">
                  {datos.descripcion_garantia.length}/500
                </p>
              </div>
            )}

            {/* Documentos PDF — dinámicos según tipo de garantía */}
            {(() => {
              const tiposArchivo = archivosParaTipo(datos.tipo_garantia);
              return (
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700">Documentos PDF</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Opcionales al crear. Si faltan, el crédito quedará en{' '}
                      <span className="font-medium text-orange-600">Docs. Incompletos</span>{' '}
                      hasta completar los {tiposArchivo.length}.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {tiposArchivo.map((tipo) => (
                      <UploaderPDF
                        key={tipo}
                        tipo={tipo}
                        file={archivos[tipo]}
                        existeEnBd={archivosEnBd.has(tipo)}
                        onChange={cambiarArchivo}
                      />
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Notas */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Notas</label>
              <textarea
                value={datos.notas}
                onChange={(e) => actualizar('notas', e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white
                           text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2
                           focus:ring-orange-400 focus:border-transparent resize-none"
                placeholder="Observaciones adicionales..."
              />
            </div>
          </div>
        )}

        {/* Mensajes */}
        {progresoArchivos && (
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
            <p className="text-sm text-blue-700">{progresoArchivos}</p>
          </div>
        )}
        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        {exito && (
          <p className="text-sm text-green-700 bg-green-50 px-4 py-2.5 rounded-xl">
            ✓ Guardado correctamente. Redirigiendo...
          </p>
        )}

        {/* Navegación */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <button
            onClick={paso === 1
              ? () => navigate(esEdicion && id ? `/prestamos/${id}` : '/prestamos')
              : () => { setPaso(paso - 1); setError(null); }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-slate-500
                       hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft size={14} />
            {paso === 1 ? 'Cancelar' : 'Anterior'}
          </button>

          {paso < 3 ? (
            <button
              onClick={handleSiguiente}
              className="flex items-center gap-2 px-5 py-2 bg-orange-500 hover:bg-orange-600
                         text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
            >
              Siguiente
            </button>
          ) : (
            <button
              onClick={handleGuardar}
              disabled={cargando || exito || !resumenFinancieroCompleto || !archivosCompletos}
              className="flex items-center gap-2 px-5 py-2 bg-orange-500 hover:bg-orange-600
                         text-white text-sm font-medium rounded-lg shadow-sm
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save size={15} />
              {cargando ? (progresoArchivos || 'Guardando...') : esEdicion ? 'Actualizar' : 'Crear préstamo'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormularioPrestamo;
