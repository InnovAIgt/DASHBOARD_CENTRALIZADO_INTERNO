// Canales de marketing · Mailing · aviso a cada ejecutivo con sus correos por corregir (plazo de 48 horas).
// Misma estructura que la referencia visual de Mailing (grupos por ejecutivo, borrador de texto, correo con diseño y
// borrador .eml). Escrito aquí: la referencia no se copia porque trae datos de clientes.
// NUNCA envía nada: solo arma textos y archivos que la persona revisa y envía desde su propio correo.
// Grupos: coincidencia exacta, POSIBLE por dominio (el correo dice «confirmar antes de corregir») y sin identificar.
import { aCsv } from './csv.js'
import { empresasDe } from './calculos.js'

export const ENLACE_CORREGIR = 'https://cumplimientoclientes-88n2.onrender.com'
export const SIN_IDENTIFICAR = 'Sin identificar'
export const PLAZO = '48 horas'

const unicos = (lista) => [...new Set(lista.filter(Boolean))]
const porNombre = (a, b) => String(a).localeCompare(String(b), 'es')

/** Motivo corto de una fila (el motivo técnico ya viene resumido; nunca el texto original del rebote). */
export const motivoBreve = (fila) => String(fila?.motivoTecnico || '').trim() || 'Rechazo de entrega por verificar'

/** Iniciales para la tarjeta («Ana Ejemplo» → «AE»; sin identificar → «—»). */
export function iniciales(nombre) {
  if (!nombre || nombre === SIN_IDENTIFICAR) return '—'
  return String(nombre).trim().split(/\s+/).slice(0, 2).map((x) => x.charAt(0).toUpperCase()).join('')
}

/** Direcciones únicas de un grupo: cada correo una vez, con sus campañas, clientes, motivos y estados. */
export function direccionesUnicas(filas, nombreCampana = (id) => `#${id}`) {
  const porCorreo = new Map()
  for (const f of filas) {
    const clave = String(f.correo || '').trim().toLowerCase()
    if (!clave) continue
    const lista = porCorreo.get(clave) ?? []
    lista.push(f)
    porCorreo.set(clave, lista)
  }
  return [...porCorreo].map(([correo, items]) => ({
    correo,
    filas: items,
    campanas: unicos(items.map((x) => x.campana_id)).sort((a, b) => a - b).map((id) => `#${id}`),
    nombresCampana: unicos(items.map((x) => x.campana_id)).sort((a, b) => a - b).map(nombreCampana),
    clientes: unicos(items.flatMap((x) => empresasDe(x).empresas.map((e) => e.cliente))).sort(porNombre),
    motivos: unicos(items.map(motivoBreve)),
    estados: unicos(items.map((x) => x.estadoTexto)),
  })).sort((a, b) => porNombre(a.correo, b.correo))
}

/**
 * Grupos por ejecutivo (filas = correo + campaña marcadas CORREGIR). Un correo de varias empresas con ejecutivos
 * distintos aparece en el grupo de cada uno. tipo: 'exacta' | 'posible' | 'sin'.
 * correoEjecutivo: el de correos_usuarios (Cumplimiento), si existe.
 */
export function gruposEjecutivos(filas = [], nombreCampana) {
  const mapas = { exacta: new Map(), posible: new Map() }
  const sin = []
  for (const f of filas) {
    const { tipo, empresas } = empresasDe(f)
    if (tipo === 'sin') { sin.push(f); continue }
    for (const e of empresas) {
      const nombre = e.ejecutivo || SIN_IDENTIFICAR
      const g = mapas[tipo].get(nombre) ?? { filas: new Set(), correoEjecutivo: '' }
      g.filas.add(f)
      if (!g.correoEjecutivo && e.correoEjecutivo) g.correoEjecutivo = e.correoEjecutivo
      mapas[tipo].set(nombre, g)
    }
  }
  const armar = (tipo) => [...mapas[tipo]].map(([ejecutivo, g]) => {
    const lista = [...g.filas]
    return { clave: `${tipo}|${ejecutivo}`, tipo, ejecutivo, correoEjecutivo: g.correoEjecutivo, filas: lista, unicos: direccionesUnicas(lista, nombreCampana) }
  }).sort((a, b) => b.unicos.length - a.unicos.length || porNombre(a.ejecutivo, b.ejecutivo))
  const sinGrupo = sin.length ? [{ clave: 'sin', tipo: 'sin', ejecutivo: SIN_IDENTIFICAR, correoEjecutivo: '', filas: sin, unicos: direccionesUnicas(sin, nombreCampana) }] : []
  return { exacta: armar('exacta'), posible: armar('posible'), sin: sinGrupo }
}

export const correoValido = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim())
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`

/** Borrador de texto (para «Correo simple» y para la parte de texto del .eml). corto = lista abreviada. */
export function textoCorreo(grupo, { corto = false } = {}) {
  const n = grupo.unicos.length
  const posible = grupo.tipo === 'posible'
  const asunto = posible
    ? `CORREOS POR CONFIRMAR ANTES DE CORREGIR | ${plural(n, 'caso', 'casos')} | Plazo máximo: ${PLAZO}`
    : `CORREOS POR CORREGIR | ${plural(n, 'caso', 'casos')} | Plazo máximo: ${PLAZO}`
  const lista = corto
    ? grupo.unicos.map((x, i) => `${i + 1}. ${x.correo} | ${x.campanas.join('/')} | ${x.motivos.join('/')}`).join('\n')
    : grupo.unicos.map((x, i) => `${i + 1}. ${x.correo}\n   Cliente: ${x.clientes.join(' / ') || 'Cliente no identificado en la base'}\n   Campaña(s): ${x.campanas.join(', ')}\n   Incidencia: ${x.motivos.join(' / ')}`).join('\n\n')
  const aviso = posible
    ? 'IMPORTANTE: estas direcciones no están registradas en la base; su dominio coincide con clientes de su cartera (posible cliente por dominio). Confirmar antes de corregir.\n\n'
    : ''
  const cuerpo = `Estimado/a ${grupo.ejecutivo}:\n\n${aviso}Como resultado del control de calidad de la base de contactos utilizada en las campañas de mailing, se identificaron ${plural(n, 'dirección de correo con incidencia', 'direcciones de correo con incidencias')} en su cartera que requieren ${posible ? 'confirmación y, si corresponde, corrección' : 'atención y corrección o validación'}.\n\n${posible ? 'CORREOS POR CONFIRMAR ANTES DE CORREGIR' : 'CORREOS POR CORREGIR'} (${n} ${n === 1 ? 'CASO' : 'CASOS'})\n\n${lista}\n\nPLAZO MÁXIMO: ${PLAZO.toUpperCase()} DESDE LA RECEPCIÓN DE ESTE CORREO.\n\nIR A CORREGIR: ${ENLACE_CORREGIR}\n\nSe requiere revisar cada dirección con el cliente, corregir los datos que correspondan y actualizar la base de contactos dentro de este plazo. Si alguna dirección no requiere cambio, deberá confirmar que fue verificada e indicar la razón del rechazo.\n\nEs indispensable responder a esta notificación confirmando las acciones realizadas dentro de las mismas ${PLAZO}.\n\nAtentamente,\nEquipo de Marketing\nRED Intelfon`
  return { asunto, cuerpo }
}

/** Enlace mailto (Correo simple). Si queda muy largo, usa la lista abreviada (algunos programas cortan el enlace). */
export function enlaceMailto(grupo, para) {
  const armar = (t) => `mailto:${encodeURIComponent(para || '')}?subject=${encodeURIComponent(t.asunto)}&body=${encodeURIComponent(t.cuerpo)}`
  const completo = armar(textoCorreo(grupo))
  return completo.length > 5500 ? { enlace: armar(textoCorreo(grupo, { corto: true })), corto: true } : { enlace: completo, corto: false }
}

/** Escapa texto para HTML (correos, nombres y motivos nunca se insertan sin escapar). */
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

/** Correo con diseño (HTML de tablas y estilos en línea, sin recursos externos), como el de la referencia. */
export function htmlCorreo(grupo) {
  const posible = grupo.tipo === 'posible'
  const total = grupo.unicos.length
  const clientes = new Set(grupo.unicos.flatMap((x) => x.clientes)).size
  const campanas = new Set(grupo.unicos.flatMap((x) => x.campanas)).size
  const filas = grupo.unicos.map((x, i) => {
    const mx = /mx|dominio/i.test(x.motivos.join(' '))
    const fondo = i % 2 ? '#fbfcfd' : '#ffffff'
    return `<tr><td style="padding:12px 14px;border-bottom:1px solid #eef1f5;background:${fondo};vertical-align:top">
   <div style="font-size:13px;font-weight:700;color:#1d2735;word-break:break-all">${esc(x.correo)}</div>
   <div style="font-size:12px;color:#6a7686;margin-top:2px">${esc(x.clientes.join(' / ') || 'Cliente sin identificar')} · Campaña ${esc(x.campanas.join(', ') || '—')}</div></td>
   <td style="padding:12px 14px;border-bottom:1px solid #eef1f5;background:${fondo};vertical-align:top;text-align:right">
   <span style="display:inline-block;background:${mx ? '#eef3ff' : '#fdecee'};color:${mx ? '#2b5bb5' : '#b3263a'};border-radius:99px;padding:3px 10px;font-size:11px;font-weight:700">${esc(x.motivos.join(' / ') || 'Verificar dirección')}</span></td></tr>`
  }).join('')
  const cuadro = (n, t, urgente) => `<td width="33%" style="padding:0 5px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;background:${urgente ? '#fdf0f2' : '#f6f8fb'};border:1px solid ${urgente ? '#f6c9d0' : '#e6eaf0'};border-radius:10px"><tr><td align="center" style="padding:12px 6px"><div style="font-size:24px;font-weight:800;color:${urgente ? '#c8102e' : '#1d2735'}">${n}</div><div style="font-size:12px;color:#6a7686">${t}</div></td></tr></table></td>`
  const paso = (n, t) => `<tr><td width="30" valign="top" style="padding:4px 0"><div style="width:22px;height:22px;border-radius:50%;background:#1d2735;color:#fff;font-size:11px;font-weight:700;text-align:center;line-height:22px">${n}</div></td><td style="padding:4px 0;font-size:13px;color:#3b4656">${t}</td></tr>`
  const titulo = posible ? 'Tienes correos por confirmar' : 'Tienes correos por corregir'
  const avisoPosible = posible
    ? `<tr><td style="padding:0 28px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff7e6;border:1px dashed #d9a520;border-radius:10px;border-collapse:separate"><tr><td style="padding:12px 14px;font-size:13px;color:#7a5800"><b>Posible cliente (por dominio): confirmar antes de corregir.</b> Estas direcciones no están en la base; su dominio coincide con clientes de tu cartera.</td></tr></table></td></tr>`
    : ''
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titulo}</title></head>
 <body style="margin:0;padding:0;background:#eef1f6;font-family:'Segoe UI',Arial,Helvetica,sans-serif;color:#1d2735">
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f6"><tr><td align="center" style="padding:26px 12px">
 <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;border-collapse:separate">
  <tr><td bgcolor="#c8102e" style="background:#c8102e;background-image:linear-gradient(135deg,#b3263a,#d32f45 55%,#e2556a);padding:26px 28px 22px;color:#ffffff">
   <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="width:30px;height:30px;background:#ffffff;border-radius:8px;text-align:center;color:#c8102e;font-weight:900;font-size:14px">R</td><td style="padding-left:10px;font-size:13px;font-weight:800;letter-spacing:1px;color:#ffffff">RED INTELFON · CONTROL DE CALIDAD</td></tr></table>
   <div style="font-size:24px;font-weight:800;margin-top:16px;line-height:1.2">${titulo}</div>
   <div style="font-size:14px;opacity:.92;margin-top:4px">Direcciones de tu cartera que rebotaron en las últimas campañas</div>
  </td></tr>
  <tr><td style="padding:26px 28px 6px;font-size:14px;line-height:1.6">
   <p style="margin:0 0 12px">Hola <b>${esc(grupo.ejecutivo)}</b>,</p>
   <p style="margin:0 0 6px">Al revisar los envíos de Marketing encontramos direcciones de tus clientes que no están recibiendo nuestros correos. Con tu ayuda las dejamos al día.</p>
  </td></tr>
  ${avisoPosible}
  <tr><td style="padding:12px 23px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${cuadro(total, posible ? 'por confirmar' : 'por corregir', true)}${cuadro(clientes, 'clientes')}${cuadro(campanas, 'campañas')}</tr></table></td></tr>
  <tr><td style="padding:6px 28px 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff7e6;border:1px solid #f5dca3;border-radius:10px;border-collapse:separate"><tr>
   <td width="50" align="center" style="padding:12px 0 12px 12px"><div style="width:34px;height:34px;border-radius:50%;background:#f5b400;color:#fff;font-weight:800;font-size:12px;line-height:34px;text-align:center">48h</div></td>
   <td style="padding:12px 14px;font-size:13px;color:#7a5800"><b>Plazo: ${PLAZO}.</b> ${posible ? 'Confirma y, si corresponde, corrige' : 'Corrige o confirma'} cada dirección en Cumplimiento de Clientes.</td></tr></table></td></tr>
  <tr><td style="padding:0 28px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e6eaf0;border-radius:10px;overflow:hidden;border-collapse:separate">
   <tr><th align="left" style="background:#f6f8fb;color:#55606f;font-size:11px;text-transform:uppercase;letter-spacing:.5px;padding:10px 14px;border-bottom:1px solid #e6eaf0">Dirección</th><th align="right" style="background:#f6f8fb;color:#55606f;font-size:11px;text-transform:uppercase;letter-spacing:.5px;padding:10px 14px;border-bottom:1px solid #e6eaf0">Motivo</th></tr>
   ${filas}</table></td></tr>
  <tr><td style="padding:20px 28px 4px"><table role="presentation" cellpadding="0" cellspacing="0">${paso(1, 'Abre Cumplimiento de Clientes con el botón de abajo.')}${paso(2, posible ? 'Confirma si el contacto es de tu cliente y, si corresponde, actualiza su correo.' : 'Busca al cliente y actualiza el correo del contacto.')}${paso(3, 'Si el correo es correcto, márcalo como confirmado y responde este correo.')}</table></td></tr>
  <tr><td align="center" style="padding:22px 28px 6px"><a href="${ENLACE_CORREGIR}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#c8102e;color:#ffffff;padding:14px 34px;border-radius:10px;font-weight:800;font-size:15px;letter-spacing:.5px;text-decoration:none">IR A CORREGIR →</a>
   <div style="font-size:12px;color:#8a95a5;margin-top:8px;word-break:break-all">${ENLACE_CORREGIR}</div></td></tr>
  <tr><td style="padding:16px 28px 22px;font-size:13px;color:#3b4656">Atentamente,<br><b>Equipo de Marketing</b> · RED Intelfon</td></tr>
  <tr><td style="background:#1d2735;color:#a9b3c2;font-size:12px;padding:16px 28px;text-align:center"><b style="color:#ffffff">RED Intelfon</b> · Marketing<br>Este aviso se generó desde el dashboard de mailing.</td></tr>
 </table></td></tr></table></body></html>`
}

const base64 = (texto) => {
  const bytes = new TextEncoder().encode(texto)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}
const enLineas = (texto) => base64(texto).match(/.{1,76}/g).join('\r\n')

/** Borrador .eml (X-Unsent: 1 → se abre como correo nuevo sin enviar) con texto y diseño. Nunca se envía solo. */
export function emlCorreo(grupo, para, ahora = Date.now()) {
  const t = textoCorreo(grupo)
  const limite = `RED_INTELFON_MAIL_${ahora}`
  const encabezados = [`To: ${para}`, `Subject: =?UTF-8?B?${base64(t.asunto)}?=`, 'MIME-Version: 1.0', 'X-Unsent: 1', `Content-Type: multipart/alternative; boundary="${limite}"`]
  const texto = `--${limite}\r\nContent-Type: text/plain; charset="utf-8"\r\nContent-Transfer-Encoding: base64\r\n\r\n${enLineas(t.cuerpo)}\r\n`
  const html = `--${limite}\r\nContent-Type: text/html; charset="utf-8"\r\nContent-Transfer-Encoding: base64\r\n\r\n${enLineas(htmlCorreo(grupo))}\r\n`
  return `${encabezados.join('\r\n')}\r\n\r\n${texto}${html}--${limite}--\r\n`
}

/** CSV con la lista de un ejecutivo. */
export const csvGrupo = (grupo) => aCsv([
  { label: 'Ejecutivo', valor: () => grupo.ejecutivo },
  { label: 'Grupo', valor: () => ({ exacta: 'Coincidencia exacta', posible: 'Posible (por dominio)', sin: SIN_IDENTIFICAR }[grupo.tipo]) },
  { label: 'Correo por corregir', valor: (x) => x.correo },
  { label: 'Cliente(s)', valor: (x) => x.clientes.join(' / ') || SIN_IDENTIFICAR },
  { label: 'Campaña(s)', valor: (x) => x.campanas.join(', ') },
  { label: 'Incidencia(s)', valor: (x) => x.motivos.join(' / ') },
  { label: 'Estado(s)', valor: (x) => x.estados.join(' / ') },
], grupo.unicos)

/** CSV resumen por ejecutivo. correoDe(grupo) = correo para notificar (guardado o de la base). */
export const csvResumen = (grupos, correoDe = (g) => g.correoEjecutivo) => aCsv([
  { label: 'Ejecutivo de ventas', valor: (g) => g.ejecutivo },
  { label: 'Grupo', valor: (g) => ({ exacta: 'Coincidencia exacta', posible: 'Posible (por dominio)', sin: SIN_IDENTIFICAR }[g.tipo]) },
  { label: 'Direcciones únicas por corregir', valor: (g) => g.unicos.length },
  { label: 'Registros en campañas', valor: (g) => g.filas.length },
  { label: 'Correo del ejecutivo', valor: (g) => correoDe(g) || 'No configurado' },
], grupos)
