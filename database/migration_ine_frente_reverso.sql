-- Ampliar CHECK constraint de documentos_cliente para INE frente y reverso
ALTER TABLE documentos_cliente
  DROP CONSTRAINT IF EXISTS documentos_cliente_tipo_check;

ALTER TABLE documentos_cliente
  ADD CONSTRAINT documentos_cliente_tipo_check
  CHECK (tipo IN (
    'ine', 'ine_frente', 'ine_reverso',
    'escritura', 'r20', 'recibo_luz',
    'constancia_no_adeudo', 'predial', 'curp', 'rfc'
  ));
