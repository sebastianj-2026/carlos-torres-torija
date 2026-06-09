import { Request, Response, NextFunction } from 'express';

const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF
const JPG_MAGIC = Buffer.from([0xFF, 0xD8, 0xFF]);
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4E, 0x47]);

const MIME_MAGIC: Record<string, Buffer[]> = {
  'application/pdf': [PDF_MAGIC],
  'image/jpeg':      [JPG_MAGIC],
  'image/png':       [PNG_MAGIC],
};

export const validateMagicBytes = (req: Request, res: Response, next: NextFunction): void => {
  const file = (req as any).file;
  if (!file) return next();
  const expected = MIME_MAGIC[file.mimetype];
  if (!expected) {
    res.status(400).json({ mensaje: 'Tipo de archivo no soportado.' });
    return;
  }
  const buf: Buffer = file.buffer;
  const matches = expected.some(magic => buf.slice(0, magic.length).equals(magic));
  if (!matches) {
    res.status(400).json({ mensaje: 'El contenido del archivo no coincide con su extensión.' });
    return;
  }
  next();
};
