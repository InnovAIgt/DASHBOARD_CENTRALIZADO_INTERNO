// Canales de marketing · pantalla principal (menú Marketing → Canales de marketing).
// Parte 2: solo estructura con 3 pestañas (Mailing, Redes sociales, Otros). Sin datos reales ni
// inventados y sin llamadas a ninguna API.
// Reutiliza los estilos de Flujo de ventas (flujo-ventas-v2.css, clase fv2) sin modificarlos:
// si cambian allá, cambian aquí. Lo propio va en marketing-v2.css (prefijo mkv2-).
// Documentación: docs/marketing/v2/README.md
import { useState } from 'react'
import '../flujo-ventas-v2/flujo-ventas-v2.css'
import './marketing-v2.css'
import { AvisoPendiente } from './pantalla/comunes.jsx'
import { Mailing, SUBPESTANAS_MAILING } from './pantalla/Mailing.jsx'
import { Redes } from './pantalla/Redes.jsx'

const PESTANAS = [
  { key: 'mailing', label: 'Mailing' },
  { key: 'redes', label: 'Redes sociales' },
  { key: 'otros', label: 'Otros' },
]

/** Valor que se recuerda mientras la página esté abierta (sessionStorage; si falla, solo en memoria). */
function useRecordado(clave, inicial, validos) {
  const [valor, setValor] = useState(() => {
    try {
      const v = sessionStorage.getItem(clave)
      return v != null && validos.includes(v) ? v : inicial
    } catch { return inicial }
  })
  const guardar = (v) => {
    setValor(v)
    try { sessionStorage.setItem(clave, v) } catch { /* solo en memoria */ }
  }
  return [valor, guardar]
}

export function MarketingV2() {
  const [pestana, setPestana] = useRecordado('mkv2-pestana', 'mailing', PESTANAS.map((p) => p.key))
  const [subMailing, setSubMailing] = useRecordado('mkv2-mailing', 'generales', SUBPESTANAS_MAILING.map((p) => p.key))

  return <div className="fv2 mkv2">
    <div className="fv2-pagina">
      <header className="fv2-encabezado">
        <div>
          <div className="fv2-eyebrow">Marketing · Canales de marketing</div>
          <h1 className="fv2-titulo">Canales de marketing</h1>
          <p className="fv2-subtitulo">Campañas de correo, redes sociales y otros canales · Guatemala y El Salvador</p>
        </div>
      </header>

      <nav className="fv2-pestanas" role="tablist" aria-label="Canales de marketing">
        {PESTANAS.map((p) => <button type="button" key={p.key} role="tab" aria-selected={pestana === p.key}
          className={`fv2-pestana ${pestana === p.key ? 'is-activa' : ''}`} onClick={() => setPestana(p.key)}>{p.label}</button>)}
      </nav>

      {pestana === 'mailing' && <Mailing sub={subMailing} onSub={setSubMailing} />}
      {pestana === 'redes' && <Redes />}
      {pestana === 'otros' && <AvisoPendiente titulo="Próximamente (PBX, web, etc.)" proximamente />}
    </div>
  </div>
}
