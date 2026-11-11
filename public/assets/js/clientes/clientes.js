/* ══════════════════════════════════════════════════════════════════
   STORE CLIENTES · RED Intelfon
   Lee la plataforma «Store de Contactos Clientes» (Supabase), igual que
   SAC: una función «safe» con la llave publicable, en vivo cada vez que
   se abre el dashboard o se pulsa «Actualizar datos».

   Muestra lo que ve el administrador en la plataforma, en solo lectura:
   carteras, clientes con sus 12 variables, avance, historial, N/A por
   aprobar, usuarios y datos marcados como no válidos. No llegan valores
   de contacto (teléfonos, correos, nombres de gerentes): solo si cada
   dato está válido, por corregir o pendiente.

   Cumplimiento = datos válidos / (clientes × 12). Cada cliente tiene
   3 cargos (GG, GF, GO) × 4 datos (nombre, teléfono fijo, celular, correo).
   ══════════════════════════════════════════════════════════════════ */
(function () {
  const API = 'https://grultaxaxbcruzoeljld.supabase.co/rest/v1/rpc/tablero_cumplimiento_safe';
  const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdydWx0YXhheGJjcnV6b2VsamxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3NTQ3NzUsImV4cCI6MjEwNzMzMDc3NX0.ztwf9manF8h5JtVxqLnEc48tZ3r95iUjz2SwUw0HW6M';

  const CARGOS = { gg: 'Gerente General', gf: 'Gerente Financiero', go: 'Gerente de Operaciones' };
  const CAMPOS = { nombre: 'Nombre', fijo: 'Tel. fijo', fijo_ext: 'Extensión', celular: 'Celular', email: 'Correo' };
  const ORDEN = ['nombre', 'fijo', 'celular', 'email'];
  const NIVELES = [
    { k: 'bajo', label: 'Menos de 50 %', color: '#d95f6e' },
    { k: 'medio', label: '50 a 99 %', color: '#c59600' },
    { k: 'completo', label: '100 %', color: '#2f8f76' },
  ];
  const ESTADOS = [
    { k: '', label: 'Todos' },
    { k: 'COMPLETO', label: 'Completos', uno: 'Completo', pill: 'pill-ok' },
    { k: 'CORREGIR', label: 'Por corregir', uno: 'Por corregir', pill: 'pill-error' },
    { k: 'PENDIENTE', label: 'Pendientes', uno: 'Pendiente', pill: 'pill-warn' },
    { k: 'VACIO', label: 'Vacíos', uno: 'Vacío', pill: 'pill-muted' },
  ];
  const PAGINA = 100;

  let datos = null;
  let pais = '';
  let periodo = 'semana';
  let estado = '';
  let mostrar = PAGINA;
  let abierta = null;
  let nombres = {};

  const $ = (id) => document.getElementById(id);
  const fmt = (n) => Number(n || 0).toLocaleString('es-GT');
  const pct = (v, c) => (c ? (v * 100) / (c * 12) : 0);
  const f1 = (n) => n.toFixed(1);
  const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const nivel = (p) => (p >= 100 ? NIVELES[2] : p >= 50 ? NIVELES[1] : NIVELES[0]);
  const sumar = (filas, f) => filas.reduce((a, x) => a + (f(x) || 0), 0);
  const delPais = (x) => !pais || x.pais === pais;
  const validosDe = (c) => (c.m.match(/v/g) || []).length;
  const norm = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const fecha = (t, conHora = true) => (t ? new Date(t).toLocaleString('es-GT', {
    timeZone: 'America/Guatemala', day: '2-digit', month: 'short', ...(conHora ? { hour: '2-digit', minute: '2-digit' } : {}),
  }) : '—');
  const vacia = (cols, txt) => `<tr><td class="mso-empty-cell" colspan="${cols}">${txt}</td></tr>`;

  /** Diferencia con signo y color: en «por corregir», bajar es mejorar. */
  function delta(antes, ahora, { pts = false, menosEsMejor = false } = {}) {
    const d = pts ? Math.round((ahora - antes) * 10) / 10 : ahora - antes;
    if (!d) return '<span class="cc-d">sin cambio</span>';
    const bien = (d > 0) !== menosEsMejor;
    return `<b class="cc-d ${bien ? 'cc-verde' : 'cc-rojo'}">${d > 0 ? '+' : '−'}${pts ? f1(Math.abs(d)) + '%' : fmt(Math.abs(d))}</b>`;
  }

  const conSigno = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + fmt(Math.abs(n));

  /** Estado de un cliente, con la misma regla que la plataforma. */
  function estadoDe(c) {
    const v = validosDe(c);
    if (v === 12) return 'COMPLETO';
    if (c.m.includes('c')) return 'CORREGIR';
    if (v === 0) return 'VACIO';
    return 'PENDIENTE';
  }
  const pillEstado = (k) => {
    const e = ESTADOS.find((x) => x.k === k);
    return `<span class="pill ${e.pill}">${e.uno}</span>`;
  };

  /** Las 12 marcas de un cliente, en tres grupos (GG, GF, GO). */
  function marcas(m) {
    const t = { v: 'válido', c: 'por corregir', x: 'pendiente' };
    let h = `<span class="cc-mk" role="img" aria-label="${validosDe({ m })} de 12 válidos">`;
    ['gg', 'gf', 'go'].forEach((cargo, i) => {
      h += '<span class="cc-mk-g">';
      for (let j = 0; j < 4; j++) {
        const s = m[i * 4 + j];
        h += `<i class="cc-mk-${s}" title="${cargo.toUpperCase()} · ${CAMPOS[ORDEN[j]]}: ${t[s]}"></i>`;
      }
      h += '</span>';
    });
    return h + '</span>';
  }

  const personas = () => datos.personas.filter(delPais);
  const conCartera = () => personas().filter((p) => p.clientes > 0);

  // ── KPI ────────────────────────────────────────────────────────────
  function kpis() {
    const ps = conCartera();
    const cl = sumar(ps, (p) => p.clientes);
    const v = sumar(ps, (p) => p.validos);
    const m = sumar(ps, (p) => p.por_corregir);
    const x = sumar(ps, (p) => p.vacios);
    const k = sumar(ps, (p) => p.completos);
    const va = sumar(ps, (p) => p.semana.validos);
    const ka = sumar(ps, (p) => p.semana.completos);
    const ca = sumar(ps, (p) => p.semana.clientes);
    const esc7 = sumar(personas(), (p) => p.semana.escritos);
    const na = datos.na.filter(delPais).length;
    const p = pct(v, cl);
    $('kCumpl').textContent = f1(p) + '%';
    $('kCumpl').style.color = nivel(p).color;
    $('kCumplSub').textContent = `${fmt(cl)} clientes · ${fmt(cl * 12)} datos requeridos`;
    $('kValidos').textContent = fmt(v);
    $('kValidosSub').textContent = `${fmt(x)} pendientes de llenar`;
    $('kCorregir').textContent = fmt(m);
    $('kCorregirSub').textContent = na ? `${fmt(na)} N/A por aprobar` : 'Tienen dato, pero no es válido';
    $('kCompletas').textContent = f1(cl ? (k * 100) / cl : 0) + '%';
    $('kCompletasSub').textContent = `${conSigno(k - ka)} fichas en 7 días · ${fmt(k)} de ${fmt(cl)} con las 12`;
    // Lo principal es cuánto subió el cumplimiento (en %); abajo, en gris, cuántos datos fueron.
    const dp = Math.round((p - pct(va, ca)) * 10) / 10;
    $('kAvance').textContent = (dp >= 0 ? '+' : '−') + f1(Math.abs(dp)) + '%';
    $('kAvance').className = `kpi-value ${dp >= 0 ? 'cc-verde' : 'cc-rojo'}`;
    $('kAvanceSub').textContent = `${conSigno(v - va)} datos válidos · ${fmt(esc7)} escritos`;
  }

  // ── Vista general ─────────────────────────────────────────────────
  function campos() {
    const filas = [];
    for (const cargo of Object.keys(CARGOS)) {
      filas.push(`<div class="cc-stack-cargo">${CARGOS[cargo]}</div>`);
      for (const campo of ORDEN) {
        const r = datos.campos.filter((c) => c.cargo === cargo && c.campo === campo && delPais(c));
        const ok = sumar(r, (c) => c.validos), mal = sumar(r, (c) => c.por_corregir), vac = sumar(r, (c) => c.vacios);
        const t = ok + mal + vac || 1;
        filas.push(`<div class="cc-stack" title="${CARGOS[cargo]} · ${CAMPOS[campo]}: ${fmt(ok)} válidos, ${fmt(mal)} por corregir, ${fmt(vac)} pendientes">
          <span class="cc-stack-lbl">${CAMPOS[campo]}</span>
          <span class="cc-stack-bar"><i class="cc-bg-ok" style="width:${(ok * 100) / t}%"></i><i class="cc-bg-mal" style="width:${(mal * 100) / t}%"></i><i class="cc-bg-vacio" style="width:${(vac * 100) / t}%"></i></span>
          <span class="cc-stack-val">${Math.round((ok * 100) / t)}%</span>
        </div>`);
      }
    }
    $('ccCampos').innerHTML = filas.join('');
  }

  function niveles() {
    const r = datos.niveles.filter(delPais);
    const tot = NIVELES.map((n) => ({ ...n, v: sumar(r, (x) => x[n.k]) }));
    const max = Math.max(1, ...tot.map((n) => n.v));
    const todos = sumar(tot, (n) => n.v) || 1;
    $('ccNiveles').innerHTML = tot.map((n) => `<div class="vertical-bar" title="${n.label}: ${fmt(n.v)} clientes">
        <span class="bar-value">${fmt(n.v)}</span>
        <span class="bar-column"><span style="--bar-height:${(n.v * 100) / max}%;background:${n.color}"></span></span>
        <label>${n.label}</label></div>`).join('');
    $('ccNivelesLeyenda').innerHTML = tot.map((n) => `<span><i style="background:${n.color}"></i>${n.label} <b>${Math.round((n.v * 100) / todos)}%</b></span>`).join('');
  }

  function ranking() {
    const ps = conCartera().map((p) => ({ ...p, pc: pct(p.validos, p.clientes) })).sort((a, b) => a.pc - b.pc || a.nombre.localeCompare(b.nombre, 'es'));
    $('ccRanking').innerHTML = ps.map((p) => `<div class="bar-row cc-rank">
        <div><div class="bar-label"><b>${esc(p.nombre)}</b>${p.sin_duenio ? ' <span class="pill pill-muted">Sin dueño</span>' : ''} · ${p.pais} · ${fmt(p.clientes)} clientes${p.por_corregir ? ` · <span class="cc-rojo">${fmt(p.por_corregir)} por corregir</span>` : ''}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.max(p.pc, 1)}%;background:${nivel(p.pc).color}"></div></div></div>
        <div class="bar-count">${f1(p.pc)}%</div></div>`).join('') || '<p class="mso-empty">Sin carteras en esta operación.</p>';
  }

  // ── Carteras: una fila por persona; clic abre sus clientes ────────
  function carteras() {
    const ps = personas().slice().sort((a, b) => (a.clientes ? 0 : 1) - (b.clientes ? 0 : 1)
      || pct(a.validos, a.clientes) - pct(b.validos, b.clientes) || a.nombre.localeCompare(b.nombre, 'es'));
    $('ccCarteras').innerHTML = ps.map((p) => {
      const pc = pct(p.validos, p.clientes);
      const tag = p.rol === 'jefe' ? ' <span class="pill pill-ok">Jefe</span>' : p.sin_duenio ? ' <span class="pill pill-muted">Sin dueño</span>' : '';
      const nombre = `<span class="cc-chev" aria-hidden="true">${p.clientes ? (abierta === p.id ? '▾' : '▸') : ''}</span>${esc(p.nombre)}${tag} <span class="cc-gris">${p.pais}</span>`;
      const jefe = p.rol === 'jefe' ? '—' : esc(p.jefe || '—');
      if (!p.clientes) return `<tr><td>${nombre}</td><td class="cc-gris">${jefe}</td><td class="cc-sin" colspan="6">Sin cartera propia</td><td class="cc-num">${fmt(p.semana.escritos)}</td></tr>`;
      let h = `<tr class="cc-abre${abierta === p.id ? ' is-open' : ''}" data-cartera="${esc(p.id)}" tabindex="0" aria-expanded="${abierta === p.id}">
        <td>${nombre}</td><td class="cc-gris">${jefe}</td><td class="cc-num">${fmt(p.clientes)}</td>
        <td class="cc-num" style="color:${nivel(pc).color};font-weight:700">${f1(pc)}%</td><td class="cc-num">${fmt(p.validos)}</td>
        <td class="cc-num${p.por_corregir ? ' cc-rojo' : ''}">${fmt(p.por_corregir)}</td><td class="cc-num">${fmt(p.vacios)}</td>
        <td class="cc-num">${fmt(p.completos)}</td><td class="cc-num">${fmt(p.semana.escritos)}</td></tr>`;
      if (abierta === p.id) {
        const cs = datos.clientes.filter((c) => c.e === p.id)
          .sort((a, b) => validosDe(a) - validosDe(b) || a.nombre.localeCompare(b.nombre, 'es'));
        h += `<tr class="cc-cajon"><td colspan="9"><table class="cc-sub"><thead><tr><th>Código</th><th>Cliente</th><th>Variables <span class="cc-gris">(GG · GF · GO)</span></th><th class="cc-num">Válidos</th><th>Estado</th></tr></thead><tbody>
          ${cs.map((c) => `<tr><td class="cc-gris">${esc(c.codigo)}</td><td>${esc(c.nombre)}</td><td>${marcas(c.m)}</td><td class="cc-num">${validosDe(c)}/12</td><td>${pillEstado(estadoDe(c))}</td></tr>`).join('')}
        </tbody></table></td></tr>`;
      }
      return h;
    }).join('') || vacia(9, 'Sin carteras en esta operación.');
  }

  // ── Clientes: búsqueda, estado y paginación ────────────────────────
  function clientes() {
    const q = norm($('ccBuscar').value.trim());
    const base = datos.clientes.filter(delPais);
    const cuenta = {};
    for (const e of ESTADOS) cuenta[e.k] = 0;
    for (const c of base) { cuenta[''] += 1; cuenta[estadoDe(c)] += 1; }
    $('ccEstados').innerHTML = ESTADOS.map((e) => `<button type="button" class="filter-chip${estado === e.k ? ' active' : ''}" data-estado="${e.k}">${e.label} <b>${fmt(cuenta[e.k])}</b></button>`).join('');
    const lista = base.filter((c) => (!estado || estadoDe(c) === estado)
      && (!q || norm(c.nombre).includes(q) || norm(c.codigo).includes(q) || norm(nombres[c.e]).includes(q)))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    $('ccClientesTxt').textContent = `${fmt(lista.length)} de ${fmt(base.length)} clientes, con el estado de sus 12 variables.`;
    $('ccClientes').innerHTML = lista.slice(0, mostrar).map((c) => `<tr><td class="cc-gris">${esc(c.codigo)}</td><td>${esc(c.nombre)}</td><td>${c.pais}</td><td>${esc(nombres[c.e] || c.e)}</td>
        <td>${marcas(c.m)}</td><td class="cc-num">${validosDe(c)}/12</td><td>${pillEstado(estadoDe(c))}</td></tr>`).join('')
      || vacia(7, q ? `Ningún cliente coincide con «${esc($('ccBuscar').value.trim())}».` : 'Sin clientes con este filtro.');
    const resto = lista.length - mostrar;
    $('ccMas').style.display = resto > 0 ? '' : 'none';
    $('ccMas').textContent = `Mostrar ${fmt(Math.min(resto, PAGINA))} más (quedan ${fmt(resto)})`;
  }

  // ── Avance ────────────────────────────────────────────────────────
  function actividad() {
    const dias = [];
    const inicio = new Date(datos.inicio_hoy);
    for (let i = 13; i >= 0; i--) {
      const d = new Date(inicio.getTime() - i * 864e5 + 6 * 3600e3); // fecha local SV/GT (UTC-6)
      dias.push(d.toISOString().slice(0, 10));
    }
    const vals = dias.map((d) => sumar(datos.actividad.filter((a) => a.dia === d && delPais(a)), (a) => a.datos));
    const max = Math.max(1, ...vals);
    $('ccActividad').innerHTML = dias.map((d, i) => `<div class="vertical-bar" title="${d.slice(8)}/${d.slice(5, 7)}: ${fmt(vals[i])} datos escritos">
        <span class="bar-value">${vals[i] ? fmt(vals[i]) : ''}</span>
        <span class="bar-column">${vals[i] ? `<span style="--bar-height:${Math.max((vals[i] * 100) / max, 3)}%"></span>` : ''}</span>
        <label>${d.slice(8)}/${d.slice(5, 7)}</label></div>`).join('');
    $('ccActividadLeyenda').innerHTML = `<span><i style="background:#4f8fd8"></i>Datos escritos <b>${fmt(sumar(vals, (v) => v))}</b> en 14 días</span>`;
  }

  function avance() {
    const ps = personas().map((p) => ({ p, a: p[periodo] })).sort((x, y) =>
      (y.p.validos - y.a.validos) - (x.p.validos - x.a.validos) || y.a.escritos - x.a.escritos || x.p.nombre.localeCompare(y.p.nombre, 'es'));
    $('ccPeriodoTxt').textContent = periodo === 'hoy' ? 'Desde las 0:00 de hoy. Quien más avanzó, primero.' : 'Últimos 7 días. Quien más avanzó, primero.';
    $('ccAvance').innerHTML = ps.map(({ p, a }) => {
      const quieto = p.validos === a.validos && p.por_corregir === a.por_corregir && p.completos === a.completos && !a.cambios && !a.escritos;
      const nombre = `${esc(p.nombre)}${p.rol === 'jefe' ? ' <span class="pill pill-ok">Jefe</span>' : ''} <span class="cc-gris">${p.pais}</span>`;
      if (!p.clientes && !a.clientes) return `<tr class="${quieto ? 'cc-quieta' : ''}"><td>${nombre}</td><td class="cc-sin" colspan="4">Sin cartera propia</td><td class="cc-num">0</td><td class="cc-num">${fmt(a.escritos)}</td></tr>`;
      const pa = pct(a.validos, a.clientes), pb = pct(p.validos, p.clientes);
      return `<tr class="${quieto ? 'cc-quieta' : ''}"><td>${nombre}</td>
        <td class="cc-num">${f1(pa)} → ${f1(pb)}% ${delta(pa, pb, { pts: true })}</td>
        <td class="cc-num">${fmt(p.validos)} ${delta(a.validos, p.validos)}</td>
        <td class="cc-num">${fmt(p.por_corregir)} ${delta(a.por_corregir, p.por_corregir, { menosEsMejor: true })}</td>
        <td class="cc-num">${fmt(p.completos)} ${delta(a.completos, p.completos)}</td>
        <td class="cc-num">${fmt(a.cambios)}</td><td class="cc-num">${fmt(a.escritos)}</td></tr>`;
    }).join('') || vacia(7, 'Sin personas en esta operación.');
  }

  // ── Historial ─────────────────────────────────────────────────────
  function historial() {
    const q = norm($('ccBuscarHist').value.trim());
    const verbo = { lleno: 'Llenó', borro: 'Borró', cambio: 'Cambió', na: 'N/A confirmado en' };
    const filas = datos.historial.filter((h) => delPais(h) && (!q || norm(h.autor).includes(q) || norm(h.cliente).includes(q) || norm(h.codigo).includes(q)));
    $('ccHistorial').innerHTML = filas.map((h) => {
      let que;
      if (h.tipo === 'envio') que = '<span class="pill pill-ok">Envió la ficha</span>';
      else if (h.tipo === 'reasigno') que = `Reasignó de <b>${esc(h.de || '—')}</b> a <b>${esc(h.a || '—')}</b>`;
      else que = `${verbo[h.tipo]} <b>${h.cargo.toUpperCase()}</b> · ${CAMPOS[h.campo] || h.campo}`;
      return `<tr><td class="cc-gris cc-nw">${fecha(h.t)}</td><td>${esc(h.autor)}</td><td>${que}</td><td>${esc(h.cliente)} <span class="cc-gris">${esc(h.codigo)}</span></td><td>${h.pais}</td></tr>`;
    }).join('') || vacia(5, 'Sin cambios con este filtro.');
  }

  // ── N/A por aprobar ───────────────────────────────────────────────
  function na() {
    const filas = datos.na.filter(delPais);
    const r = datos.na_resueltas || {};
    $('ccNaTxt').textContent = `${fmt(filas.length)} pendientes. Histórico: ${fmt(r.aprobadas)} aprobadas, ${fmt(r.negadas)} negadas y ${fmt(r.canceladas)} canceladas. Se confirman en la campana de la plataforma.`;
    const ahora = Date.now();
    $('ccNa').innerHTML = filas.map((s) => {
      const dias = Math.floor((ahora - new Date(s.t).getTime()) / 864e5);
      return `<tr><td class="cc-gris cc-nw">${fecha(s.t)}</td><td>${esc(s.cliente)} <span class="cc-gris">${esc(s.codigo)}</span></td><td>${s.pais}</td>
        <td><b>${s.cargo.toUpperCase()}</b> <span class="cc-gris">${CARGOS[s.cargo] || ''}</span></td><td>${esc(s.solicito)}</td><td>${esc(s.aprueba || '—')}</td>
        <td class="cc-num${dias >= 2 ? ' cc-rojo' : ''}">${dias === 0 ? 'hoy' : dias === 1 ? '1 día' : dias + ' días'}</td></tr>`;
    }).join('') || vacia(7, 'No hay N/A esperando aprobación.');
  }

  // ── Usuarios y resumen diario ─────────────────────────────────────
  function usuarios() {
    const rol = { admin: 'Administrador', jefe: 'Jefe de ventas', ejecutivo: 'Ejecutivo' };
    const us = datos.usuarios.filter(delPais);
    const activos = us.filter((u) => u.activo && !u.placeholder).length;
    $('ccUsuariosTxt').textContent = `${fmt(us.length)} cuentas · ${fmt(activos)} personas activas. Las altas, bajas y contraseñas se manejan en la plataforma.`;
    $('ccUsuarios').innerHTML = us.map((u) => `<tr class="${u.activo ? '' : 'cc-quieta'}">
        <td>${esc(u.nombre)}${u.placeholder ? ' <span class="pill pill-muted">Sin dueño</span>' : ''}</td>
        <td>${rol[u.rol] || u.rol}</td><td>${u.pais}</td><td class="cc-gris">${esc(u.rol === 'ejecutivo' ? u.jefe || '—' : '—')}</td>
        <td>${u.activo ? '<span class="pill pill-ok">Activo</span>' : '<span class="pill pill-muted">Desactivado</span>'}</td>
        <td>${u.acceso ? 'Sí' : '<span class="cc-gris">Sin acceso</span>'}</td>
        <td>${u.con_correo ? 'Sí' : '<span class="cc-gris">No</span>'}</td><td class="cc-num">${fmt(u.clientes)}</td></tr>`).join('') || vacia(8, 'Sin usuarios en esta operación.');
    $('ccResumen').innerHTML = datos.resumen_diario.map((r) => `<tr><td>${fecha(r.t)}</td><td class="cc-num">${fmt(r.enviados)}</td></tr>`).join('') || vacia(2, 'Todavía no ha corrido.');
  }

  // ── Datos no válidos ──────────────────────────────────────────────
  // El país de un uso es el del cliente que tiene escrito el dato. Un correo
  // que ya no está en ninguna ficha no tiene país (la lista es una sola):
  // solo cuenta en «Todos».
  let ivTipo = '';
  function invalidos() {
    const items = datos.invalidos.filter((i) => !ivTipo || i.tipo === ivTipo);
    const usosDe = (i) => i.usos.filter(delPais);
    const visibles = items.filter((i) => (!pais ? true : i.tipo === 'celular' ? i.pais_lista === pais : usosDe(i).length > 0));
    const conUso = visibles.filter((i) => usosDe(i).length);
    const usos = conUso.flatMap((i) => usosDe(i).map((u) => ({ ...u, i })));
    const nTipo = (lista, t) => lista.filter((i) => i.tipo === t).length;

    $('ivMarcados').textContent = fmt(visibles.length);
    $('ivMarcadosSub').textContent = `${fmt(nTipo(visibles, 'correo'))} correos · ${fmt(nTipo(visibles, 'celular'))} celulares`;
    $('ivUso').textContent = fmt(conUso.length);
    $('ivUsoSub').textContent = `${fmt(nTipo(conUso, 'correo'))} correos · ${fmt(nTipo(conUso, 'celular'))} celulares · en ${fmt(usos.length)} campos`;
    $('ivClientes').textContent = fmt(new Set(usos.map((u) => u.pais + u.codigo)).size);
    $('ivClientesSub').textContent = `en ${fmt(new Set(usos.map((u) => u.e)).size)} carteras`;
    $('ivCorregidos').textContent = fmt(visibles.length - conUso.length);

    const cuenta = { '': 0, correo: 0, celular: 0 };
    for (const i of datos.invalidos) {
      if (pais && !(i.tipo === 'celular' ? i.pais_lista === pais : usosDe(i).length)) continue;
      cuenta[''] += 1; cuenta[i.tipo] += 1;
    }
    $('ivTipos').innerHTML = [['', 'Todos'], ['correo', 'Correos'], ['celular', 'Celulares']]
      .map(([k, l]) => `<button type="button" class="filter-chip${ivTipo === k ? ' active' : ''}" data-ivtipo="${k}">${l} <b>${fmt(cuenta[k])}</b></button>`).join('');

    // Por cartera: quién tiene que corregir
    const porCartera = {};
    for (const u of usos) {
      const x = (porCartera[u.e] ||= { correo: 0, celular: 0, cl: new Set() });
      x[u.i.tipo] += 1;
      x.cl.add(u.codigo);
    }
    $('ivCarteras').innerHTML = Object.entries(porCartera)
      .sort((x, y) => (y[1].correo + y[1].celular) - (x[1].correo + x[1].celular))
      .map(([e, x]) => `<tr><td>${esc(nombres[e] || e)}</td><td class="cc-num${x.correo ? ' cc-rojo' : ''}">${fmt(x.correo)}</td>
        <td class="cc-num${x.celular ? ' cc-rojo' : ''}">${fmt(x.celular)}</td><td class="cc-num">${fmt(x.cl.size)}</td></tr>`).join('')
      || vacia(4, 'Ninguna ficha tiene datos marcados.');

    // Por motivo
    const porMotivo = {};
    for (const i of visibles) {
      const x = (porMotivo[i.tipo + '|' + i.motivo] ||= { tipo: i.tipo, motivo: i.motivo, n: 0, uso: 0 });
      x.n += 1;
      if (usosDe(i).length) x.uso += 1;
    }
    $('ivMotivos').innerHTML = Object.values(porMotivo).sort((x, y) => y.n - x.n)
      .map((x) => `<tr><td>${x.tipo === 'correo' ? 'Correo' : 'Celular'}</td><td>${esc(x.motivo)}</td>
        <td class="cc-num">${fmt(x.n)}</td><td class="cc-num${x.uso ? ' cc-rojo' : ''}">${fmt(x.uso)}</td></tr>`).join('')
      || vacia(4, 'Sin datos marcados.');

    // Detalle: una fila por ficha y cargo
    const q = norm($('ivBuscar').value.trim());
    const filas = usos.filter((u) => !q || norm(u.cliente).includes(q) || norm(u.codigo).includes(q)
        || norm(nombres[u.e]).includes(q) || norm(u.i.dato).includes(q))
      .sort((x, y) => norm(nombres[x.e]).localeCompare(norm(nombres[y.e])) || x.cliente.localeCompare(y.cliente, 'es'));
    $('ivTxt').textContent = `${fmt(filas.length)} campos con un dato marcado. Una fila por ficha y cargo; el dato sale parcialmente oculto.`;
    $('ccInvalidos').innerHTML = filas.map((u) => `<tr><td>${u.i.tipo === 'correo' ? 'Correo' : 'Celular'}</td><td class="cc-mono">${esc(u.i.dato)}</td>
        <td>${esc(u.cliente)} <span class="cc-gris">${esc(u.codigo)}</span></td><td>${u.pais}</td><td>${esc(nombres[u.e] || u.e)}</td>
        <td><b>${u.cargo.toUpperCase()}</b></td><td>${esc(u.i.motivo)}</td>
        <td class="cc-gris cc-nw">${fecha(u.i.marcado, false)}${u.i.marco ? ' · ' + esc(u.i.marco) : ''}</td></tr>`).join('')
      || vacia(8, q ? 'Nada coincide con la búsqueda.' : 'Ninguna ficha tiene datos marcados con este filtro.');
  }

  function pintar() {
    kpis(); campos(); niveles(); ranking(); carteras(); clientes(); actividad(); avance(); historial(); na(); usuarios(); invalidos();
  }

  // ── Carga: en vivo al abrir y con «Actualizar datos» ──────────────
  async function cargar() {
    $('globalError').style.display = 'none';
    $('btnRefresh').classList.add('is-loading');
    try {
      const r = await fetch(API, {
        method: 'POST',
        headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: '{}',
        cache: 'no-store',
      });
      if (!r.ok) throw new Error(`El servidor respondió ${r.status}`);
      datos = await r.json();
      nombres = Object.fromEntries(datos.usuarios.map((u) => [u.id, u.nombre]));
      $('pageSync').textContent = `Datos en vivo de la plataforma de clientes · ${fecha(datos.generado_en)}`;
      $('globalLoader').style.display = 'none';
      $('mainContent').style.display = '';
      pintar();
    } catch (e) {
      $('globalLoader').style.display = 'none';
      $('globalError').style.display = '';
      $('globalError').textContent = `No se pudieron cargar los datos de clientes: ${e.message}`;
    } finally {
      $('btnRefresh').classList.remove('is-loading');
    }
  }

  // ── Eventos ───────────────────────────────────────────────────────
  document.querySelectorAll('[data-pais]').forEach((b) => b.addEventListener('click', () => {
    pais = b.dataset.pais;
    mostrar = PAGINA;
    document.querySelectorAll('[data-pais]').forEach((x) => x.classList.toggle('active', x === b));
    if (datos) pintar();
  }));
  document.querySelectorAll('[data-periodo]').forEach((b) => b.addEventListener('click', () => {
    periodo = b.dataset.periodo;
    document.querySelectorAll('[data-periodo]').forEach((x) => x.classList.toggle('active', x === b));
    if (datos) avance();
  }));
  $('mainTabs').addEventListener('click', (e) => {
    const b = e.target.closest('.tab-btn');
    if (!b) return;
    document.querySelectorAll('.tab-btn').forEach((x) => x.classList.toggle('active', x === b));
    ['general', 'carteras', 'clientes', 'avance', 'historial', 'na', 'usuarios', 'invalidos']
      .forEach((t) => { $('tab-' + t).style.display = t === b.dataset.tab ? '' : 'none'; });
  });
  const alternar = (e) => {
    const fila = e.target.closest('tr[data-cartera]');
    if (!fila || (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    abierta = abierta === fila.dataset.cartera ? null : fila.dataset.cartera;
    carteras();
  };
  $('ccCarteras').addEventListener('click', alternar);
  $('ccCarteras').addEventListener('keydown', alternar);
  $('ccEstados').addEventListener('click', (e) => {
    const b = e.target.closest('[data-estado]');
    if (!b) return;
    estado = b.dataset.estado;
    mostrar = PAGINA;
    clientes();
  });
  let espera;
  $('ccBuscar').addEventListener('input', () => { clearTimeout(espera); espera = setTimeout(() => { mostrar = PAGINA; clientes(); }, 150); });
  $('ccBuscarHist').addEventListener('input', () => { clearTimeout(espera); espera = setTimeout(historial, 150); });
  $('ivTipos').addEventListener('click', (e) => {
    const b = e.target.closest('[data-ivtipo]');
    if (!b) return;
    ivTipo = b.dataset.ivtipo;
    invalidos();
  });
  $('ivBuscar').addEventListener('input', () => { clearTimeout(espera); espera = setTimeout(invalidos, 150); });
  $('ccMas').addEventListener('click', () => { mostrar += PAGINA; clientes(); });
  $('btnRefresh').addEventListener('click', cargar);

  cargar();
})();
