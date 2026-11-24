// Canales de marketing · Mailing: cómo se muestran Cliente, País y Ejecutivo del cruce con Cumplimiento de Clientes.
//  - Coincidencia EXACTA: el nombre tal cual (si el correo está en varias empresas, todas).
//  - POSIBLE (por dominio): «Posible cliente: <Empresa> (por dominio)», en otro color y con borde punteado; nunca se ve
//    igual que una exacta.
//  - Sin coincidencia: «Sin identificar». Sin cruce disponible: «Pendiente del cruce».
import { Bandera } from '../../../flujo-ventas-v2/pantalla/comunes.jsx'
import { empresasDe } from '../../datos/calculos.js'

const NOMBRE_PAIS = { GT: 'Guatemala', SV: 'El Salvador' }
const unicos = (lista) => [...new Set(lista.filter(Boolean))]

/** Texto de una columna (para Excel y búsquedas). campo: 'cliente' | 'pais' | 'ejecutivo'. */
export function textoEmpresas(fila, campo) {
  if (fila?.clientes === null || fila?.clientes === undefined) return 'Pendiente del cruce'
  const { tipo, empresas } = empresasDe(fila)
  if (tipo === 'sin') return 'Sin identificar'
  const valores = unicos(empresas.map((e) => (campo === 'cliente' ? `${e.cliente} (${e.pais}-${e.codigo})` : campo === 'pais' ? NOMBRE_PAIS[e.pais] ?? e.pais : e.ejecutivo)))
  if (tipo === 'posible') return valores.map((v) => `Posible ${campo === 'cliente' ? 'cliente' : campo}: ${v} (por dominio)`).join(' · ')
  return valores.join(' · ')
}

/** Celda de tabla con el mismo contenido que textoEmpresas, pero con estilo. */
export function CeldaEmpresas({ fila, campo }) {
  if (fila?.clientes === null || fila?.clientes === undefined) return <span className="fv2-tenue">Pendiente del cruce</span>
  const { tipo, empresas } = empresasDe(fila)
  if (tipo === 'sin') return <span className="fv2-tenue">Sin identificar</span>
  const posible = tipo === 'posible'
  const items = campo === 'pais'
    ? unicos(empresas.map((e) => e.pais)).map((p) => <span key={p} className="mkv2-pais-celda"><Bandera pais={p} />{p}</span>)
    : campo === 'cliente'
      ? empresas.map((e) => <span key={`${e.pais}-${e.codigo}`} className="mkv2-empresa"><strong>{e.cliente}</strong><small>{e.pais}-{e.codigo}{e.cargos?.length ? ` · ${e.cargos.join('/')}` : ''}</small></span>)
      : unicos(empresas.map((e) => e.ejecutivo)).map((n) => <span key={n}>{n}</span>)
  return <span className={`mkv2-empresas ${posible ? 'mkv2-posible' : ''}`} title={posible ? 'Posible: el dominio del correo coincide con un contacto de Cumplimiento. No es coincidencia exacta.' : undefined}>
    {posible && <em className="mkv2-posible-etiqueta">{campo === 'cliente' ? 'Posible cliente (por dominio)' : 'Posible (por dominio)'}</em>}
    {items}
  </span>
}
