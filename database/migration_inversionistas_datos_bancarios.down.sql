-- Reversa de M9. Quita las columnas bancarias de inversionistas.
BEGIN;
ALTER TABLE inversionistas DROP COLUMN IF EXISTS banco;
ALTER TABLE inversionistas DROP COLUMN IF EXISTS numero_cuenta;
COMMIT;
