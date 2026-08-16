# Casos resueltos — personas

> Cada caso se convierte en test antes de que exista la implementación.

## Caso 1 · Persona con dos roles
```
ENTRADA
  Alta de Juan Pérez como inversionista, aportación $500,000
  Después, se da de alta a Ana y se conecta a Juan como su referenciador

SALIDA ESPERADA
  personas: UNA fila de Juan Pérez
  persona_roles: DOS filas — inversionista y referenciador
  Sus datos de contacto existen en un solo lugar

POR QUÉ
  P1 + P2. Este es el caso que rompe si el modelo usa tablas separadas.
```

## Caso 2 · Aportación sin referenciador
```
ENTRADA
  Inversionista mete $300,000, la oficina NO liga referenciador

SALIDA ESPERADA
  aportaciones.referenciador_id = NULL
  aportaciones.tasa_referenciador = NULL
  No se genera ningún devengo de comisión por esta aportación

POR QUÉ
  P6: es opcional y por aportación. No se hereda de aportaciones anteriores.
```

## Caso 3 · Segunda aportación del mismo inversionista
```
ENTRADA
  Aportación #1: $500,000 con referenciador Juan
  Aportación #2: $300,000, la oficina decide NO ligar a Juan

SALIDA ESPERADA
  Juan cobra comisión sobre 500,000 — NO sobre 800,000

POR QUÉ
  P6. El referenciador cobra por el trabajo que hizo, no por el que no hizo.
  Si la implementación hereda el referenciador automáticamente, está mal.
```

## Caso 4 · Sin cascada — el invariante
```
ENTRADA
  A trae a B (aportación de B con referenciador_id = A)
  B trae a C (aportación de C con referenciador_id = B)

SALIDA ESPERADA
  Por la aportación de C: cobra B. A NO cobra nada.

POR QUÉ
  P7, un solo nivel. Sin esto el esquema se vuelve piramidal.
  Es un invariante verificable, no una recomendación.
```

## Caso 5 · Auto-referencia rechazada
```
ENTRADA
  Aportación donde inversionista_id == referenciador_id

SALIDA ESPERADA
  Rechazado a nivel base de datos (CHECK no_auto_referencia).
  Mensaje: "Una persona no puede ser su propio referenciador."
```

## Caso 6 · Teléfono duplicado
```
ENTRADA
  Alta de una persona con un teléfono que ya existe

SALIDA ESPERADA
  NO es un error rojo. La UI ofrece: "Ya existe una persona con este teléfono.
  ¿Es la misma? [Abrir su ficha]"

POR QUÉ
  P1. Casi siempre es la misma persona a la que hay que activarle otro rol.
  Un error duro empuja al usuario a inventar un teléfono falso.
```

## Caso 7 · Archivo que no es PDF
```
ENTRADA
  Se arrastra una imagen JPG a la zona del INE

SALIDA ESPERADA
  Rechazado antes de subir. "Solo se aceptan archivos PDF."
  La zona de drag-and-drop no queda en estado roto.
```

## Invariantes

1. Una persona nunca tiene dos filas activas con la misma identidad
2. Ningún referenciador cobra por un referido de su referido (P7)
3. Nadie es su propio referenciador
4. Una aportación con `referenciador_id` siempre tiene `tasa_referenciador`
5. Nada se borra: archivar cambia bandera, nunca `DELETE`
