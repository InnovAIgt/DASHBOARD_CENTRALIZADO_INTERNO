// Canales de marketing · Mailing · Relación con clientes (MAILING.md, sección 8).
// Estructura completa; las cifras quedan en «—» hasta tener el cruce con Cumplimiento de Clientes (nunca inventadas).
import { Aviso, Tarjeta, TablaEstructura } from './piezas.jsx'

const CATEGORIAS = [
  { titulo: 'Contacto relacionado con varias empresas', sub: 'El correo aparece en más de un código de cliente', tono: 'mkv2-borde-amarillo' },
  { titulo: 'Identificado en cargo objetivo', sub: 'Aparece en el cargo al que iba la campaña', tono: 'mkv2-borde-verde' },
  { titulo: 'Identificado en otro cargo', sub: 'Aparece, pero en otra gerencia', tono: 'mkv2-borde-azul' },
  { titulo: 'Sin coincidencia en base de clientes', sub: 'No está en las columnas GG, GF ni GO', tono: 'mkv2-borde-tenue' },
]

export function RelacionConClientes() {
  return <>
    <div className="mkv2-hero">
      <div>
        <div className="mkv2-hero-eyebrow">Base de clientes · verificación de correspondencias</div>
        <h2>Relación con clientes</h2>
        <p>Cruce exacto de cada correo con los contactos GG, GF y GO de Cumplimiento de Clientes. El ejecutivo sale de la cuenta del cliente (País + Código de cliente).</p>
      </div>
    </div>
    <Aviso titulo="Pendiente: cruce con Cumplimiento de Clientes" texto="Falta el permiso de lectura de esa base. Mientras tanto no se conecta a ella." />
    <div className="mkv2-minis">
      {CATEGORIAS.map((c) => <div key={c.titulo} className={`mkv2-mini ${c.tono}`}>
        <span className="mkv2-mini-nombre">{c.titulo}</span>
        <span className="mkv2-mini-num">—</span>
        <span className="mkv2-mini-nota">{c.sub}</span>
      </div>)}
    </div>
    <div className="mkv2-logica">
      <strong>Cómo leer las categorías:</strong> cada correo tiene una sola, la de mayor prioridad (en el orden de las
      tarjetas). La comparación es exacta, en minúsculas y sin espacios; no se asume que dos correos son de la misma
      empresa por compartir dominio. «Sin coincidencia» <strong>no</strong> significa correo inválido: solo que no está en la base.
    </div>
    <Tarjeta titulo="Directorio y coincidencias" sub="Un correo por fila con su clasificación, clientes y ejecutivos">
      <TablaEstructura columnas={['Correo', 'Campaña y cargo objetivo', 'Clasificación', 'Cliente(s)', 'Ejecutivo(s)', 'Código(s)', 'Cargo(s) en la base', 'Estado del mailing']}
        mensaje="Pendiente del cruce con Cumplimiento de Clientes y del inicio de sesión real del portal (muestra correos de personas)." />
    </Tarjeta>
  </>
}
