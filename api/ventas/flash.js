// Función de Vercel ÚNICA para Flash de altas: /api/ventas/{flash-altas,flash-preofertas,tipo-cambio}.
// vercel.json manda esas URLs aquí con ?ruta=…; las URLs no cambian. Reparte con server/ventasFlash.js.
import { manejarFlash } from '../../server/ventasFlash.js'

export default async function handler(request, response) {
  return manejarFlash(request, response)
}
