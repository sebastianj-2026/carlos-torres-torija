import React, { useRef, useState, useCallback } from 'react';
import { Upload, X, FileText, Loader } from 'lucide-react';
import { subirArchivo, validarArchivo } from '../../services/storageService';

interface Props {
  label: string;
  value: string;
  folder: string;
  onChange: (url: string) => void;
  // Allowed MIME types. Omitted → current behavior (PDF/JPG/PNG) unchanged.
  accept?: string[];
}

const esImagen = (url: string) => /\.(jpe?g|png)(\?|$)/i.test(url);

const ACCEPT_DEFAULT = ['application/pdf', 'image/jpeg', 'image/png'];

const ETIQUETA_MIME: Record<string, string> = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
};

const FileDropZone: React.FC<Props> = ({ label, value, folder, onChange, accept }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging,  setDragging]  = useState(false);
  const [subiendo,  setSubiendo]  = useState(false);
  const [errorMsg,  setErrorMsg]  = useState('');

  const tipos     = accept && accept.length > 0 ? accept : ACCEPT_DEFAULT;
  const etiquetas = tipos.map((t) => ETIQUETA_MIME[t] ?? t).join(' / ');

  const procesar = useCallback(async (file: File) => {
    if (!tipos.includes(file.type)) {
      setErrorMsg(`Solo se aceptan archivos ${etiquetas}.`);
      return;
    }
    const err = validarArchivo(file);
    if (err) { setErrorMsg(err); return; }

    setErrorMsg('');
    setSubiendo(true);
    try {
      const ruta = `${folder}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
      const url  = await subirArchivo(file, ruta);
      onChange(url);
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'Error al subir el archivo.');
    } finally {
      setSubiendo(false);
    }
  }, [folder, onChange, tipos, etiquetas]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) procesar(file);
  }, [procesar]);

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) procesar(file);
    e.target.value = '';
  };

  if (value) {
    return (
      <div>
        <label className="block text-xs text-slate-500 mb-1">{label}</label>
        <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl bg-slate-50">
          {esImagen(value)
            ? <img src={value} alt="doc" className="h-10 w-10 object-cover rounded-lg border border-slate-200" />
            : <FileText size={20} className="text-sky-400 shrink-0" />
          }
          <a href={value} target="_blank" rel="noreferrer"
            className="text-xs text-blue-600 underline truncate flex-1">
            {value.split('/').pop()}
          </a>
          <button type="button" onClick={() => onChange('')}
            className="p-1 text-slate-400 hover:text-red-500 transition-colors shrink-0">
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      <input ref={inputRef} type="file" accept={tipos.join(',')}
        className="hidden" onChange={onInput} />
      <div
        onClick={() => !subiendo && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center gap-1.5 h-24 sm:h-20 rounded-xl border-2 border-dashed cursor-pointer transition-colors
          ${subiendo ? 'border-sky-300 bg-sky-50 cursor-wait' :
            dragging ? 'border-sky-400 bg-sky-50' :
            'border-slate-200 hover:border-sky-300 hover:bg-slate-50'}`}
      >
        {subiendo
          ? <Loader size={18} className="text-sky-400 animate-spin" />
          : <Upload size={18} className={dragging ? 'text-sky-400' : 'text-slate-300'} />
        }
        <span className="text-xs text-slate-400 text-center px-2">
          {subiendo ? 'Subiendo…' : (
            <>
              <span className="hidden sm:inline">Arrastra o haz clic · {etiquetas}</span>
              <span className="sm:hidden">Seleccionar archivo</span>
            </>
          )}
        </span>
      </div>
      {errorMsg && <p className="mt-1 text-[11px] text-red-500">{errorMsg}</p>}
    </div>
  );
};

export default FileDropZone;
