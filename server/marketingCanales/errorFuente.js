/**
 * Error "esperado" de una fuente de datos (mal configurada, sin permiso, sin conexión…).
 * Su mensaje se muestra tal cual al usuario: NUNCA debe incluir llaves, rutas ni datos personales.
 */
export class ErrorFuente extends Error {}
