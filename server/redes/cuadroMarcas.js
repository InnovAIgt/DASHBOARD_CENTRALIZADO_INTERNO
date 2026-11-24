/**
 * Canales de marketing · Redes sociales: cuadro marca → país → cuentas de Meta (REDES.md, secciones 1 y 7).
 *
 * Solo ids públicos de Meta, nunca llaves. Se llena en la parte (1), con la lista que confirme Marketing (Erick /
 * Ismael) de lo que ve el token. Mientras esté vacío, las rutas responden «falta el cuadro de cuentas».
 * DATA RED es de El Salvador (confirmado el 23/11/2026).
 */
export const CUADRO_MARCAS = {
  gt: { nombre: 'RED Intelfon Guatemala', pais: 'GT', paginaFacebook: '', instagram: '', cuentasAnuncios: [] },
  sv: { nombre: 'RED Intelfon El Salvador', pais: 'SV', paginaFacebook: '', instagram: '', cuentasAnuncios: [] },
  dr: { nombre: 'DATA RED', pais: 'SV', paginaFacebook: '', instagram: '', cuentasAnuncios: [] },
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
