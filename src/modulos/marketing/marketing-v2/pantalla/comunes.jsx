// Canales de marketing · piezas comunes de la pantalla (avisos, paneles y tablas vacías).
// Parte 2: solo estructura. No hay datos reales ni inventados ni llamadas a ninguna API.
// Documentación: docs/marketing/v2/README.md
import { Clock, Hourglass, Lock } from 'lucide-react'

/** Aviso grande de algo que todavía no está conectado (Brevo, Meta) o que viene después. */
export function AvisoPendiente({ titulo, texto, proximamente = false }) {
  const Icono = proximamente ? Clock : Hourglass
  return <div className="mkv2-aviso" role="status">
    <Icono size={20} aria-hidden="true" />
    <div>
      <strong>{titulo}</strong>
      {texto && <span>{texto}</span>}
    </div>
  </div>
}

/** Aviso de las pestañas que mostrarán correos de personas: pedirán el inicio de sesión del portal. */
export function AvisoSesion() {
  return <div className="mkv2-aviso-sesion" role="note">
    <Lock size={15} aria-hidden="true" />
    Esta pestaña mostrará correos de personas: pedirá el inicio de sesión del portal.
  </div>
}

/** Panel con título y, adentro, lo que se le pase (vacío por ahora). */
export function Panel({ titulo, sub, children, className = '' }) {
  return <section className={`fv2-panel ${className}`}>
    <div className="fv2-panel-cabeza">
      <div>
        <div className="fv2-panel-titulo">{titulo}</div>
        {sub && <div className="fv2-panel-sub">{sub}</div>}
      </div>
    </div>
    {children}
  </section>
}

/** Espacio vacío dentro de un panel. */
export function Vacio({ texto = 'Sin datos todavía.' }) {
  return <div className="fv2-vacio"><span>{texto}</span></div>
}

/** Tabla con sus columnas y una sola fila que dice que no hay datos. */
export function TablaVacia({ columnas, texto = 'Sin datos: pendiente de conexión con Brevo.' }) {
  return <div className="fv2-tabla-caja">
    <table className="fv2-tabla">
      <thead><tr>{columnas.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
      <tbody><tr><td colSpan={columnas.length} className="fv2-tabla-vacia">{texto}</td></tr></tbody>
    </table>
  </div>
}

/** Tarjeta de indicador sin número todavía («—»). */
export function KpiVacio({ etiqueta, nota }) {
  return <div className="fv2-kpi mkv2-kpi">
    <span className="fv2-kpi-etiqueta">{etiqueta}</span>
    <span className="fv2-kpi-numero">—</span>
    {nota && <span className="fv2-kpi-nota">{nota}</span>}
  </div>
}
