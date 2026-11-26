/**
 * Canales de marketing · Redes sociales: cuadro marca → país → cuentas de Meta (REDES.md, secciones 1 y 7).
 *
 * Solo ids públicos de Meta, nunca llaves. Llenado con lo que ve el token en la parte (1) (REDES.md, 7.1 y 7.2,
 * 24/11/2026). DATA RED es de El Salvador (confirmado el 23/11/2026).
 *
 * Cuentas publicitarias (el gasto se reparte por la PÁGINA de cada anuncio, server/redes/transformar.js):
 *   · act_2035747430056013 (USD, «Negocio de Red Intelfon», El Salvador; decisión de Keily, 24/11/2026).
 *   · act_2226740844336751 (GTQ, «RED Intelfon Cuenta publicitaria GT»; integrada el 25/11/2026). Se pasa a US$ con
 *     TIPO_CAMBIO_GTQ_USD (server/redes/moneda.js). Al 25/11/2026 todo su gasto de 2026 es de la página RED GT.
 * La cuenta GTQ personal act_1657231285337963 (sin anuncios de RED) sigue fuera.
 */
export const CUADRO_MARCAS = {
  gt: { nombre: 'RED Intelfon Guatemala', pais: 'GT', paginaFacebook: '254248524588808', instagram: '17841433874056396', cuentasAnuncios: ['2226740844336751'] },
  sv: { nombre: 'RED Intelfon El Salvador', pais: 'SV', paginaFacebook: '158499677543511', instagram: '17841452455981746', cuentasAnuncios: ['2035747430056013'] },
  dr: { nombre: 'DATA RED', pais: 'SV', paginaFacebook: '1380958005335649', instagram: '17841471744067980', cuentasAnuncios: [] },
}

/** Marca de una página de Facebook o una cuenta de Instagram, por su id (para repartir los anuncios). */
export function marcaPorCuenta(cuadro = CUADRO_MARCAS) {
  const mapa = new Map()
  for (const [marca, m] of Object.entries(cuadro)) {
    if (m.paginaFacebook) mapa.set(String(m.paginaFacebook), marca)
    if (m.instagram) mapa.set(String(m.instagram), marca)
  }
  return mapa
}

/** ¿El cuadro tiene al menos una cuenta? */
export const cuadroListo = (cuadro = CUADRO_MARCAS) => Object.values(cuadro).some((m) => m.paginaFacebook || m.instagram || m.cuentasAnuncios?.length)

/** Lista plana de cuentas del cuadro: [{marca, pais, red: 'fb'|'ig'|'ads', id}]. */
export function cuentasDelCuadro(cuadro = CUADRO_MARCAS) {
  return Object.entries(cuadro).flatMap(([marca, m]) => [
    ...(m.paginaFacebook ? [{ marca, pais: m.pais, red: 'fb', id: String(m.paginaFacebook) }] : []),
    ...(m.instagram ? [{ marca, pais: m.pais, red: 'ig', id: String(m.instagram) }] : []),
    ...(m.cuentasAnuncios ?? []).map((id) => ({ marca, pais: m.pais, red: 'ads', id: String(id).replace(/^act_/, '') })),
  ])
}
