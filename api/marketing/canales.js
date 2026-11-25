// Función de Vercel ÚNICA para Canales de marketing (Mailing, Redes, webhook de Brevo y tarea diaria de Supabase).
// vercel.json manda aquí /api/marketing/{brevo-webhook,mantener-supabase,mailing/*,redes/*} con ?ruta=…; las URLs no
// cambian. Reparte con server/marketingCanales.js, que usa los mismos manejadores de server/. /api/marketing/reuniones
// (Flujo de ventas) sigue en su propia función.
import { manejarCanales } from '../../server/marketingCanales.js'

export default async function handler(request, response) {
  return manejarCanales(request, response)
}
