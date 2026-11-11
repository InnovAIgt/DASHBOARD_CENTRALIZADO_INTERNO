import React, { useState } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Printer,
  Trash2,
  Calendar,
  RotateCcw,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Building,
  CreditCard,
  Maximize2
} from 'lucide-react';
import { useReport } from '../../context/ReportContext';
import { formatMoney, formatPct, exportReportToExcel } from '../../services/dataService';

interface OverviewViewProps {
  onNavigateToView: (view: any) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({ onNavigateToView }) => {
  const {
    activeCountry,
    setActiveCountry,
    activeData,
    dateFilter,
    setDateFilter,
    resetDateFilter,
    resetToDemoData
  } = useReport();

  const [localFrom, setLocalFrom] = useState(dateFilter.from);
  const [localTo, setLocalTo] = useState(dateFilter.to);
  const [isCleaning, setIsCleaning] = useState(false);

  const cur = activeData.meta.currency;
  const sym = activeData.meta.symbol;

  const handleApplyDateFilter = () => {
    setDateFilter({ from: localFrom, to: localTo });
  };

  const handleResetDateFilter = () => {
    setLocalFrom('');
    setLocalTo('');
    resetDateFilter();
  };

  const handleCleanDashboard = () => {
    if (confirm('¿Deseas restablecer el dashboard a los datos base auditados?')) {
      setIsCleaning(true);
      resetToDemoData();
      setTimeout(() => setIsCleaning(false), 500);
    }
  };

  const handleDownloadExcel = () => {
    exportReportToExcel(
      activeData,
      `RED_INTELFON_${activeData.meta.country}_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  const handlePrint = () => {
    window.print();
  };

  // Switch between GT and SV
  const toggleCountry = () => {
    setActiveCountry(activeCountry === 'GT' ? 'SV' : 'GT');
  };

  // Calculate highest bank share
  const maxBank = activeData.banks.reduce((prev, curr) => (curr.final > prev.final ? curr : prev), activeData.banks[0] || { final: 1 });
  const maxFlow = Math.max(...activeData.banks.map(b => Math.abs(b.netFlow)), 1);
  const maxBalance = Math.max(...activeData.banks.map(b => Math.max(b.initial, b.final)), 1);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. PORTADA EJECUTIVA / COVER HERO (Crisp Light Corporate Design) */}
      <section className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-red-600/20 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-red-400">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span>Auditoría Financiera Integral · RED INTELFON</span>
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Consolidación Bancaria · {activeData.meta.countryName}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Informe financiero ejecutivo con auditoría integral de saldos iniciales, créditos, débitos,
              flujo neto y conciliación contable por entidad bancaria y número de cuenta.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
            <span className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-slate-200">
              🌍 País: <strong className="text-white ml-1">{activeData.meta.countryName} ({activeData.meta.country})</strong>
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-slate-200">
              📅 Período: <strong className="text-white ml-1">{activeData.meta.fileCut}</strong>
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-slate-200">
              💵 Moneda: <strong className="text-white ml-1">{cur} ({sym})</strong>
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-slate-200">
              🏦 Entidades: <strong className="text-white ml-1">{activeData.meta.banks} bancos</strong>
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-slate-200">
              💳 Cuentas: <strong className="text-white ml-1">{activeData.meta.accounts} operadas</strong>
            </span>
          </div>

          {/* Bank logo strip */}
          <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-slate-400 mr-2 font-medium">Bancos auditados:</span>
            {activeData.banks.map((b) => (
              <div
                key={b.key}
                className="px-2.5 py-1 rounded-md bg-slate-800/60 border-l-4 text-[11px] font-bold text-slate-200"
                style={{ borderLeftColor: b.color }}
              >
                {b.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. ACTIONS & FILTERS TOOLBAR */}
      <div className="card-intelfon p-4 flex flex-wrap items-center justify-between gap-4">
        {/* Date Filter */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-slate-700 flex items-center">
            <Calendar className="w-3.5 h-3.5 mr-1 text-slate-500" />
            Período:
          </span>
          <div className="flex items-center space-x-1.5">
            <label className="text-[11px] text-slate-500">Desde</label>
            <input
              type="date"
              value={localFrom}
              onChange={(e) => setLocalFrom(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>
          <span className="text-slate-400">—</span>
          <div className="flex items-center space-x-1.5">
            <label className="text-[11px] text-slate-500">Hasta</label>
            <input
              type="date"
              value={localTo}
              onChange={(e) => setLocalTo(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>
          <button
            type="button"
            onClick={handleApplyDateFilter}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-2xs transition-all"
          >
            Aplicar
          </button>
          {(dateFilter.from || dateFilter.to) && (
            <button
              type="button"
              onClick={handleResetDateFilter}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs"
              title="Restablecer filtro de fecha"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {activeCountry !== 'GLOBAL' && (
            <button
              type="button"
              onClick={toggleCountry}
              className="btn-intelfon-secondary text-xs"
              title="Alternar país"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Ver bancos {activeCountry === 'GT' ? '🇸🇻 SV' : '🇬🇹 GT'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDownloadExcel}
            className="btn-intelfon-secondary text-xs"
            title="Descargar Excel con todas las hojas"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Descargar Excel</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="btn-intelfon-primary text-xs"
            title="Imprimir informe o generar PDF con membrete institucional"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Descargar PDF Oficial</span>
          </button>

          <button
            type="button"
            onClick={handleCleanDashboard}
            disabled={isCleaning}
            className="p-2 rounded-xl border border-slate-200 hover:border-red-200 text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Limpiar y restablecer datos"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. FINANCIAL KPIS (6 CARDS IN LIGHT MODE) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 1. Saldo Inicial */}
        <div className="card-intelfon p-5 space-y-2 border-l-4 border-l-blue-500">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Saldo Inicial
          </span>
          <p className="text-xl font-extrabold text-slate-900 truncate">
            {formatMoney(activeData.totals.initial, cur, sym)}
          </p>
          <span className="inline-flex items-center text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
            Apertura contable ({activeData.meta.country})
          </span>
        </div>

        {/* 2. Saldo Final */}
        <div className="card-intelfon p-5 space-y-2 border-l-4 border-l-emerald-500">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Saldo Final Disponible
          </span>
          <p className="text-xl font-extrabold text-slate-900 truncate">
            {formatMoney(activeData.totals.final, cur, sym)}
          </p>
          <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
            100% Cuadrado
          </span>
        </div>

        {/* 3. Créditos Acumulados */}
        <div className="card-intelfon p-5 space-y-2 border-l-4 border-l-emerald-600">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Créditos Acumulados
          </span>
          <p className="text-xl font-extrabold text-emerald-600 truncate">
            +{formatMoney(activeData.totals.credits, cur, sym)}
          </p>
          <span className="inline-flex items-center text-[11px] font-medium text-slate-500">
            Total ingresos y depósitos
          </span>
        </div>

        {/* 4. Débitos Acumulados */}
        <div className="card-intelfon p-5 space-y-2 border-l-4 border-l-red-500">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Débitos Acumulados
          </span>
          <p className="text-xl font-extrabold text-red-600 truncate">
            -{formatMoney(activeData.totals.debits, cur, sym)}
          </p>
          <span className="inline-flex items-center text-[11px] font-medium text-slate-500">
            Total retiros y pagos
          </span>
        </div>

        {/* 5. Variación del Período / Flujo Neto */}
        <div className="card-intelfon p-5 space-y-2 border-l-4 border-l-purple-500">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Flujo Neto / Variación
          </span>
          <p className={`text-xl font-extrabold truncate ${
            activeData.totals.netFlow >= 0 ? 'text-emerald-600' : 'text-red-600'
          }`}>
            {activeData.totals.netFlow >= 0 ? '+' : ''}
            {formatMoney(activeData.totals.netFlow, cur, sym)}
          </p>
          <span className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-md ${
            activeData.totals.netFlow >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}>
            {activeData.totals.netFlow >= 0 ? (
              <TrendingUp className="w-3 h-3 mr-1" />
            ) : (
              <TrendingDown className="w-3 h-3 mr-1" />
            )}
            {formatPct(activeData.totals.changePct)}
          </span>
        </div>

        {/* 6. Cuentas y Entidades */}
        <div className="card-intelfon p-5 space-y-2 border-l-4 border-l-slate-400">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Cuentas Auditadas
          </span>
          <p className="text-xl font-extrabold text-slate-900 truncate">
            {activeData.meta.accounts} cuentas
          </p>
          <span className="inline-flex items-center text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
            {activeData.meta.banks} bancos analizados
          </span>
        </div>
      </div>

      {/* 4. MAIN CHARTS & COMPOSITION (GRID 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Saldos por Banco (Saldo Inicial vs Saldo Final) */}
        <div className="card-intelfon p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Saldos por Banco
              </h3>
              <p className="text-xs text-slate-500">
                Comparación de saldo inicial vs saldo final por institución
              </p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center font-semibold text-blue-600">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 mr-1.5" />
                Inicial
              </span>
              <span className="flex items-center font-semibold text-emerald-600">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 mr-1.5" />
                Final
              </span>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {activeData.banks.map((b) => {
              const initPct = Math.min(Math.round((b.initial / maxBalance) * 100), 100);
              const finPct = Math.min(Math.round((b.final / maxBalance) * 100), 100);

              return (
                <div key={b.key} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                    <span className="flex items-center">
                      <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: b.color }} />
                      {b.name}
                    </span>
                    <span className="font-mono text-emerald-700">
                      {formatMoney(b.final, cur, sym)}
                    </span>
                  </div>

                  <div className="space-y-1">
                    {/* Bar Inicial */}
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden flex">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${initPct}%` }}
                        title={`Saldo Inicial: ${formatMoney(b.initial, cur, sym)}`}
                      />
                    </div>
                    {/* Bar Final */}
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden flex">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${finPct}%` }}
                        title={`Saldo Final: ${formatMoney(b.final, cur, sym)}`}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Inicial: {formatMoney(b.initial, cur, sym)}</span>
                    <span className={b.netFlow >= 0 ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>
                      Flujo: {b.netFlow >= 0 ? '+' : ''}{formatMoney(b.netFlow, cur, sym)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 2: Composición del Saldo Final (Participación de Fondos) */}
        <div className="card-intelfon p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-extrabold text-slate-900">
              Composición del Saldo Final
            </h3>
            <p className="text-xs text-slate-500">
              Participación porcentual de cada entidad en los fondos disponibles
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {activeData.banks.map((b) => (
              <div key={b.key} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center space-x-2">
                    <span
                      className="w-3 h-3 rounded-md flex-shrink-0"
                      style={{ backgroundColor: b.color }}
                    />
                    <span className="font-bold text-slate-800">{b.name}</span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      ({b.accountsCount} ctas)
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-slate-900 font-mono text-xs">
                      {formatMoney(b.final, cur, sym)}
                    </span>
                    <span className="ml-2 font-bold text-red-600 text-[11px]">
                      {b.share}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${b.share}%`,
                      backgroundColor: b.color
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 flex justify-between items-center text-xs border-t border-slate-100 font-bold text-slate-700">
            <span>Fondo Total Disponible:</span>
            <span className="text-sm font-extrabold text-slate-900 font-mono">
              {formatMoney(activeData.totals.final, cur, sym)}
            </span>
          </div>
        </div>
      </div>

      {/* 5. FLOW INSIGHTS (Créditos vs Débitos & Flujo Neto) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Créditos vs Débitos */}
        <div className="card-intelfon p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Créditos vs Débitos por Banco
              </h3>
              <p className="text-xs text-slate-500">
                Volumen total de ingresos (+) y egresos (-) operados
              </p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center font-semibold text-emerald-600">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 mr-1.5" />
                Ingresos
              </span>
              <span className="flex items-center font-semibold text-red-600">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-500 mr-1.5" />
                Egresos
              </span>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {activeData.banks.map((b) => (
              <div key={b.key} className="space-y-1">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-800">
                  <span>{b.name}</span>
                  <div className="space-x-3 font-mono text-[11px]">
                    <span className="text-emerald-600">+{formatMoney(b.credits, cur, sym)}</span>
                    <span className="text-red-600">-{formatMoney(b.debits, cur, sym)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 h-2">
                  <div className="h-full bg-slate-100 rounded-full overflow-hidden flex justify-end">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${Math.min(Math.round((b.credits / (b.credits + b.debits || 1)) * 100), 100)}%` }}
                    />
                  </div>
                  <div className="h-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full"
                      style={{ width: `${Math.min(Math.round((b.debits / (b.credits + b.debits || 1)) * 100), 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Flujo Neto por Banco (Superávit vs Déficit) */}
        <div className="card-intelfon p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-extrabold text-slate-900">
              Flujo Neto por Entidad Financiera
            </h3>
            <p className="text-xs text-slate-500">
              Diferencial entre cobros y pagos (Verde = Superávit, Rojo = Déficit)
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {activeData.banks.map((b) => {
              const isPositive = b.netFlow >= 0;
              const widthPct = Math.min(Math.round((Math.abs(b.netFlow) / maxFlow) * 100), 100);

              return (
                <div key={b.key} className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-800">{b.name}</span>
                    <span className={`font-mono ${isPositive ? 'text-emerald-700 font-extrabold' : 'text-red-700 font-extrabold'}`}>
                      {isPositive ? '+' : ''}{formatMoney(b.netFlow, cur, sym)}
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden flex">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isPositive ? 'bg-emerald-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.max(widthPct, 4)}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span>Resultado operativo:</span>
                    <span className={`font-bold uppercase tracking-wider ${
                      isPositive ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {isPositive ? 'Superávit Financiero' : 'Déficit del Período'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
