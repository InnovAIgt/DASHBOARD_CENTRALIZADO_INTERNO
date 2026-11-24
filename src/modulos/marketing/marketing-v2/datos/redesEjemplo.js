// Canales de marketing · Redes sociales: DATOS DE EJEMPLO (inventados) mientras no exista el token de Meta.
// Tienen la MISMA forma que devolverán las rutas del servidor, para que con el token solo cambie la fuente
// (datos/useRedesDatos.js):
//   /api/marketing/redes/cuentas        → respuestaCuentas
//   /api/marketing/redes/publicaciones  → respuestaPublicaciones
//   /api/marketing/redes/programadas    → respuestaProgramadas
//   /api/marketing/redes/anuncios       → respuestaAnuncios
// Nada de esto es real: títulos, cifras y campañas son inventados. La pantalla muestra «Datos de ejemplo».

const HOY = '2026-11-23' // las publicaciones con fecha posterior quedan «programadas (por venir)»
const MESES = ['2026-10', '2026-11']
const TITULOS = ['Radios PTT en cuotas', 'Ganadores del sorteo', 'Cobertura en todo el país', 'Caso de éxito: flota logística',
  'Planes empresariales', 'Internet para empresas', 'GPS en tiempo real', 'Soporte técnico 24/7', 'Oferta de fin de mes',
  'Conozca nuestro equipo', 'Consejos de seguridad', 'Nuevo punto de atención']

/** Azar con semilla fija: siempre los mismos datos de ejemplo. */
function azar(semilla) { let s = semilla; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280 } }

const CUENTAS = [
  ['gt-fb', 'gt', 'GT', 'fb', 'RED Intelfon Guatemala', 48200], ['gt-ig', 'gt', 'GT', 'ig', 'RED Intelfon Guatemala', 12900],
  ['sv-fb', 'sv', 'SV', 'fb', 'RED Intelfon El Salvador', 31700], ['sv-ig', 'sv', 'SV', 'ig', 'RED Intelfon El Salvador', 8400],
  ['dr-fb', 'dr', 'SV', 'fb', 'DATA RED', 9800], ['dr-ig', 'dr', 'SV', 'ig', 'DATA RED', 3100],
].map(([id, marca, pais, red, nombre, seguidores]) => ({ id, marca, pais, red, nombre, seguidores }))

function publicacionesDelMes(mes, semilla) {
  const r = azar(semilla)
  const plan = { gt: 16, sv: 12, dr: 8 } // programadas en el mes (como vendrán del «Plan del mes»)
  const cumple = mes === '2026-10' ? { gt: 0.94, sv: 1, dr: 0.75 } : { gt: 0.7, sv: 1, dr: 0.86 }
  const lista = []
  for (const [marca, n] of Object.entries(plan)) {
    for (let i = 0; i < n; i++) {
      const dia = Math.max(1, Math.min(30, Math.round(((i + 0.5) * 30) / n + r() * 2 - 1)))
      const fecha = `${mes}-${String(dia).padStart(2, '0')}`
      const red = r() < 0.55 ? 'fb' : 'ig'
      const formato = red === 'ig' ? (r() < 0.45 ? 'reel' : r() < 0.6 ? 'carrusel' : 'foto') : (r() < 0.6 ? 'foto' : r() < 0.5 ? 'video' : 'carrusel')
      const estado = fecha > HOY ? 'programada' : r() < cumple[marca] ? 'publicada' : 'no_publicada'
      const base = (marca === 'gt' ? 4200 : marca === 'sv' ? 2900 : 1300) * (red === 'ig' ? 0.75 : 1) * (formato === 'reel' ? 1.6 : formato === 'video' ? 1.25 : 1) * (0.5 + r())
      const alcance = estado === 'publicada' ? Math.round(base) : 0
      lista.push({ id: `${mes}-${marca}-${i + 1}`, cuentaId: `${marca}-${red}`, marca, pais: marca === 'gt' ? 'GT' : 'SV', red, formato, fecha, titulo: TITULOS[Math.floor(r() * TITULOS.length)],
        estado, alcance, interacciones: estado === 'publicada' ? Math.round(alcance * (0.04 + r() * 0.08)) : 0, enlace: null })
    }
  }
  return lista.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id.localeCompare(b.id))
}

const ANUNCIOS = {
  '2026-10': [['Cobertura nacional', 'gt', 500, 489, 39100, 70200, 980, 301], ['Flotas y GPS', 'sv', 300, 296, 21900, 35800, 410, 170],
    ['Internet empresarial', 'dr', 150, 148, 9800, 15600, 150, 52]],
  '2026-11': [['Radios PTT fin de mes', 'gt', 600, 584, 48200, 91300, 1240, 412], ['Planes empresariales Q4', 'gt', 400, 398, 30100, 52800, 690, 151],
    ['Cobertura nacional SV', 'sv', 350, 341, 27400, 44900, 520, 236], ['Flotas y GPS', 'sv', 250, 212, 15800, 26100, 300, 98],
    ['Internet para pymes', 'dr', 180, 176, 11200, 18900, 210, 61]],
}

const actualizado = `${HOY}T08:00:00.000-06:00`
export const respuestaCuentas = { actualizado, fuente: 'ejemplo', cuentas: CUENTAS }
export const respuestaPublicaciones = { actualizado, fuente: 'ejemplo', hoy: HOY, meses: [...MESES].reverse(),
  publicaciones: [...publicacionesDelMes('2026-10', 11), ...publicacionesDelMes('2026-11', 7)] }
// Programadas de Facebook (scheduled_posts). En la parte (4) se arman los 3 casos de «¿Cumplimos lo programado?».
export const respuestaProgramadas = { actualizado, fuente: 'ejemplo', programadas: [] }
export const respuestaAnuncios = { actualizado, fuente: 'ejemplo',
  anuncios: Object.entries(ANUNCIOS).flatMap(([mes, lista]) => lista.map(([campana, marca, presupuesto, gastado, alcance, visualizaciones, clics, mensajes], i) => ({
    id: `${mes}-ad-${i + 1}`, mes, campana, marca, pais: marca === 'gt' ? 'GT' : 'SV', moneda: 'USD', presupuesto, gastado, alcance, visualizaciones, clics, mensajes,
  }))) }
