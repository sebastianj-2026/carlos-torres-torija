-- Reversa. Restaura NOT NULL en storage_key solo si no hay filas con NULL.
BEGIN;
ALTER TABLE persona_documentos DROP COLUMN IF EXISTS contenido;
-- Nota: no se re-impone NOT NULL en storage_key para no fallar si ya hay filas
-- creadas por el flujo de comprobantes (storage_key NULL). Reversa parcial a propósito.
COMMIT;
