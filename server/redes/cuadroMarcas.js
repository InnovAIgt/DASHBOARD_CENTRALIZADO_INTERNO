/**
 * Canales de marketing · Redes sociales: cuadro marca → país → cuentas de Meta (REDES.md, secciones 1 y 7).
 *
 * Solo ids públicos de Meta, nunca llaves. Llenado con lo que ve el token en la parte (1) (REDES.md, 7.1 y 7.2,
 * 24/11/2026). DATA RED es de El Salvador (confirmado el 23/11/2026).
 *
 * Cuenta publicitaria: solo act_2035747430056013 (USD, «Negocio de Red Intelfon»; decisión de Keily, 24/11/2026). Se
 * anota en RED SV porque es del negocio de El Salvador, pero el gasto se reparte por la PÁGINA de cada anuncio
 * (server/redes/transformar.js, anunciosPorPagina). La cuenta GTQ (personal, sin anuncios de RED) queda fuera.
 */
export const CUADRO_MARCAS = {
  gt: { nombre: 'RED Intelfon Guatemala', pais: 'GT', paginaFacebook: '254248524588808', instagram: '17841433874056396', cuentasAnuncios: [] },
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
