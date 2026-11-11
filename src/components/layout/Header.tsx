import React from 'react';
import { Menu, KeyRound, Globe, ShieldCheck, RefreshCw } from 'lucide-react';
import { useReport } from '../../context/ReportContext';
import { useAuth } from '../../context/AuthContext';
import { ViewType } from '../../types';

interface HeaderProps {
  currentView: ViewType;
  onOpenMobileMenu: () => void;
  onOpenSecretsModal: () => void;
}

const VIEW_TITLES: Record<ViewType, { title: string; subtitle: string }> = {
  overview: {
    title: 'Inicio / Overview',
    subtitle: 'Gestión automatizada de reportes bancarios y análisis con Make.com'
  },
  'bank-detail': {
    title: 'Detalle por Banco',
    subtitle: 'Auditoría individual de saldos y conciliación contable por entidad financiera'
  },
  'daily-flow': {
    title: 'Flujo Diario de Transacciones',
    subtitle: 'Evolución cronológica de ingresos, egresos y balance neto por fecha'
  },
  'consolidacion-general': {
    title: 'Consolidación General Regional',
    subtitle: 'Consolidado automático multi-país de Guatemala y El Salvador expresado en USD'
  },
  'account-detail': {
    title: 'Detalle de Cuentas Bancarias',
    subtitle: 'Libro mayor de cuentas monetarias, de ahorro y recaudación'
  },
  generator: {
    title: 'Generar Reporte Excel',
    subtitle: 'Carga de archivos .xlsx y procesamiento automatizado a través del Webhook de Make'
  },
  history: {
    title: 'Reportes Anteriores',
    subtitle: 'Historial de ejecuciones sincronizadas en Google Sheets y Firebase'
  },
  users: {
    title: 'Gestión de Usuarios',
    subtitle: 'Control centralizado de cuentas autorizadas y analistas de RED INTELFON'
  }
};

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onOpenMobileMenu,
  onOpenSecretsModal
}) => {
  const { isFirebaseConnected, isSyncing, checkFirebaseSync } = useReport();
  const { currentUser } = useAuth();
  const info = VIEW_TITLES[currentView] || VIEW_TITLES.overview;

  return (
    <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 shadow-xs sticky top-0 z-30">
      <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          title="Abrir menú"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight truncate">
            {info.title}
          </h1>
          <p className="text-xs text-slate-500 hidden sm:block truncate">
            {info.subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Vercel Secrets & API Key configuration trigger */}
        <button
          type="button"
          onClick={onOpenSecretsModal}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-red-300 text-xs font-semibold text-slate-700 hover:text-red-600 bg-slate-50 hover:bg-red-50/50 transition-all shadow-xs"
          title="Ver y configurar Secrets para Vercel y APIs de Make/Firebase"
        >
          <KeyRound className="w-3.5 h-3.5 text-red-600" />
          <span className="hidden md:inline">Secrets & APIs Vercel</span>
          <span className="md:hidden">Secrets</span>
        </button>

        {/* Sync Trigger button */}
        <button
          type="button"
          onClick={() => checkFirebaseSync()}
          disabled={isSyncing}
          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all"
          title="Refrescar estado de sincronización"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-red-600' : ''}`} />
        </button>

        {/* System Online Badge */}
        <span
          className={`inline-flex items-center px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold border ${
            isFirebaseConnected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}
        >
          <span
            className={`w-2 h-2 mr-1.5 sm:mr-2 rounded-full ${
              isFirebaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
          <span className="hidden sm:inline">
            {isFirebaseConnected ? 'Sistema en Línea' : 'Modo Local'}
          </span>
          <span className="sm:hidden">{isFirebaseConnected ? 'En línea' : 'Local'}</span>
        </span>
      </div>
    </header>
  );
};
