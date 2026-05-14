import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = process.env.REACT_APP_SUPABASE_URL      || '';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || '';
const BUCKET            = 'documentos';

const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const MAX_MB   = 5;
const MAX_SIZE = MAX_MB * 1024 * 1024;
const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'application/pdf'];

// Valida tamaño y tipo antes de subir
export const validarArchivo = (archivo: File): string | null => {
  if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
    return 'Solo se permiten archivos PDF, JPG o PNG.';
  }
  if (archivo.size > MAX_SIZE) {
    return `El archivo no debe superar ${MAX_MB} MB.`;
  }
  return null;
};

// Sube un archivo al bucket y devuelve la URL pública
export const subirArchivo = async (archivo: File, ruta: string): Promise<string> => {
  if (!supabase) {
    throw new Error(
      'Supabase no está configurado. Agrega REACT_APP_SUPABASE_URL y ' +
      'REACT_APP_SUPABASE_ANON_KEY en el archivo .env.local'
    );
  }

  const error_validacion = validarArchivo(archivo);
  if (error_validacion) throw new Error(error_validacion);

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(ruta, archivo, { upsert: true });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(data.path);

  return urlData.publicUrl;
};

// Elimina un archivo a partir de su URL pública
export const eliminarArchivo = async (url: string): Promise<void> => {
  if (!supabase) return;
  const ruta = url.split(`/${BUCKET}/`)[1];
  if (!ruta) return;
  await supabase.storage.from(BUCKET).remove([ruta]);
};

export const estaConfigurado = (): boolean =>
  Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
