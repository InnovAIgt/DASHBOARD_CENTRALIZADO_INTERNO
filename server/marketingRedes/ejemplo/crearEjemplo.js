/**
 * Redes sociales — crea el Excel PEQUEÑO DE EJEMPLO para las pruebas (datos inventados).
 * Tiene los mismos casos raros que el archivo real:
 *   números con "mil", coma o punto decimal, "$", saltos de línea, "12.400", "-", "—", vacíos y un texto
 *   que no es número · red en minúsculas, con espacio y vacía · link de l.facebook.com · fecha en texto
 *   dd/mm/aaaa · filas sin id · calificados > leads · mismo link en FB e IG · link repetido entre
 *   publicaciones · link de Facebook en fila de Instagram · fecha futura (Programada) · fila sin
 *   métricas · fila incompleta · fila de TOTAL con una pauta que no cuadra · hoja desconocida.
 *
 * Uso: node server/marketingRedes/ejemplo/crearEjemplo.js
 */
import XLSX from 'xlsx'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const CABECERAS = ['U1', 'id', 'Red social', 'Campaña', 'Link publicación', 'Presupuesto pauta', 'Alcance', 'visualizaciones', 'Clics', 'Costo x clic', 'Interacciones', 'Comentarios', 'Compartidos', 'Mensajes/Leads', 'Lead calificado', 'Costo x Lead', 'Cierres exitoso (No. clientes)', 'Costo x Cliente', 'No. de unidades', 'Costo X Unidad', 'post_id_meta']

/** Fecha de Excel (número de serie) para AAAA-MM-DD. */
const serie = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000
}
const fila = (o) => [o.fecha, o.id ?? null, o.red ?? null, o.campana ?? null, o.link ?? null, o.pauta ?? null, o.alcance ?? null, o.vis ?? null, o.clics ?? null, o.costoClic ?? null, o.inter ?? null, null, null, o.leads ?? null, o.calif ?? null, o.costoLead ?? null, o.cierres ?? null, o.costoCliente ?? null, o.unid ?? null, null, null]

const FB = (n) => `https://www.facebook.com/permalink.php?story_fbid=ejemplo${n}&id=100`
const IG = (n) => `https://www.instagram.com/p/EJEMPLO${n}/?fbclid=abc${n}`

export function filasEjemplo() {
  const gt = [
    // Publicación 1 (id 1): FB completa con "5,8 mil" y "$30,00"; IG con "instagram" en minúsculas
    fila({ fecha: serie('2026-06-02'), id: 1, red: 'Facebook', campana: 'Planta Industrial', link: FB(1), pauta: '$30,00', alcance: '5,8 mil ', vis: '17,5mil', clics: 10, leads: 12, calif: 4, cierres: 1, unid: 3, costoLead: 7.5 }),
    fila({ fecha: serie('2026-06-02'), id: 1, red: 'instagram', campana: 'Planta Industrial', link: IG(1), pauta: 0, alcance: '11mil', vis: '1,5 mil', clics: 0, leads: 0, calif: 0 }),
    // Publicación 2 (sin id): FB con link l.facebook.com y "6\n"; IG con "Instagram " y fecha en texto
    fila({ fecha: '15/07/2026', red: 'Facebook', campana: 'Seguridad  Industrial', link: `https://l.facebook.com/l.php?u=${encodeURIComponent(FB(2))}&h=XYZ`, pauta: '$10.00', alcance: '12.400', vis: 900, leads: '6\n', calif: 2, cierres: 0, unid: 0 }),
    fila({ fecha: '15/07/2026', red: 'Instagram ', campana: 'seguridad industrial', link: IG(2), pauta: '-', alcance: 80, vis: 120, leads: 1, calif: 0 }),
    // Publicación 3 (sin id): incompleta (alcance sin leads ni calificados) y un número ilegible
    fila({ fecha: serie('2026-08-03'), red: 'Facebook', campana: 'Operaciones críticas', link: FB(3), pauta: 0, alcance: 64, vis: 116, clics: 'abc', leads: null, calif: null }),
    // Publicación 4 (sin id): sin métricas, y su link es el mismo de una publicación de SV
    fila({ fecha: serie('2026-08-04'), red: 'Facebook', campana: 'Comunicación confiable', link: FB(90), pauta: 0 }),
    // Publicación 5 (id 5): programada (fecha futura)
    fila({ fecha: serie('2099-01-10'), id: 5, red: 'Facebook', campana: 'Lanzamiento futuro', link: FB(5) }),
    // Fila de TOTAL (sin fecha, campaña ni link) con pauta que no cuadra: Excel no sumó "$30,00" ni "$10.00"
    fila({ fecha: null, pauta: 0, leads: 19, calif: 6, cierres: 1, unid: 3 }),
  ]
  const sv = [
    // Publicación 1 (id 1): calificados > leads; FB e IG con el MISMO link de Facebook
    fila({ fecha: serie('2026-07-09'), id: 1, red: 'Facebook', campana: 'Donde el trabajo no se detiene', link: FB(10), pauta: 30, alcance: 17500, vis: 11000, leads: 0, calif: 6, cierres: 2, unid: 36, costoLead: 5 }),
    fila({ fecha: serie('2026-07-09'), id: 1, red: 'Instagram', campana: 'Donde el trabajo no se detiene', link: FB(10), pauta: 0, alcance: 29, vis: 50, leads: 0, calif: 0 }),
    // Publicación 2 (id 2): fila sin red y valores "—"
    fila({ fecha: serie('2026-08-04'), id: 2, red: null, campana: 'TCR Flotas', link: FB(90), pauta: '—' }),
    // Publicación 3 (id 3): link de Facebook en la fila de Instagram
    fila({ fecha: serie('2026-07-20'), id: 3, red: 'Instagram', campana: 'Radios', link: FB(30), pauta: 0, alcance: 10, vis: 20, leads: 2, calif: 1 }),
    fila({ fecha: null, pauta: 30, leads: 2, calif: 7, cierres: 2, unid: 36 }),
  ]
  const datared = [
    // Dos publicaciones distintas con el mismo link de Instagram
    fila({ fecha: serie('2026-07-16'), id: 1, red: 'Instagram', campana: 'Colocación', link: IG(50), pauta: '$20,00', alcance: 40, vis: 65, leads: 1, calif: 0 }),
    fila({ fecha: serie('2026-07-22'), id: 2, red: 'Instagram', campana: 'Servidor', link: IG(50), pauta: 0, alcance: 70, vis: 95, leads: 0, calif: 0 }),
    fila({ fecha: null, pauta: 0, leads: 1, calif: 0 }),
  ]
  return { gt, sv, datared }
}

export function crearLibroEjemplo() {
  const { gt, sv, datared } = filasEjemplo()
  const libro = XLSX.utils.book_new()
  // Nombres con variaciones (mayúsculas, tildes, espacios) para probar la búsqueda por nombre normalizado.
  XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet([CABECERAS, ...gt]), 'Métricas RRSS GT')
  XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet([CABECERAS, ...sv]), 'metricas rrss SV ')
  XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet([CABECERAS, ...datared]), 'Métricas RRSS Data Red')
  XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet([['Notas'], ['hoja sin datos de métricas']]), 'Notas')
  return XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' })
}

// Al ejecutarlo directamente, guarda el archivo junto a este script.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const destino = path.join(path.dirname(fileURLToPath(import.meta.url)), 'ejemplo-rrss.xlsx')
  const fs = await import('node:fs')
  fs.writeFileSync(destino, crearLibroEjemplo())
  console.log('Excel de ejemplo creado en', destino)
}
