// Canales de marketing · Redes sociales: «¿Cumplimos lo programado?» en 3 casos (REDES.md, sección 4).
// Convierte lo publicado (Meta), las programadas de Facebook (API) y el «Plan del mes» (carga manual, solo si Marketing
// tiene plan) en «items» del mes con estado:
//   publicada (cumplida = estaba programada y salió; fueraDePlan = salió sin estar programada) · no_publicada · programada.
//
//   A · Plan del mes cargado: cada entrada del plan ya vencida se busca en lo publicado (misma marca y red, ± 1 día);
//       si no aparece → «no salió». Las del plan a futuro → «por venir». Lo publicado fuera del plan cuenta aparte.
//   B · Solo programadas de Facebook (API): publicadas que Meta marca con fecha de programación → cumplidas; programadas
//       que siguen pendientes con fecha ya vencida → «no salió»; las futuras → «por venir». Instagram no da programadas.
//   C · Sin programadas: solo lo publicado, sin semáforo.
// El caso se elige solo, por mes: plan del mes → A; si no, programadas de Facebook del mes → B; si no → C.

const UN_DIA = 86_400_000
const diasEntre = (a, b) => Math.abs(Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) / UN_DIA
const delMes = (lista, mes) => lista.filter((x) => String(x.fecha).startsWith(mes))

/** Caso del mes: 'A' | 'B' | 'C'. */
export function casoDelMes({ publicaciones = [], programadas = [], plan = [] }, mes) {
  if (delMes(plan, mes).length) return 'A'
  if (delMes(programadas, mes).length || delMes(publicaciones, mes).some((p) => p.programadaPara)) return 'B'
  return 'C'
}

/** Items del mes según el caso. hoy = AAAA-MM-DD (lo que vence hoy todavía cuenta como «por venir» hasta mañana). */
export function itemsDelMes(datos, mes, hoy) {
  const caso = casoDelMes(datos, mes)
  const publicadas = delMes(datos.publicaciones ?? [], mes).map((p) => ({ ...p, estado: 'publicada' }))
  if (caso === 'C') return { caso, items: publicadas.map((p) => ({ ...p, fueraDePlan: true })) }

  if (caso === 'A') {
    const usadas = new Set()
    const items = []
    for (const e of [...delMes(datos.plan, mes)].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
      if (e.fecha > hoy) { items.push({ ...e, id: `plan-${e.id}`, estado: 'programada', alcance: 0, interacciones: 0 }); continue }
      const salio = publicadas.filter((p) => !usadas.has(p.id) && p.marca === e.marca && p.red === e.red && diasEntre(p.fecha, e.fecha) <= 1)
        .sort((a, b) => diasEntre(a.fecha, e.fecha) - diasEntre(b.fecha, e.fecha))[0]
      if (salio) usadas.add(salio.id)
      else items.push({ ...e, id: `plan-${e.id}`, estado: 'no_publicada', alcance: 0, interacciones: 0 })
    }
    return { caso, items: [...publicadas.map((p) => (usadas.has(p.id) ? p : { ...p, fueraDePlan: true })), ...items].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id.localeCompare(b.id)) }
  }

  // Caso B: solo Facebook.
  const pendientes = delMes(datos.programadas ?? [], mes).map((e) => ({ ...e, formato: e.formato ?? 'foto', alcance: 0, interacciones: 0,
    estado: e.fecha > hoy ? 'programada' : 'no_publicada' }))
  return { caso, items: [...publicadas.map((p) => (p.red === 'fb' && p.programadaPara ? p : { ...p, fueraDePlan: true })), ...pendientes]
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id.localeCompare(b.id)) }
}

/** Items de todos los meses (para comparar con el mes anterior) y el caso de cada uno. */
export function armarProgramado(datos, hoy) {
  const casos = {}
  const items = []
  for (const mes of datos.meses ?? []) {
    const r = itemsDelMes(datos, mes, hoy)
    casos[mes] = r.caso
    items.push(...r.items)
  }
  return { casos, items }
}
