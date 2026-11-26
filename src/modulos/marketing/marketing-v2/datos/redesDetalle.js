// Canales de marketing · Redes sociales: arma el contenido de la VENTANA DE DETALLE (pantalla/redes/Detalle.jsx).
// Funciones puras (solo datos y textos), probadas con node --test. Cada una devuelve un «detalle»:
//   { etiqueta, titulo, chips, kpis: [{t, v, c, sub, ir}], bloques: [{t, filas: [{l, v, n, c, sub, ir}]}],
//     tabla: {columnas, filas: [{celdas, ir}]}, texto, nota, acciones }
import { numero, pct } from './calculos.js'
import { COLOR_RED, dinero, FORMATOS, MARCAS, nombreCampana, nombreMes, PAISES, REDES, resumenPublicaciones, tituloLimpio } from './redes.js'
import { costoPorLead, esCerrado, etiquetaEtapa, SIN_DATO_PROSPEKT } from './redesLeads.js'

const ROSA = '#d6589b'
const fechaCorta = (f) => (f ? `${f.slice(8, 10)}/${f.slice(5, 7)}/${f.slice(0, 4)}` : '—')
const hora = (h) => (h == null ? '' : ` · ${String(h).padStart(2, '0')}:00`)
const marcaCorta = (m) => MARCAS[m]?.corto ?? 'Sin marca'
const red = (r) => REDES[r] ?? r

/** Filas «por marca» con barra, a partir de una función que da el valor de cada marca. */
const filasMarca = (marcas, valor, formato = numero) => marcas.map((m) => ({ l: MARCAS[m].corto, v: formato(valor(m)), n: valor(m), c: MARCAS[m].color }))

/** Una publicación (Top 5, tabla, calendario): sus números, su enlace y sus leads estimados. */
export function detallePublicacion(p, leadsEstimados = []) {
  const tasa = p.alcance ? (p.interacciones / p.alcance) * 100 : null
  return {
    etiqueta: `Publicación · ${red(p.red)}`, titulo: tituloLimpio(p.titulo),
    chips: [marcaCorta(p.marca), PAISES[p.pais] ?? p.pais, FORMATOS[p.formato] ?? p.formato, `${fechaCorta(p.fecha)}${hora(p.hora)}`, p.estado === 'publicada' ? 'Publicada' : p.estado === 'programada' ? 'Programada' : p.estado === 'no_publicada' ? 'No salió' : null],
    kpis: [
      { t: 'Alcance', v: numero(p.alcance), c: '#2fb8c4' },
      { t: 'Vistas', v: numero(p.vistas ?? 0), c: '#3987e5' },
      { t: 'Interacciones', v: numero(p.interacciones), c: '#9085e9', sub: `tasa ${pct(tasa)}` },
      { t: 'Clics', v: p.red === 'ig' ? '—' : numero(p.clics ?? 0), c: '#d98b1f', sub: p.red === 'ig' ? 'Instagram no da clics' : '' },
      { t: 'Leads (estimado)', v: numero(leadsEstimados.length), c: ROSA, sub: `${numero(leadsEstimados.filter(esCerrado).length)} cerrados (ganados o perdidos)`, ir: leadsEstimados.length ? detalleListaLeads(leadsEstimados, 'Leads estimados de esta publicación', [p]) : undefined },
    ],
    texto: p.titulo !== tituloLimpio(p.titulo) || p.titulo.length > 60 ? p.titulo : '',
    acciones: [],
    nota: [p.enlace ? `Enlace: ${p.enlace}` : null, 'Leads estimados: los de su país que llegaron en los 7 días siguientes, si fue la publicación más reciente.'].filter(Boolean).join(' · '),
  }
}

/** Una marca (¿Qué marca va mejor?, fila de la tabla por país y marca). */
export function detalleMarca(marca, { items = [], cuentas = [], mes, alcance = 0, alcanceAnt = null, textoAnt = '', leads = [] }) {
  const m = MARCAS[marca]
  const pubs = items.filter((p) => p.marca === marca)
  const s = resumenPublicaciones(pubs)
  const ctas = cuentas.filter((c) => c.marca === marca)
  const top = pubs.filter((p) => p.estado === 'publicada').sort((a, b) => b.interacciones - a.interacciones).slice(0, 5)
  return {
    etiqueta: 'Marca', titulo: m.nombre, chips: [PAISES[m.pais], nombreMes(mes)],
    kpis: [
      { t: 'Publicadas', v: numero(s.publicadas), c: m.color, sub: `${numero(pubs.filter((p) => p.red === 'fb' && p.estado === 'publicada').length)} FB · ${numero(pubs.filter((p) => p.red === 'ig' && p.estado === 'publicada').length)} IG` },
      { t: 'Alcance (suma diaria)', v: numero(alcance), c: '#2fb8c4', sub: alcanceAnt !== null ? `${textoAnt}: ${numero(alcanceAnt)}` : '' },
      { t: 'Interacciones', v: numero(s.interacciones), c: '#9085e9', sub: `tasa ${pct(s.tasa)}` },
      { t: 'Seguidores', v: numero(ctas.reduce((n, c) => n + (Number(c.seguidores) || 0), 0)), c: '#3987e5' },
      { t: 'Leads calificados', v: numero(leads.length), c: ROSA, sub: `${numero(leads.filter(esCerrado).length)} cerrados (ganados o perdidos)`, ir: leads.length ? detalleListaLeads(leads, `Leads de ${m.corto}`, items) : undefined },
    ],
    bloques: [
      { t: 'Alcance por cuenta', filas: ctas.map((c) => ({ l: red(c.red), v: numero(c.metricas?.[mes]?.alcanceDiario ?? 0), n: c.metricas?.[mes]?.alcanceDiario ?? 0, c: COLOR_RED[c.red], sub: `${numero(c.seguidores)} seguidores` })) },
      { t: 'Mejores publicaciones', vacio: 'Sin publicaciones este mes', filas: top.map((p) => ({ l: tituloLimpio(p.titulo), tip: p.titulo, v: numero(p.interacciones), n: p.interacciones, c: COLOR_RED[p.red], sub: `${red(p.red)} · ${fechaCorta(p.fecha)}`, ir: detallePublicacion(p) })) },
    ],
  }
}

/** Tarjetas de indicadores del Resumen: tipo = publicaciones | alcance | interacciones | seguidores | inversion | mensajes. */
export function detalleIndicador(tipo, { items = [], cuentas = [], mes, marcas = Object.keys(MARCAS), anuncios = [], reclutamiento = [], alcanceMarca = {}, textoAnt = '', alcanceAnt = null }) {
  const pub = items.filter((p) => p.estado === 'publicada')
  const porMarca = (fn, f) => ({ t: 'Por marca', filas: filasMarca(marcas, fn, f) })
  const porRed = (fn) => ({ t: 'Por red', filas: ['fb', 'ig'].map((r) => ({ l: REDES[r], v: numero(fn(r)), n: fn(r), c: COLOR_RED[r] })) })
  const suma = (lista, k) => lista.reduce((n, x) => n + (Number(x[k]) || 0), 0)
  const moneda = anuncios[0]?.moneda ?? reclutamiento[0]?.moneda ?? 'USD'
  const campanas = (lista, k, f) => [...new Map(lista.map((a) => [a.campana, a.campana])).keys()].map((c) => {
    const q = lista.filter((a) => a.campana === c)
    return { l: nombreCampana(c), tip: c, v: f(suma(q, k)), n: suma(q, k), c: '#5b6b84', sub: `${numero(suma(q, 'mensajes'))} mensajes · ${dinero(suma(q, 'gastado'), moneda)}` }
  }).sort((a, b) => b.n - a.n)
  const D = {
    publicaciones: () => ({ etiqueta: 'Indicador', titulo: `Publicaciones · ${numero(pub.length)}`,
      bloques: [porMarca((m) => pub.filter((p) => p.marca === m).length), porRed((r) => pub.filter((p) => p.red === r).length),
        { t: 'Por formato', filas: Object.keys(FORMATOS).map((f) => ({ l: FORMATOS[f], v: numero(pub.filter((p) => p.formato === f).length), n: pub.filter((p) => p.formato === f).length })).filter((x) => x.n) }] }),
    alcance: () => ({ etiqueta: 'Indicador', titulo: `Alcance · ${numero(Object.values(alcanceMarca).reduce((n, v) => n + v, 0))}`,
      texto: 'Suma del alcance de cada día de las cuentas: una persona que vio contenido varios días se cuenta varias veces (Meta no da el alcance único del mes).',
      kpis: alcanceAnt !== null ? [{ t: textoAnt || 'Mes anterior', v: numero(alcanceAnt), c: '#5b6b84' }] : [],
      bloques: [porMarca((m) => alcanceMarca[m] ?? 0), { t: 'Por cuenta', filas: cuentas.filter((c) => marcas.includes(c.marca)).map((c) => ({ l: `${marcaCorta(c.marca)} · ${red(c.red)}`, v: numero(c.metricas?.[mes]?.alcanceDiario ?? 0), n: c.metricas?.[mes]?.alcanceDiario ?? 0, c: COLOR_RED[c.red] })).sort((a, b) => b.n - a.n) }] }),
    interacciones: () => ({ etiqueta: 'Indicador', titulo: `Interacciones · ${numero(suma(pub, 'interacciones'))}`,
      texto: 'Facebook: reacciones y compartidos (Meta no da los comentarios con este permiso). Instagram: interacciones totales.',
      bloques: [porMarca((m) => suma(pub.filter((p) => p.marca === m), 'interacciones')), porRed((r) => suma(pub.filter((p) => p.red === r), 'interacciones'))] }),
    seguidores: () => ({ etiqueta: 'Indicador', titulo: `Seguidores · ${numero(suma(cuentas.filter((c) => marcas.includes(c.marca)), 'seguidores'))}`,
      bloques: [{ t: 'Por cuenta', filas: cuentas.filter((c) => marcas.includes(c.marca)).map((c) => ({ l: `${marcaCorta(c.marca)} · ${red(c.red)}`, v: numero(c.seguidores), n: c.seguidores, c: COLOR_RED[c.red] })).sort((a, b) => b.n - a.n) }] }),
    inversion: () => ({ etiqueta: 'Indicador', titulo: `Inversión · ${dinero(suma(anuncios, 'gastado'), moneda)}`,
      bloques: [{ t: 'Por campaña (marketing)', filas: campanas(anuncios, 'gastado', (v) => dinero(v, moneda)), vacio: 'Sin campañas' },
        { t: 'Reclutamiento (aparte, no se suma)', filas: campanas(reclutamiento, 'gastado', (v) => dinero(v, moneda)), vacio: 'Sin campañas de reclutamiento' }] }),
    mensajes: () => ({ etiqueta: 'Indicador', titulo: `Mensajes · ${numero(suma(anuncios, 'mensajes'))}`,
      texto: `Conversaciones que abrió un anuncio. Costo por mensaje = gasto ÷ mensajes (${dinero(suma(anuncios, 'mensajes') ? suma(anuncios, 'gastado') / suma(anuncios, 'mensajes') : null, moneda)} en promedio).`,
      bloques: [{ t: 'Por campaña', filas: campanas(anuncios, 'mensajes', numero), vacio: 'Sin campañas' }] }),
  }
  return D[tipo]?.() ?? null
}

/** Una campaña (pauta, presupuestos, tabla de campañas). */
export function detalleCampana(a, { moneda = a.moneda, objetivo = null, texto = null, meta = null } = {}) {
  const costo = a.mensajes > 0 ? a.gastado / a.mensajes : null
  return {
    etiqueta: 'Campaña', titulo: nombreCampana(a.campana), chips: [marcaCorta(a.marca), objetivo, a.reclutamiento ? 'Reclutamiento' : null, a.mensajes < 5 ? 'pocos datos' : null],
    kpis: [
      { t: 'Gastado', v: dinero(a.gastado, moneda), c: '#5b6b84', sub: a.presupuestoDiario ? `${dinero(a.presupuestoDiario, moneda)} diario` : a.presupuesto ? `${dinero(a.presupuesto, moneda)} total` : '' },
      { t: 'Mensajes', v: numero(a.mensajes), c: '#18935f' },
      { t: 'Costo por mensaje', v: dinero(costo, moneda), c: '#d98b1f', sub: meta ? `meta ${dinero(meta, moneda)} (por confirmar)` : '' },
      { t: 'Alcance', v: numero(a.alcance), c: '#2fb8c4' },
      { t: 'Clics', v: numero(a.clics), c: '#9085e9', sub: `CPC ${dinero(a.clics ? a.gastado / a.clics : null, moneda)}` },
    ],
    texto: texto ? `Texto de la publicación promocionada: ${texto}` : '',
    nota: `Nombre en Meta: ${a.campana}`,
  }
}

/** Lista de leads (con nombre); clic en uno abre su ficha. */
export function detalleListaLeads(leads = [], titulo = 'Leads', publicaciones = []) {
  return {
    etiqueta: 'Leads de Redes', titulo: `${titulo} · ${numero(leads.length)}`,
    tabla: { columnas: ['Cliente', 'País', 'Etapa', 'Fecha'], vacio: 'Sin leads',
      filas: [...leads].sort((a, b) => String(b.fechaUtc).localeCompare(String(a.fechaUtc))).map((l) => ({
        celdas: [l.nombre || 'Sin nombre', PAISES[l.pais] ?? l.pais, etiquetaEtapa(l.etapa), fechaCorta(l.fecha)], ir: detalleLead(l, publicaciones),
      })) },
    nota: 'Clic en un cliente para ver su ficha. Empresa: Prospekt no la envía.',
  }
}

/** Ficha de un cliente (lead): datos, seguimiento, gestiones y publicación estimada. */
export function detalleLead(l, publicaciones = []) {
  const pubs = l.estimada ? publicaciones.filter((p) => l.estimada.ids.includes(p.id)) : []
  return {
    etiqueta: 'Ficha del cliente', titulo: l.nombre || 'Sin nombre',
    chips: [PAISES[l.pais] ?? l.pais, etiquetaEtapa(l.etapa), esCerrado(l) ? 'Cerrado (ganado o perdido)' : null],
    bloques: [
      { t: 'Datos del cliente', filas: [
        { l: 'Empresa', v: SIN_DATO_PROSPEKT }, { l: 'Teléfono', v: l.telefono || '—' }, { l: 'Correo', v: l.correo || '—' }, { l: 'Código', v: l.codigo },
      ] },
      { t: 'Seguimiento comercial', filas: [
        { l: 'Asesor', v: l.asesor || '—' }, { l: 'Etapa', v: etiquetaEtapa(l.etapa) }, { l: 'Estado', v: l.status || '—' }, { l: 'Llegó', v: `${fechaCorta(l.fecha)} ${l.hora ?? ''}` },
      ] },
      { t: `Historial de gestiones · ${numero(l.gestiones?.length ?? 0)}`, vacio: 'Sin gestiones registradas', filas: (l.gestiones ?? []).map((g) => ({
        l: `${fechaCorta(String(g.fecha ?? '').slice(0, 10))} · ${g.tipo || 'Gestión'}${g.etapa ? ` · etapa ${g.etapa}` : ''}`, tip: g.notas || '', v: g.por || '',
        sub: [g.notas, g.proxima ? `Próxima: ${fechaCorta(String(g.proxima).slice(0, 10))}${g.proximaNotas ? ` · ${g.proximaNotas}` : ''}` : null].filter(Boolean).join(' · '),
      })) },
      { t: 'De dónde vino (estimado)', vacio: 'Sin publicación de su país en los 7 días anteriores', filas: l.estimada
        ? (pubs.length ? pubs : l.estimada.ids.map((id) => ({ id, titulo: 'Publicación', fecha: l.estimada.fecha }))).map((p) => ({ l: tituloLimpio(p.titulo), tip: p.titulo, v: fechaCorta(p.fecha), sub: `${marcaCorta(p.marca)} · ${red(p.red)}` }))
        : [] },
    ],
    nota: 'Origen exacto: «PostIAlo Redes Sociales» (Prospekt). La publicación es estimada: la más reciente de su país en los 7 días anteriores.',
  }
}

/** Costo por lead por país: gasto de cada país (US$, sin reclutamiento) ÷ sus leads; total = gasto total ÷ leads totales. */
export function detalleCostoLead({ anuncios = [], moneda = 'USD', leads = [], filtros = {} }) {
  const c = costoPorLead({ anuncios, leads })
  const paises = [['GT', 'Guatemala'], ['SV', 'El Salvador']].filter(([p]) => !filtros.pais || filtros.pais === p)
  return {
    etiqueta: 'Leads de Redes', titulo: `Costo por lead · ${c.costo === null ? 'sin leads' : dinero(c.costo, moneda)}`,
    kpis: [
      { t: 'Inversión', v: dinero(c.gasto, moneda), c: '#5b6b84', sub: 'sin reclutamiento · cuentas de SV y GT en US$' },
      { t: 'Leads', v: numero(c.leads), c: ROSA },
      { t: 'Costo por lead', v: dinero(c.costo, moneda), c: '#d98b1f', sub: 'inversión ÷ leads' },
    ],
    bloques: [{ t: 'Por país', filas: paises.map(([p, nombre]) => ({ l: nombre,
      v: `${numero(c.porPais[p].leads)} leads · ${c.porPais[p].costo === null ? 'sin leads' : `${dinero(c.porPais[p].costo, moneda)} c/u`}`,
      sub: `inversión ${dinero(c.porPais[p].gasto, moneda)}` })) }],
    nota: 'Cada país divide su propia inversión entre sus propios leads. La pauta de Guatemala (en quetzales) se pasa a US$ con el tipo de cambio por confirmar (DECISIONES.md).',
  }
}
