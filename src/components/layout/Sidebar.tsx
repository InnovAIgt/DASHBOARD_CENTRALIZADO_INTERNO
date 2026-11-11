import React from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  History,
  Building2,
  TrendingUp,
  Layers,
  CreditCard,
  Users,
  LogOut,
  KeyRound,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ViewType } from '../../types';

interface SidebarProps {
  currentView: ViewType;
  onSelectView: (view: ViewType) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenSecretsModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  isOpenMobile,
  onCloseMobile,
  onOpenSecretsModal
}) => {
  const { currentUser, isMaster, logout } = useAuth();

  const handleNavClick = (view: ViewType) => {
    onSelectView(view);
    onCloseMobile();
  };

  const navItems = [
    {
      group: 'PRINCIPAL',
      items: [
        {
          id: 'overview' as ViewType,
          label: 'Inicio / Overview',
          icon: LayoutDashboard,
          description: 'Métricas consolidadas'
        },
        {
          id: 'generator' as ViewType,
          label: 'Generar Reporte Excel',
          icon: FileSpreadsheet,
          description: 'Cargar y procesar .xlsx'
        },
        {
          id: 'history' as ViewType,
          label: 'Reportes Anteriores',
          icon: History,
          description: 'Historial en Google Sheets'
        }
      ]
    },
    {
      group: 'ANÁLISIS BANCARIO',
      items: [
        {
          id: 'bank-detail' as ViewType,
          label: 'Detalle por Banco',
          icon: Building2,
          description: 'Balances por entidad'
        },
        {
          id: 'daily-flow' as ViewType,
          label: 'Flujo Diario',
          icon: TrendingUp,
          description: 'Evolución de movimientos'
        },
        {
          id: 'consolidacion-general' as ViewType,
          label: 'Consolidado General',
          icon: Layers,
          description: 'Consolidación multi-país en USD'
        },
        {
          id: 'account-detail' as ViewType,
          label: 'Detalle de Cuentas',
          icon: CreditCard,
          description: 'Listado mayor de cuentas'
        }
      ]
    }
  ];

  const adminItems = [
    ...(isMaster
      ? [
          {
            id: 'users' as ViewType,
            label: 'Gestión de Usuarios',
            icon: Users,
            description: 'Control de accesos y roles'
          }
        ]
      : [])
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top: Logo & Close Button */}
        <div>
          <div className="h-20 px-6 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-sm shadow-red-500/20 text-white font-extrabold text-sm tracking-wider">
                RI
              </div>
              <div>
                <span className="text-[11px] font-extrabold tracking-widest text-red-600 uppercase block">
                  RED INTELFON
                </span>
                <span className="text-sm font-extrabold text-slate-900 tracking-tight block">
                  Banking Portal
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-6 overflow-y-auto max-h-[calc(100vh-180px)]">
            {navItems.map((group) => (
              <div key={group.group} className="space-y-1">
                <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  {group.group}
                </span>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                        isActive
                          ? 'bg-red-50 text-red-700 shadow-xs border border-red-200/80 font-extrabold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 mr-3 flex-shrink-0 transition-colors ${
                          isActive ? 'text-red-600' : 'text-slate-400'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}

            {/* Admin section if applicable */}
            {adminItems.length > 0 && (
              <div className="space-y-1">
                <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  ADMINISTRACIÓN
                </span>
                {adminItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                        isActive
                          ? 'bg-red-50 text-red-700 shadow-xs border border-red-200/80'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 mr-3 flex-shrink-0 ${
                          isActive ? 'text-red-600' : 'text-slate-400'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Quick link to Vercel Secrets */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  onOpenSecretsModal();
                  onCloseMobile();
                }}
                className="w-full flex items-center px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50/60 border border-dashed border-slate-200 transition-all text-left"
              >
                <KeyRound className="w-4 h-4 mr-3 text-red-500 flex-shrink-0" />
                <span className="truncate">Vercel Secrets & APIs</span>
              </button>
            </div>
          </nav>
        </div>

        {/* Bottom User Profile Card & Logout */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/80 space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-xs">
              {currentUser?.name?.slice(0, 2).toUpperCase() || 'RI'}
            </div>
            <div className="overflow-hidden min-w-0">
              <p className="font-bold text-slate-800 text-xs truncate">
                {currentUser?.name || 'Usuario'}
              </p>
              <div className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider truncate">
                  {currentUser?.role === 'master'
                    ? 'Master Admin'
                    : currentUser?.region === 'GT'
                    ? 'Guatemala'
                    : currentUser?.region === 'SV'
                    ? 'El Salvador'
                    : 'Analista'}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center justify-center px-3 py-2 rounded-xl bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 hover:border-red-200 transition-all text-xs font-bold group shadow-2xs"
            title="Cerrar sesión actual"
          >
            <LogOut className="w-3.5 h-3.5 mr-2 text-slate-400 group-hover:text-red-500 transition-colors" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
};
