// =====================================================================
// REGISTRO CENTRAL DE DASHBOARDS
// =====================================================================
// Cómo agregar un dashboard nuevo:
//   1. Crea tu archivo HTML en dashboards/<area>/mi-dashboard.html
//   2. Agrega una entrada aquí con el id que coincide con data-page en el nav
//   3. Listo — el sidebar lo cargará automáticamente en un iframe
//
// Campos:
//   id      → debe coincidir con el atributo data-page del nav-item en dashboard_centralizado.html
//   area    → nombre del área (aparece en el topbar cuando se abre la página)
//   titulo  → nombre visible en el topbar
//   archivo → ruta relativa al archivo HTML del dashboard (null = aún sin archivo)
//   estado  → 'activo' | 'pendiente' | 'en-construccion'
// =====================================================================

const DASHBOARDS = [
  // ── Ingresos ──────────────────────────────────────────
  { id: 'ingresos-acumulados',      archivo: 'dashboards/ingresos/ingresos.html',                                             estado: 'activo' },

  // ── MONITOREO ───────────────────────────────────────────────────
  // Vistas traídas de Trafic_web_unified. Los datos llegan vía el proxy
  // de server.js (/api/alt/overview y /api/alt/emails).
  { id: 'control-sesiones',  area: 'Monitoreo', titulo: 'Control de sesiones', archivo: 'dashboards/monitoreo/control_sesiones.html', estado: 'activo' },
  { id: 'control-mails',     area: 'Monitoreo', titulo: 'Control de mails',    archivo: 'dashboards/monitoreo/control_mails.html?v=20261028-meta', estado: 'activo' },

  // ── TELECOMUNICACIONES ──────────────────────────────────────────                                             estado: 'pendiente' },
  { id: 'facturacion-linea',      archivo: 'dashboards/facturacion_linea/facturacion-linea.html', estado: 'activo' },
  { id: 'red-ptt',                   archivo: null,                                              estado: 'pendiente' },
  { id: 'infraestructura',          archivo: null,                                              estado: 'pendiente' },
  { id: 'datared',                        archivo: null,                                              estado: 'pendiente' },

  // ── MARKETING ───────────────────────────────────────────────────
  { id: 'publicaciones-redes',archivo: null, estado: 'pendiente' },
  { id: 'mailing-semanal',          archivo: 'dashboards/marketing/mailing-campanas.html',      estado: 'activo'    },
  { id: 'flujo-ventas',  archivo: 'dashboards/marketing/flujo-ventas.html', estado: 'activo' },

  // leads-semanales / leads-calificados / leads-calificados-semanales
  // están construidos inline en el dashboard central (PAGES renderer).
  // Cuando estén listos como HTML independiente, agrega el campo archivo aquí.

  // ── VENTAS ──────────────────────────────────────────────────────
  // Flash de altas: los datos los publica el repo InnovAIgt/Dashboard---flash-altas (robot cada hora desde la API de SAN).
  { id: 'flash-altas',             area: 'Ventas',             titulo: 'Flash de altas',        archivo: 'dashboards/ventas/flash-altas.html', estado: 'activo' },
  // Store clientes: datos en vivo de la plataforma Store de Contactos Clientes (Supabase, función tablero_cumplimiento_safe).
  { id: 'cumplimiento-clientes',   area: 'Ventas',             titulo: 'Store clientes',        archivo: 'dashboards/clientes/cumplimiento-clientes.html', estado: 'activo' },

  // ── ACTIVACIONES ────────────────────────────────────────────────
  { id: 'contratos-radicados',      archivo: null,                                              estado: 'pendiente' },
  { id: 'flujo-activacion',           archivo: 'dashboards/activaciones/activaciones.html', estado: 'activo' },

  // ── BODEGA ──────────────────────────────────────────────────────
  { id: 'inventario-minimo',     area: 'Bodega',             titulo: 'Inventario mínimo',      archivo: 'dashboards/bodega/inventarioBodega.html',        estado: 'activo'    },
  { id: 'unidades-sims',         area: 'Bodega',             titulo: 'Unidades y SIMs',        archivo: null,                                              estado: 'pendiente' },
  { id: 'ordenes-compra',        area: 'Bodega',             titulo: 'Órdenes de compra',      archivo: 'dashboards/bodega/ordenesDeCompra.html',          estado: 'activo'    },
  { id: 'control-despachos',     area: 'Bodega',             titulo: 'Control de despachos',   archivo: 'dashboards/bodega/control-despachos.html', estado: 'activo' },

  // ── SAC ─────────────────────────────────────────────────────────
  { id: 'SAC',  archivo: 'dashboards/servicioAlCliente/servicioAlCliente.html', estado: 'activo'},
  { id: 'casos-categoria', archivo: null, estado: 'pendiente' },
  { id: 'flujo-reclamos', archivo: null, estado: 'pendiente' },

  // ── SIMs ────────────────────────────────────────────────────────
  { id: 'sims-operador', archivo: null, estado: 'pendiente' },
  { id: 'sims-plan', archivo: 'dashboards/sims/sims-plan.html', estado: 'activo' },
  { id: 'consumo-100m',archivo: null, estado: 'pendiente' },
  { id: 'licencias-fabricante', archivo: null, estado: 'pendiente' },
  { id: 'conciliacion-diaria', archivo: null, estado: 'pendiente' },

  // ── GPS / MARCACIÓN ─────────────────────────────────────────────
  { id: 'cumplimiento-jornada',archivo: 'dashboards/GPS/index.html', estado: 'activo' },
  { id: 'periodos-sin-marcacion', archivo: null, estado: 'pendiente' },
  { id: 'por-colaborador', archivo: null, estado: 'pendiente' },
  { id: 'por-area', archivo: null, estado: 'pendiente' },
  { id: 'por-jefatura', archivo: null, estado: 'pendiente' },
  { id: 'gestion-vehiculos', archivo: null, estado: 'pendiente' },
 
  // ── RECURSOS HUMANOS ───────────────────────────────────────────────
{
  id: 'rrhh',
 
  archivo: 'dashboards/Recursos Humanos/rrhh_original.html',
  estado: 'activo'
}

];

// ── Mapa de acceso rápido por id ────────────────────────────────────
const DASHBOARD_MAP = {};
DASHBOARDS.forEach(d => { DASHBOARD_MAP[d.id] = d; });

// ── Ocultar nav items sin archivo registrado ─────────────────────────
// Se ejecuta en dashboard_centralizado.html sin necesidad de editarlo.
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    const entry = DASHBOARD_MAP[el.dataset.page];
    if (!entry || !entry.archivo) el.style.display = 'none';
  });
 

});

