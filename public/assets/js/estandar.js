/* ══════════════════════════════════════════════════════════════════
   ESTÁNDAR VISUAL — gráficas Chart.js con el aspecto de SIMs
   Solo presentación y solo valores POR DEFECTO de Chart.js (tipografía,
   color de texto y cuadrícula, viñetas de leyenda y tooltip). No modifica
   las opciones de cada gráfica, ni datos, ni colores de las series.
   Se carga al final de cada dashboard, junto con assets/css/estandar.css.
   ══════════════════════════════════════════════════════════════════ */
(function () {
  function aplicar() {
    const C = window.Chart;
    if (!C || !C.defaults) return;
    const d = C.defaults;
    try {
      d.font.family = "'Segoe UI', system-ui, sans-serif";
      d.font.size = 11;
      d.color = '#8b909e';
      d.borderColor = 'rgba(255, 255, 255, .08)';
      const lg = d.plugins.legend.labels;
      lg.usePointStyle = true;
      lg.pointStyle = 'rectRounded';
      lg.boxWidth = 9;
      lg.boxHeight = 9;
      const tt = d.plugins.tooltip;
      tt.backgroundColor = '#242837';
      tt.borderColor = 'rgba(255, 255, 255, .16)';
      tt.borderWidth = 1;
      tt.titleColor = '#e8eaf0';
      tt.bodyColor = '#8b909e';
      tt.padding = 10;
      tt.cornerRadius = 9;
      d.animation = Object.assign(d.animation || {}, { duration: 800, easing: 'easeOutQuart' });
    } catch (e) { /* versión de Chart.js sin alguno de estos valores: se deja como está */ }
  }
  aplicar();
  window.addEventListener('DOMContentLoaded', aplicar);
  // Inventario y Órdenes de compra cargan Chart.js después (ensureChartJs):
  // se aplican los valores en cuanto termina de cargar cualquier script.
  document.addEventListener('load', e => { if (e.target && e.target.tagName === 'SCRIPT') aplicar(); }, true);
})();

/* ══════════════════════════════════════════════════════════════════
   CONSULTA A LA API — igual que SIMs
   Detecta las consultas de datos (fetch, XHR y JSONP) sin tocar la lógica
   del dashboard y muestra el estado como SIMs:
   · pastilla bajo el título: "Consultando la API…" (con spinner) →
     "…puede tardar hasta un minuto" → "Actualizado HH:MM" /
     "Sin conexión con el servidor de datos";
   · secciones resaltadas mientras llegan los datos (.std-busy);
   · body.std-cargando para mostrar el spinner de SIMs en la primera carga.
   Los indicadores propios de cada dashboard se ocultan en estandar.css.
   ══════════════════════════════════════════════════════════════════ */
(function () {
  const ESTATICO = /\.(css|js|mjs|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|otf|map)(\?|#|$)/i;
  const LIBRERIA = /fonts\.(googleapis|gstatic)\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|unpkg\.com/i;
  const PANELES = '.card, .chart-panel, .chart-card, .oc-card, .bill-card, .bill-panel, .apx-card, .pc-chart-card, .rrss-card, .content-panel, .kpi, .kpi-card, .kpi-card-exact, .oc-kpi, .bill-kpi, .stat-box, .apx-kpi, .table-wrap';
  let activas = 0, huboError = false, lentoTimer = null, pill = null, primeraCarga = true, huboConsulta = false;
  // Última acción del usuario (clic, cambio de filtro, tecla): solo las consultas que él
  // dispara resaltan las secciones, como "Actualizar datos" en SIMs. Las consultas
  // automáticas o en segundo plano (p. ej. la API en vivo de Ingresos tras el snapshot)
  // solo cambian la pastilla de estado; así el contenido no parpadea mientras responden.
  let ultimaAccion = 0;
  ['click', 'change', 'keydown'].forEach(ev => document.addEventListener(ev, () => { ultimaAccion = Date.now(); }, true));

  // Precarga: hasta que el HTML está listo no se pinta nada. Así ningún KPI, viñeta
  // o gráfica aparece antes que el spinner (antes se veían un instante y luego se ocultaban).
  document.documentElement.classList.add('std-precarga');

  const esDato = url => {
    try {
      const u = new URL(String(url), location.href);
      return /^https?:$/.test(u.protocol) && !ESTATICO.test(u.pathname) && !LIBRERIA.test(u.host);
    } catch (e) { return false; }
  };

  function crearPill() {
    if (pill || !document.body) return pill;
    if (document.querySelector('.bill-status-pill')) return null;
    const titulo = document.querySelector('h1, .cover-title, #pageTitle');
    if (!titulo) return null;
    pill = document.createElement('p');
    pill.className = 'std-sync';
    pill.setAttribute('role', 'status');
    pill.setAttribute('aria-live', 'polite');
    // Debajo del subtítulo (o del título si no hay subtítulo)
    let ancla = titulo;
    const sig = titulo.nextElementSibling;
    if (sig && !sig.matches('button, .btn, div:has(button)') && sig.textContent.trim().length < 200) ancla = sig;
    ancla.insertAdjacentElement('afterend', pill);
    return pill;
  }

  function pintar(estado, texto) {
    const p = crearPill();
    if (!p) return;
    p.classList.toggle('std-sync-busy', estado === 'busy');
    p.classList.toggle('std-sync-error', estado === 'error');
    p.textContent = texto;
  }

  function marcarPaneles(on) {
    document.querySelectorAll(on ? PANELES : '.std-busy').forEach(el => {
      if (!on) { el.classList.remove('std-busy'); return; }
      if (el.offsetParent !== null && !el.closest('.xf-panel, .mso-modal')) el.classList.add('std-busy');
    });
  }

  // Primera carga como SIMs: solo el encabezado y el spinner; todo lo que está debajo
  // del encabezado se oculta ([data-std-gate]) y aparece junto cuando llegan los datos.
  // Es un atributo y no una clase: varios dashboards reescriben className al pintar
  // (p. ej. el aviso de SAC) y con una clase el elemento quedaba visible antes de tiempo.
  function ocultarContenido() {
    const titulo = document.querySelector('h1, .cover-title, #pageTitle');
    if (!titulo) return;
    let cab = titulo.closest('.title-container, .page-header, .oc-header, .bill-header, header, .cab, .topbar, .hero, .header, .apx-header') || titulo.parentElement;
    while (!cab.nextElementSibling && cab.parentElement && cab.parentElement !== document.body) cab = cab.parentElement;
    for (let nodo = cab; nodo && nodo !== document.body; nodo = nodo.parentElement) {
      for (let sig = nodo.nextElementSibling; sig; sig = sig.nextElementSibling) {
        if (!sig.matches('script, style, link, .std-loader, .std-sync')) sig.setAttribute('data-std-gate', '');
      }
    }
  }

  // Primera carga: encabezado + spinner de SIMs; el resto espera a los datos
  function arrancarCarga() {
    if (!primeraCarga || !document.body) return;
    document.documentElement.classList.add('std-cargando');
    if (!document.querySelector('.std-loader')) document.body.insertAdjacentHTML('beforeend', '<div class="std-loader" aria-hidden="true"></div>');
    ocultarContenido();
  }
  // Muestra el contenido (una sola vez): cuando llegan los datos, si el dashboard
  // no consulta APIs, o por tope de tiempo
  function liberar() {
    if (!primeraCarga) return;
    primeraCarga = false;
    document.documentElement.classList.remove('std-cargando', 'std-precarga');
    document.dispatchEvent(new Event('std-listo'));
  }
  document.addEventListener('DOMContentLoaded', () => {
    arrancarCarga();
    document.documentElement.classList.remove('std-precarga');
    // Dashboards que no consultan APIs (cargan archivos): se muestran al terminar de cargar la página
    const sinApi = () => setTimeout(() => { if (!huboConsulta) liberar(); }, 700);
    if (document.readyState === 'complete') sinApi(); else window.addEventListener('load', sinApi, { once: true });
    setTimeout(liberar, 12000);
  });

  function inicio() {
    huboConsulta = true;
    activas++;
    if (activas !== 1) return;
    huboError = false;
    document.documentElement.classList.add('std-consultando');
    if (primeraCarga) {
      arrancarCarga();
      // Tope: si una API tarda demasiado, el contenido se muestra igual (la pastilla sigue consultando)
      setTimeout(liberar, 6000);
    }
    pintar('busy', 'Consultando la API…');
    if (!primeraCarga && Date.now() - ultimaAccion < 1500) marcarPaneles(true);
    clearTimeout(lentoTimer);
    lentoTimer = setTimeout(() => { if (activas) pintar('busy', 'Consultando la API… puede tardar hasta un minuto'); }, 2500);
  }

  // El portal (dashboard_centralizado.html) muestra arriba a la derecha cuándo se
  // actualizaron los datos del dashboard abierto: se le avisa al terminar cada consulta.
  function avisarPortal(fecha) {
    if (window.parent === window) return;
    try { window.parent.postMessage({ tipo: 'intelfon-datos-actualizados', fecha: fecha ? fecha.toISOString() : null }, '*'); } catch (e) { /* sin portal */ }
  }

  function fin(error) {
    if (error) huboError = true;
    activas = Math.max(0, activas - 1);
    if (activas) return;
    clearTimeout(lentoTimer);
    // Pequeña espera: varias consultas seguidas se ven como una sola
    setTimeout(() => {
      if (activas) return;
      document.documentElement.classList.remove('std-consultando');
      liberar();
      marcarPaneles(false);
      const ahora = new Date();
      const hora = ahora.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
      if (huboError) pintar('error', 'Sin conexión con el servidor de datos');
      else pintar('ok', 'Actualizado ' + hora);
      avisarPortal(huboError ? null : ahora);
    }, 150);
  }

  // fetch
  if (window.fetch) {
    const fetchOriginal = window.fetch.bind(window);
    window.fetch = function (recurso, opciones) {
      const url = recurso && recurso.url ? recurso.url : recurso;
      if (!esDato(url)) return fetchOriginal(recurso, opciones);
      inicio();
      return fetchOriginal(recurso, opciones).then(
        r => { fin(false); return r; },
        e => { fin(true); throw e; }
      );
    };
  }

  // XMLHttpRequest
  const abrir = XMLHttpRequest.prototype.open, enviar = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (metodo, url) { this._stdDato = esDato(url); return abrir.apply(this, arguments); };
  XMLHttpRequest.prototype.send = function () {
    if (this._stdDato) {
      inicio();
      this.addEventListener('loadend', () => fin(this.status === 0), { once: true });
    }
    return enviar.apply(this, arguments);
  };

  // JSONP (p. ej. Google Sheets en GPS): <script src="…callback=…">
  const esJsonp = s => s.tagName === 'SCRIPT' && s.src && /[?&](callback|tqx|jsonp)=|script\.google\.com|docs\.google\.com\/spreadsheets/i.test(s.src);
  new MutationObserver(cambios => cambios.forEach(c => c.addedNodes.forEach(n => {
    if (n.nodeType !== 1 || !esJsonp(n)) return;
    inicio();
    n.addEventListener('load', () => fin(false), { once: true });
    n.addEventListener('error', () => fin(true), { once: true });
  }))).observe(document.documentElement, { childList: true, subtree: true });
  // Los dashboards que no consultan APIs (p. ej. los que cargan archivos) no muestran estado.
})();

/* ══════════════════════════════════════════════════════════════════
   ANIMACIONES — las de SIMs en todos los dashboards
   · Revelado al entrar en pantalla (y se oculta al salir), igual que SIMs:
     fundido + 18px hacia arriba; KPIs en cascada de .08s.
   · Las filas de tabla entran en cascada (estandar.css).
   · Se desactivan las animaciones de entrada propias de cada dashboard.
   ══════════════════════════════════════════════════════════════════ */
(function () {
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const KPIS = '.kpi, .kpi-card, .kpi-card-exact, .oc-kpi, .bill-kpi, .stat-box, .apx-kpi';
  const BLOQUES = '.content-panel, .op-card, .sims-fbar, .card, .chart-panel, .chart-card, .oc-card, .bill-card, .bill-panel, .apx-card, .pc-chart-card, .rrss-card, .inventory-table-card, .oc-reveal, '
    + '.inventory-filters-v2, .oc-filters-v2, .apx-filters, #filters.filter-demo, .filters-box-card, #fx-main, .gps-filter-toolbar, .top-toolbar-left';
  // Animaciones de entrada propias (por nombre de @keyframes): se reemplazan por el revelado de SIMs
  const ENTRADAS = new Set(['inventory-row-in', 'aseEntra', 'entra', 'fundido', 'cmpFadeUp', 'fnFadeUp', 'fnFunnelIn',
    'gps-card-in', 'fadeIn', 'catRise', 'flowRise', 'resRise', 'resFade', 'resDetailIn', 'gps-theme-reveal', 'brillo', 'cmpMedalPop', 'cmpTrophyBounce']);

  document.documentElement.classList.add('std-anim');
  const io = new IntersectionObserver(entradas => entradas.forEach(e => {
    const el = e.target;
    if (e.isIntersecting) {
      const entra = !el.classList.contains('std-in');
      el.classList.add('std-in'); el.classList.remove('std-out');
      if (entra && !document.documentElement.classList.contains('std-cargando')) animarGraficas(el);
    }
    else if (el.classList.contains('std-in')) { el.classList.remove('std-in'); el.classList.add('std-out'); }
  }), { threshold: 0.08 });

  // Chart.js: reinicia y vuelve a animar; Ingresos (canvas propio): drawAll()
  let dibujarTodo = null;
  function animarGraficas(raiz) {
    const C = window.Chart;
    raiz.querySelectorAll('canvas').forEach(cv => {
      const ch = C && C.getChart ? C.getChart(cv) : null;
      if (ch) { try { ch.reset(); ch.update(); } catch (e) { /* gráfica destruida */ } }
      else if (typeof window.drawAll === 'function') {
        clearTimeout(dibujarTodo);
        dibujarTodo = setTimeout(() => { try { window.drawAll(); } catch (e) { /* sin datos aún */ } }, 60);
      }
    });
  }
  document.addEventListener('std-listo', () => document.querySelectorAll('.std-rv.std-in').forEach(animarGraficas));

  function registrar(raiz) {
    const lista = raiz.matches && raiz.matches(KPIS + ',' + BLOQUES) ? [raiz] : [];
    lista.push(...(raiz.querySelectorAll ? raiz.querySelectorAll(KPIS + ',' + BLOQUES) : []));
    lista.forEach(el => {
      if (el.dataset.stdRv || el.closest('.xf-panel, .mso-modal, [role="dialog"]')) return;
      // Un bloque dentro de otro bloque ya animado no se anima dos veces
      if (el.parentElement && el.parentElement.closest('.std-rv') && !el.matches(KPIS)) return;
      el.dataset.stdRv = '1';
      if (el.matches(KPIS)) {
        const hermanos = [...el.parentElement.children].filter(h => h.matches(KPIS));
        el.style.transitionDelay = (Math.max(0, hermanos.indexOf(el)) * 0.08).toFixed(2) + 's';
      }
      el.classList.add('std-rv', 'std-out');
      requestAnimationFrame(() => io.observe(el));
    });
  }

  function quitarEntradas(raiz) {
    const lista = [raiz, ...(raiz.querySelectorAll ? raiz.querySelectorAll('*') : [])];
    lista.forEach(el => {
      if (el.nodeType !== 1 || el.tagName === 'TR') return;
      const nombres = getComputedStyle(el).animationName;
      if (!nombres || nombres === 'none' || !nombres.split(',').some(n => ENTRADAS.has(n.trim()))) return;
      el.style.animation = 'none';
      if (getComputedStyle(el).opacity === '0') el.style.opacity = '1';
    });
  }

  let pendientes = new Set(), timer = null;
  const procesar = () => { timer = null; const raices = [...pendientes]; pendientes = new Set(); raices.forEach(r => { if (r.isConnected) { quitarEntradas(r); registrar(r); } }); };
  new MutationObserver(cambios => {
    cambios.forEach(c => c.addedNodes.forEach(n => { if (n.nodeType === 1) pendientes.add(n); }));
    if (pendientes.size && !timer) timer = setTimeout(procesar, 120);
  }).observe(document.documentElement, { childList: true, subtree: true });
  const inicio = () => { quitarEntradas(document.body); registrar(document.body); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inicio); else inicio();
})();

/* ══════════════════════════════════════════════════════════════════
   GRÁFICAS SEGÚN LA GUÍA DE DISEÑO (sección 05 · Visualización)
   · window.GuiaGraficas: paleta y degradados de la guía para que cada
     dashboard pinte sus series con los mismos colores:
       - barras horizontales (ranking)      → rojo  #c43c50 → #d95f6e
       - barras verticales (por periodo)    → cian  #4f8fd8 → #4f8fd8
       - línea (evolución temporal)         → #d95f6e con área tenue; 2.ª serie cian
       - circular (proporción, máx. 3)      → cian / rojo / amarillo
     Los colores con significado (verde = ok, rojo = alerta…) se mantienen.
   · Animación general de Chart.js (para todos los dashboards):
       barras crecen desde la base en cascada, las líneas se dibujan de
       izquierda a derecha y las circulares giran al aparecer.
       Se repite al entrar en pantalla y al cambiar de filtro.
   · Respeta prefers-reduced-motion.
   ══════════════════════════════════════════════════════════════════ */
(function () {
  const sinMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const P = {
    // Paleta de la guía (§02). No hay cian ni violeta: las series que no
    // tienen color con significado se reparten entre rojo, azul, verde y
    // amarillo, con sus tintes.
    red: '#c43c50', red2: '#d95f6e', cyan: '#4f8fd8', blue: '#4f8fd8', blue2: '#7fb0f0',
    green: '#2f8f76', yellow: '#c59600', muted: '#8b909e', soft: '#8b909e',
    track: 'rgba(255, 255, 255, .07)', grid: 'rgba(255, 255, 255, .08)', area: 'rgba(196, 60, 80, .11)'
  };
  // Orden de series cuando una gráfica compara varias categorías sin color con significado
  const SERIES = [P.red, P.blue, P.green, P.yellow, P.red2, P.blue2, P.muted];

  function rgba(hex, a) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }
  // Degradado scriptable de Chart.js (se calcula al dibujar, con el área ya medida)
  function degradado(desde, hasta, horizontal) {
    return ctx => {
      const ch = ctx.chart, area = ch.chartArea;
      if (!area) return desde;
      const g = horizontal
        ? ch.ctx.createLinearGradient(area.left, 0, area.right, 0)
        : ch.ctx.createLinearGradient(0, area.bottom, 0, area.top);
      g.addColorStop(0, horizontal ? desde : hasta);
      g.addColorStop(1, horizontal ? hasta : desde);
      return g;
    };
  }
  function area(color, alfa) {
    return ctx => {
      const ch = ctx.chart, a = ch.chartArea;
      if (!a) return rgba(color, alfa || .13);
      const g = ch.ctx.createLinearGradient(0, a.top, 0, a.bottom);
      g.addColorStop(0, rgba(color, alfa || .22));
      g.addColorStop(1, rgba(color, 0));
      return g;
    };
  }

  // Ajustes de forma de la guía (no tocan datos ni colores)
  const FORMA = {
    // vertical por periodo (§05 .vertical-bar): 34px, radio 6 solo arriba
    barra: { borderRadius: 6, borderSkipped: 'start', maxBarThickness: 34 },
    // horizontal de ranking (§05 .mini-bar): extremos en píldora, barra fina
    barraH: { borderRadius: 99, borderSkipped: false, barThickness: 7 },
    linea: { tension: .35, borderWidth: 3, pointRadius: 0, pointHoverRadius: 5, pointHitRadius: 12 },
    dona: { cutout: '70%', borderWidth: 2, borderColor: '#1a1d27', hoverOffset: 6, spacing: 1 }
  };

  window.GuiaGraficas = {
    P, SERIES, rgba,
    serie: i => SERIES[i % SERIES.length],
    // Ranking / conteos por categoría → la guía (§05, .mini-bar) pide relleno
    // ROJO SÓLIDO sobre track tenue, no degradado. Se conserva barraH() como
    // alias para no romper el código existente.
    barraH: () => P.red,
    barraV: () => degradado(P.cyan, P.blue, false),   // por periodo
    barraColor: (c, horizontal) => degradado(c, rgba(c, .55), horizontal),
    area,                                             // relleno tenue bajo una línea
    grid: { color: P.grid, drawTicks: false },
    borde: { display: false },
    forma: FORMA,

    /* Ranking horizontal con el aspecto exacto de la guía (§05, .mini-bar):
       barra fina en píldora sobre un carril tenue, valor en mono al final y
       sin rejilla ni eje visible.
         cfg.label      etiqueta de la serie
         cfg.color      color sólido, arreglo por punto o función de Chart.js
         cfg.format     formatea el valor que se pinta al final de la barra
         cfg.value      false para ocultar el valor
         cfg.pista      false para ocultar el carril
         cfg.tooltip    callbacks/estilos extra para el tooltip
         cfg.max        tope del eje (por defecto, el máximo de los datos)
       Devuelve { data, options } listo para new Chart(canvas, cfg). */
    rank(labels, data, cfg) {
      const c = cfg || {};
      // `format` nunca viaja en las options (Chart.js lo resuelve como opción
      // scriptable y se produce una recursión al invocarlo).
      const extraValor = c.value && typeof c.value === 'object' ? Object.assign({}, c.value) : {};
      delete extraValor.format;
      const valor = c.value === false ? false
        : Object.assign({ color: '#e8eaf0', size: 10 }, c.value === true || !c.value ? {} : extraValor);
      return {
        type: 'bar',
        data: {
          labels,
          datasets: [Object.assign({
            label: c.label || '',
            data,
            backgroundColor: c.color || P.red,
            borderWidth: 0,
            // El formateador vive en el dataset: en las options Chart.js lo
            // convierte en opción scriptable y no se puede invocar.
            __guiaValor: typeof c.format === 'function' ? c.format : null
          }, FORMA.barraH, c.dataset || {})]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { right: c.padRight == null ? 52 : c.padRight } },
          plugins: {
            legend: { display: false },
            guiaPista: c.pista === false ? false : true,
            guiaValor: valor,
            tooltip: Object.assign({
              backgroundColor: '#1a1d27', titleColor: '#e8eaf0', bodyColor: '#8b909e',
              borderColor: 'rgba(255, 255, 255, .08)', borderWidth: 1, padding: 10, displayColors: false
            }, c.tooltip || {})
          },
          scales: {
            x: { beginAtZero: true, display: false, max: c.max },
            y: {
              grid: { display: false }, border: { display: false },
              ticks: Object.assign(
                { color: '#8b909e', font: { family: 'Segoe UI', size: 10, weight: '600' } },
                c.labelFormat ? { callback: c.labelFormat } : {}
              )
            }
          }
        }
      };
    }
  };

  /* ── Animación general de Chart.js ── */
  const DUR = 900, PASO = 45;
  const tieneLinea = ch => ch.config.type === 'line' || (ch.config.type !== 'radar' && ch.data.datasets.some(ds => ds.type === 'line'));
  function instalar() {
    const C = window.Chart;
    if (!C || !C.defaults || C.__guiaGraficas) return;
    C.__guiaGraficas = true;

    // ── Track de la guía (§05, .mini-bar) ──
    // Dibuja el carril tenue de fondo detrás de cada barra horizontal, de extremo
    // a extremo del eje, como el <div class="track"> de la guía. Es parte del
    // DISEÑO, no una animación: se registra aunque haya reduced-motion.
    // Se activa por gráfica con options.plugins.guiaPista = true (lo hace
    // GuiaGraficas.rank). En barras apiladas/agrupadas o de mucho grosor se deja
    // apagado, donde el carril no tendría sentido.
    C.register({
      id: 'guiaPista',
      beforeDatasetsDraw(ch) {
        const opt = (ch.options.plugins || {}).guiaPista;
        if (!opt) return;
        if (ch.config.options.indexAxis !== 'y' || !ch.chartArea) return;
        const meta = ch.getDatasetMeta(0);
        if (!meta || meta.hidden || !meta.data.length) return;
        const a = ch.chartArea, ctx = ch.ctx;
        const alto = meta.data[0].base !== undefined && meta.data[0].height ? meta.data[0].height : 7;
        ctx.save();
        ctx.fillStyle = (opt && opt.color) || P.track;
        meta.data.forEach(b => {
          if (!b) return;
          const y = b.y - alto / 2, r = alto / 2;
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(a.left, y, a.right - a.left, alto, r);
          else ctx.rect(a.left, y, a.right - a.left, alto);
          ctx.fill();
        });
        ctx.restore();
      }
    });

    // ── Valor al final de cada barra (§05, .mini-bar b) ──
    // La guía pinta el número en monoespaciada alineado a la derecha, fuera de
    // la barra, en lugar de depender del eje. Se activa por gráfica con
    // options.plugins.guiaValor = true (o { color, size }). El formateador NO
    // puede viajar en las options (Chart.js convierte las funciones en opciones
    // scriptables y se resuelven en recursión): va en dataset.__guiaValor.
    C.register({
      id: 'guiaValor',
      afterDatasetsDraw(ch) {
        const opt = (ch.options.plugins || {}).guiaValor;
        if (!opt || ch.config.options.indexAxis !== 'y' || !ch.chartArea) return;
        const cfg = opt === true ? {} : opt;
        const meta = ch.getDatasetMeta(0);
        if (!meta || meta.hidden || !meta.data.length) return;
        const ds = ch.data.datasets[0];
        const formato = ds.__guiaValor;
        const ctx = ch.ctx;
        ctx.save();
        ctx.font = (cfg.size || 10) + "px 'Cascadia Code', 'Fira Mono', Consolas, monospace";
        ctx.fillStyle = cfg.color || '#e8eaf0';
        ctx.textBaseline = 'middle';
        // Igual que .mini-bar de la guía: la columna de valores va a la derecha
        // del carril, alineada a la derecha, no pegada al final de cada barra.
        ctx.textAlign = 'right';
        const xValor = ch.width - 4;
        meta.data.forEach((b, i) => {
          if (!b || ds.data[i] == null) return;
          const txt = typeof formato === 'function' ? formato(ds.data[i], i) : String(ds.data[i]);
          ctx.fillText(txt, xValor, b.y);
        });
        ctx.restore();
      }
    });

    // De aquí en adelante solo animación: con reduced-motion no se aplica nada.
    if (sinMovimiento) { C.defaults.animation = false; return; }
    const d = C.defaults;
    try {
      d.animation = Object.assign(d.animation || {}, { duration: DUR, easing: 'easeOutQuart' });
      // Cascada: cada barra/punto sale un poco después que el anterior (solo en la carga o reinicio)
      d.animation.delay = ctx => (ctx.type === 'data' && ctx.mode === 'default' && !ctx.chart.__guiaHecho)
        ? Math.min(ctx.dataIndex * PASO + ctx.datasetIndex * 90, 700) : 0;
      d.datasets.doughnut = d.datasets.doughnut || {};
      d.datasets.pie = d.datasets.pie || {};
      [d.datasets.doughnut, d.datasets.pie].forEach(o => { o.animation = Object.assign({}, o.animation, { animateRotate: true, animateScale: true }); });
    } catch (e) { /* versión de Chart.js sin alguno de estos valores */ }

    // Las líneas y áreas se "dibujan" de izquierda a derecha (stroke-dashoffset de la guía)
    C.register({
      id: 'guiaDibujo',
      _inicio(ch) { ch.__guiaT0 = performance.now(); ch.__guiaHecho = false; },
      afterInit(ch) { this._inicio(ch); },
      reset(ch) { this._inicio(ch); },
      afterRender(ch) {
        if (ch.__guiaHecho) return;
        if (!tieneLinea(ch)) { ch.__guiaHecho = performance.now() - ch.__guiaT0 >= DUR + 700; return; }
        const anim = ch.options.animation;
        if (anim === false || (anim && anim.duration === 0)) { ch.__guiaHecho = true; return; }
        if (performance.now() - ch.__guiaT0 >= DUR + 700) { ch.__guiaHecho = true; return; }
        if (!ch.__guiaRaf) ch.__guiaRaf = requestAnimationFrame(() => { ch.__guiaRaf = 0; if (ch.ctx) ch.draw(); });
      },
      beforeDatasetsDraw(ch) {
        if (!tieneLinea(ch) || ch.__guiaHecho || !ch.chartArea) return;
        const anim = ch.options.animation;
        if (anim === false || (anim && anim.duration === 0)) return;
        const t = Math.min(1, (performance.now() - ch.__guiaT0) / (DUR + 300));
        const k = 1 - Math.pow(1 - t, 3);
        const a = ch.chartArea;
        ch.ctx.save();
        ch.ctx.beginPath();
        ch.ctx.rect(a.left - 8, a.top - 12, (a.right - a.left + 16) * k, a.bottom - a.top + 24);
        ch.ctx.clip();
        ch.__guiaClip = true;
      },
      afterDatasetsDraw(ch) { if (ch.__guiaClip) { ch.ctx.restore(); ch.__guiaClip = false; } }
    });
  }
  window.GuiaGraficas.instalar = instalar;
  instalar();
  window.addEventListener('DOMContentLoaded', instalar);
  document.addEventListener('load', e => { if (e.target && e.target.tagName === 'SCRIPT') instalar(); }, true);
})();
