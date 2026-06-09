// Logger de errores solo para desarrollo. En producción queda en silencio
// para no filtrar stack traces ni ruido en la consola (ver QA #25 y #43).
// Uso en catch de cargas de fondo: `.catch(logError)`.
export const logError = (error: unknown): void => {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.error(error);
  }
};
