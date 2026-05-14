import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MESES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

interface NavigadorTemporalProps {
  mes: number;
  anio: number;
  onChange: (mes: number, anio: number) => void;
  className?: string;
}

const NavigadorTemporal: React.FC<NavigadorTemporalProps> = ({ mes, anio, onChange, className = '' }) => {
  const retroceder = () => {
    if (mes === 1) onChange(12, anio - 1);
    else           onChange(mes - 1, anio);
  };
  const avanzar = () => {
    if (mes === 12) onChange(1, anio + 1);
    else            onChange(mes + 1, anio);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={retroceder}
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        aria-label="Mes anterior"
      >
        <ChevronLeft size={16} />
      </button>

      <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
        <select
          value={mes}
          onChange={e => onChange(Number(e.target.value), anio)}
          className="text-sm font-medium text-slate-700 bg-transparent focus:outline-none cursor-pointer"
        >
          {MESES.slice(1).map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>
        <span className="text-slate-300 select-none">·</span>
        <input
          type="number"
          value={anio}
          onChange={e => onChange(mes, Number(e.target.value))}
          className="w-16 text-sm font-medium text-slate-700 bg-transparent focus:outline-none text-center"
          min={2020}
          max={2099}
        />
      </div>

      <button
        onClick={avanzar}
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        aria-label="Mes siguiente"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
};

export default NavigadorTemporal;
