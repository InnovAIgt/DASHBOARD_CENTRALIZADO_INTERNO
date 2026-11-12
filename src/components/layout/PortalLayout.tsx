import React, { useState, useEffect } from 'react';
import { KeyRound, Sun, Moon, ShieldCheck, Database, RefreshCw, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useReport } from '../../context/ReportContext';
import { SecretsModal } from '../modals/SecretsModal';
import { OverviewView } from '../views/OverviewView';
import { BankDetailView } from '../views/BankDetailView';
import { DailyFlowView } from '../views/DailyFlowView';
import { ConsolidadoGeneralView } from '../views/ConsolidadoGeneralView';
import { AccountDetailView } from '../views/AccountDetailView';
import { GeneratorView } from '../views/GeneratorView';
import { HistoryView } from '../views/HistoryView';
import { UsersView } from '../views/UsersView';
import { RegionStatusBar } from './RegionStatusBar';
import { FlujoVentasV2 } from '../../modulos/marketing/flujo-ventas-v2/FlujoVentasV2.jsx';

interface NavSectionDef {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: {
    id: string;
    label: string;
    hasData: boolean;
    archivo?: string;
    isCustomReact?: boolean;
    reactView?: string;
  }[];
}

export const PortalLayout: React.FC = () => {
  const { currentUser, logout, isMaster } = useAuth();
  const { isFirebaseConnected } = useReport();

  // Active page defaults to 'mailing-semanal' (Campañas de correo) as shown in reference screenshot
  const [activePage, setActivePage] = useState<string>('mailing-semanal');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set([
      'ingresos',
      'facturacion',
      'marketing',
      'ventas',
      'activaciones',
      'bodega',
      'sac',
      'sims',
      'rrhh',
      'gps',
      'admin'
    ])
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSecretsModalOpen, setIsSecretsModalOpen] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);
  const [bankSubView, setBankSubView] = useState<string>('overview');
  // Flujo de ventas v2: el menú lateral se esconde y se asoma al acercar el mouse al borde izquierdo.
  // Solo aplica en esa página; los demás dashboards no cambian (estilos en flujo-ventas-v2.css).
  const [menuAsomado, setMenuAsomado] = useState(false);

  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.add('theme-light');
    } else {
      document.documentElement.classList.remove('theme-light');
    }
  }, [isLightMode]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const handleSelectItem = (item: { id: string; archivo?: string; isCustomReact?: boolean; reactView?: string }, sectionId: string) => {
    setActivePage(item.id);
    setMenuAsomado(false);
    if (item.reactView) setBankSubView(item.reactView);
    if (!expandedSections.has(sectionId)) {
      setExpandedSections(prev => new Set(prev).add(sectionId));
    }
    setIsMobileSidebarOpen(false);
  };

  const SECTIONS: NavSectionDef[] = [
    {
      id: 'ingresos',
      label: 'INGRESOS',
      icon: (
        <svg className="w-4 h-4 text-slate-400 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
      items: [
        {
          id: 'ingresos-acumulados',
          label: 'Ingresos acumulados',
          hasData: true,
          archivo: '/dashboards/ingresos/ingresos.html'
        }
      ]
    },
    {
      id: 'facturacion',
      label: 'FACTURACIÓN',
      icon: (
        <svg className="w-4 h-4 text-slate-400 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
      items: [
        {
          id: 'facturacion-linea',
          label: 'Facturación por línea',
          hasData: true,
          archivo: '/dashboards/facturacion_linea/facturacion-linea.html'
        }
      ]
    },
    {
      id: 'marketing',
      label: 'MARKETING',
      icon: (
        <svg className="w-4 h-4 text-slate-400 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 11l18-5v12L3 14v-3z" />
          <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
        </svg>
      ),
      items: [
        {
          id: 'mailing-semanal',
          label: 'Campañas de correo',
          hasData: true,
          archivo: '/dashboards/marketing/mailing-campanas.html'
        },
        {
          id: 'flujo-ventas',
          label: 'Flujo de ventas',
          hasData: true,
          archivo: '/dashboards/marketing/flujo-ventas.html'
        },
        {
          // Flujo de ventas v2 en prueba (docs/marketing/README.md). Se muestra con FlujoVentasV2, no con un archivo HTML.
          id: 'flujo-ventas-v2',
          label: 'Flujo de ventas v2 (prueba)',
          hasData: true
        }
      ]
    },
    {
      id: 'ventas',
      label: 'VENTAS',
      icon: (
        <svg className="w-4 h-4 text-slate-400 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      ),
      items: [
        {
          id: 'flash-altas',
          label: 'Flash de altas',
          hasData: true,
          archivo: '/dashboards/ventas/flash-altas.html'
        },
        {
          id: 'cumplimiento-clientes',
          label: 'Store clientes',
          hasData: true,
          archivo: '/dashboards/clientes/cumplimiento-clientes.html'
        }
      ]
    },
    {
      id: 'activaciones',
      label: 'ACTIVACIONES',
      icon: (
        <svg className="w-4 h-4 text-slate-400 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      ),
      items: [
        {
          id: 'flujo-activacion',
          label: 'Flujo de activación',
          hasData: true,
          archivo: '/dashboards/activaciones/activaciones.html'
        }
      ]
    },
    {
      id: 'bodega',
      label: 'BODEGA',
      icon: (
        <svg className="w-4 h-4 text-slate-400 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        </svg>
      ),
      items: [
        {
          id: 'inventario-minimo',
          label: 'Inventario mínimo',
          hasData: true,
          archivo: '/dashboards/bodega/inventarioBodega.html'
        },
        {
          id: 'ordenes-compra',
          label: 'Órdenes de compra',
          hasData: true,
          archivo: '/dashboards/bodega/ordenesDeCompra.html'
        },
        {
          id: 'control-despachos',
          label: 'Control de despachos',
          hasData: true,
          archivo: '/dashboards/bodega/control-despachos.html'
        }
      ]
    },
    {
      id: 'sac',
      label: 'SAC',
      icon: (
        <svg className="w-4 h-4 text-slate-400 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 18.72a9.094 9.094 0 0 0 3.741-1.027 3.5 3.5 0 0 0-6.373-2.036M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
      items: [
        {
          id: 'SAC',
          label: 'Dashboard SAC',
          hasData: true,
          archivo: '/dashboards/servicioAlCliente/servicioAlCliente.html'
        }
      ]
    },
    {
      id: 'sims',
      label: 'SIMS',
      icon: (
        <svg className="w-4 h-4 text-slate-400 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="9" y1="9" x2="15" y2="9" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
      ),
      items: [
        {
          id: 'sims-plan',
          label: 'SIMs por plan',
          hasData: true,
          archivo: '/dashboards/sims/sims-plan.html'
        }
      ]
    },
    {
      id: 'rrhh',
      label: 'RECURSOS HUMANOS',
      icon: (
        <svg className="w-4 h-4 text-slate-400 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      items: [
        {
          id: 'rrhh-dashboard',
          label: 'Recursos Humanos',
          hasData: true,
          archivo: '/dashboards/Recursos Humanos/rrhh_original.html'
        }
      ]
    },
    {
      id: 'gps',
      label: 'GPS',
      icon: (
        <svg className="w-4 h-4 text-slate-400 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
      ),
      items: [
        {
          id: 'cumplimiento-jornada',
          label: 'Cumplimiento de jornada',
          hasData: true,
          archivo: '/dashboards/GPS/index.html'
        }
      ]
    }
  ];

  // Find active item definition
  const allItems = SECTIONS.flatMap(s => s.items);
  const currentItem = allItems.find(i => i.id === activePage) || allItems[0];

  const renderActiveContent = () => {
    // If it's one of the banking React modules
    if (currentItem.isCustomReact) {
      return (
        <div className="flex-1 flex flex-col bg-slate-50 min-h-0 overflow-y-auto">
          <RegionStatusBar />
          <div className="p-6 md:p-8">
            {bankSubView === 'overview' && <OverviewView onNavigateToView={(v) => setBankSubView(v)} />}
            {bankSubView === 'bank-detail' && <BankDetailView />}
            {bankSubView === 'daily-flow' && <DailyFlowView />}
            {bankSubView === 'consolidacion-general' && <ConsolidadoGeneralView />}
            {bankSubView === 'account-detail' && <AccountDetailView />}
            {bankSubView === 'generator' && <GeneratorView onNavigateToView={(v) => setBankSubView(v)} />}
            {bankSubView === 'history' && <HistoryView onNavigateToView={(v) => setBankSubView(v)} />}
            {bankSubView === 'users' && <UsersView />}
          </div>
        </div>
      );
    }

    // Marketing · Flujo de ventas v2 (prueba): componente React del módulo src/modulos/marketing/flujo-ventas-v2
    if (currentItem.id === 'flujo-ventas-v2') {
      return <FlujoVentasV2 />;
    }

    // If it has an external dashboard file (like mailing-campanas.html)
    if (currentItem.archivo) {
      return (
        <iframe
          key={currentItem.id}
          className="dashboard-iframe"
          src={currentItem.archivo}
          title={currentItem.label}
          loading="eager"
        />
      );
    }

    // Fallback inline view for leads
    return (
      <div className="p-12 text-center text-slate-400 space-y-3">
        <h3 className="text-xl font-bold text-slate-200">{currentItem.label}</h3>
        <p className="text-sm">Módulo cargado en el portal centralizado.</p>
      </div>
    );
  };

  const menuOculto = activePage === 'flujo-ventas-v2';

  return (
    <div className={`portal-app ${menuOculto ? 'fv2-menu-oculto' : ''} ${menuOculto && menuAsomado ? 'is-menu-asomado' : ''}`}>
      {/* Flujo de ventas v2: franja invisible en el borde izquierdo que hace asomar el menú */}
      {menuOculto && (
        <div
          className="fv2-zona-menu"
          onMouseEnter={() => setMenuAsomado(true)}
          aria-hidden="true"
        />
      )}

      {/* Mobile backdrop */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-90 md:hidden"
        />
      )}

      {/* ============ SIDEBAR ============ */}
      <aside
        className={`portal-sidebar ${isMobileSidebarOpen ? 'open' : ''} ${isSidebarCollapsed ? 'collapsed' : ''}`}
        onMouseLeave={menuOculto ? () => setMenuAsomado(false) : undefined}
      >
        {/* Header with Logo */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img src="/assets/img/logo-intelfon.png" alt="RED INTELFON" />
          </div>
          <div className="sidebar-brand">
            <div className="sidebar-brand-name">
              INTEL<span>FON</span>
            </div>
            <div className="sidebar-brand-sub">Conectamos tu mundo</div>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="portal-nav-container">
          {SECTIONS.map((sec) => {
            const isExpanded = expandedSections.has(sec.id);
            const hasActiveChild = sec.items.some(i => i.id === activePage);

            return (
              <div key={sec.id} className={`nav-section ${isExpanded ? 'expanded' : ''}`}>
                <div
                  className={`nav-section-header ${hasActiveChild ? 'active' : ''}`}
                  onClick={() => toggleSection(sec.id)}
                >
                  {sec.icon}
                  <span className="label">{sec.label}</span>
                  <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>

                <div className="nav-items">
                  {sec.items.map((item) => {
                    const isActive = activePage === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`nav-item ${isActive ? 'active' : ''} ${item.hasData ? 'has-data' : 'no-data'}`}
                        onClick={() => handleSelectItem(item, sec.id)}
                      >
                        <span className="dot" />
                        <span className="truncate">{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Master Admin Section */}
          {isMaster && (
            <div className={`nav-section ${expandedSections.has('admin') ? 'expanded' : ''}`}>
              <div
                className="nav-section-header"
                onClick={() => toggleSection('admin')}
              >
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="label">Administración</span>
                <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>

              <div className="nav-items">
                <div
                  className={`nav-item ${activePage === 'admin-users' ? 'active' : ''} has-data`}
                  onClick={() => {
                    setActivePage('admin-users');
                    setBankSubView('users');
                  }}
                >
                  <span className="dot" />
                  <span>Gestión de Usuarios</span>
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* Sidebar Footer */}
        <div className="portal-sidebar-footer">
          {/* User profile card */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-red-600/80 text-white font-bold text-xs flex items-center justify-center border border-red-400/40">
                F
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-100 leading-tight">F</div>
                <div className="text-[10px] text-slate-400">Administrador</div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Theme Toggle (Dark / Light) */}
              <button
                type="button"
                onClick={() => setIsLightMode(prev => !prev)}
                className="p-1.5 rounded-md hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                title={isLightMode ? 'Cambiar a Modo Oscuro' : 'Cambiar a Modo Claro'}
              >
                {isLightMode ? (
                  <Moon className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                )}
              </button>

              {/* Secrets Vercel & APIs button */}
              <button
                type="button"
                onClick={() => setIsSecretsModalOpen(true)}
                className="p-1.5 rounded-md hover:bg-red-500/20 text-slate-300 hover:text-red-400 transition-colors"
                title="Variables de entorno para Vercel y Webhooks"
              >
                <KeyRound className="w-3.5 h-3.5 text-red-500" />
              </button>
            </div>
          </div>

          <div className="footer-tagline">
            <strong>Conexión en movimiento.</strong>
            RED Intelfon · v1.0.0
          </div>
          <button
            type="button"
            onClick={logout}
            className="logout-button"
            title="Cerrar sesión actual"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Floating mobile toggle button */}
      <button
        type="button"
        className="fixed top-3 left-3 z-80 md:hidden bg-slate-900/90 text-white p-2.5 rounded-lg border border-white/15 shadow-xl backdrop-blur-md"
        onClick={() => setIsMobileSidebarOpen(true)}
        aria-label="Abrir menú"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* ============ MAIN CONTENT (Full Viewport, No Topbar Row) ============ */}
      <div className="portal-main">
        {/* Dynamic Portal Canvas */}
        <main className="portal-content">
          {renderActiveContent()}
        </main>
      </div>

      {/* Secrets & Vercel Configuration Modal */}
      <SecretsModal
        isOpen={isSecretsModalOpen}
        onClose={() => setIsSecretsModalOpen(false)}
      />
    </div>
  );
};
