-- Reversa de M1. Quita índices y la tabla `referenciadores`.
-- Segura solo mientras ninguna otra tabla la referencie todavía (referencias
-- y devengos aún no existen en este punto del backlog).
BEGIN;
DROP INDEX IF EXISTS idx_referenciadores_inversionista;
DROP INDEX IF EXISTS idx_referenciadores_nombre;
DROP TABLE IF EXISTS referenciadores;
COMMIT;
