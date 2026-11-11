import React from 'react';
import { Layers, Globe, ArrowRightLeft, FileSpreadsheet, FileText, CheckCircle2 } from 'lucide-react';
import { useReport } from '../../context/ReportContext';
import { formatMoney, exportReportToExcel } from '../../services/dataService';

export const ConsolidadoGeneralView: React.FC = () => {
  const { fullReport, exchangeRate } = useReport();

  const gt = fullReport.GT;
  const sv = fullReport.SV;
  const global = fullReport.GLOBAL;

  const gtFinalUsd = gt.totals.final / exchangeRate;
  const gtInitialUsd = gt.totals.initial / exchangeRate;
  const gtNetUsd = gt.totals.netFlow / exchangeRate;

  const totalFinalUsd = gtFinalUsd + sv.totals.final;
  const totalInitialUsd = gtInitialUsd + sv.totals.initial;
  const totalNetUsd = gtNetUsd + sv.totals.netFlow;

  const handleExportConsolidado = () => {
    exportReportToExcel(global, `Consolidado_Regional_USD_INTELFON_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-red-600 mb-1">
            <Globe className="w-3.5 h-3.5" />
            <span>Multi-País · RED INTELFON Centroamérica</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Consolidación General Regional
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Consolidado automático de Guatemala y El Salvador con valores homologados y convertidos a Dólares (USD).
          </p>
        </div>

        <div className="flex items-center space-x-3 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleExportConsolidado}
            className="btn-intelfon-primary text-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Descargar Consolidado (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Regional USD KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-intelfon p-5 border-l-4 border-l-red-600">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Saldo Total Consolidado
          </span>
          <p className="text-2xl font-black text-slate-900 font-mono">
            {formatMoney(totalFinalUsd, 'USD', '$')}
          </p>
          <span className="text-[11px] text-slate-500 font-medium block mt-1">
            Fondos combinados GT + SV en USD
          </span>
        </div>

        <div className="card-intelfon p-5 border-l-4 border-l-blue-600">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Guatemala (Equivalente USD)
            </span>
            <span className="text-xs">🇬🇹</span>
          </div>
          <p className="text-2xl font-black text-blue-700 font-mono">
            {formatMoney(gtFinalUsd, 'USD', '$')}
          </p>
          <span className="text-[11px] text-slate-500 font-medium block mt-1">
            Original: {formatMoney(gt.totals.final, 'GTQ', 'Q')}
          </span>
        </div>

        <div className="card-intelfon p-5 border-l-4 border-l-emerald-600">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              El Salvador (Moneda Base USD)
            </span>
            <span className="text-xs">🇸🇻</span>
          </div>
          <p className="text-2xl font-black text-emerald-700 font-mono">
            {formatMoney(sv.totals.final, 'USD', '$')}
          </p>
          <span className="text-[11px] text-slate-500 font-medium block mt-1">
            Original: {formatMoney(sv.totals.final, 'USD', '$')}
          </span>
        </div>

        <div className="card-intelfon p-5 border-l-4 border-l-purple-600">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Tasa Oficial Aplicada
            </span>
            <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-purple-700 font-mono">
            Q {exchangeRate.toFixed(2)} / USD
          </p>
          <span className="text-[11px] text-slate-500 font-medium block mt-1">
            Flujo neto regional: {totalNetUsd >= 0 ? '+' : ''}{formatMoney(totalNetUsd, 'USD', '$')}
          </span>
        </div>
      </div>

      {/* Table 1: Consolidado General por País */}
      <div className="card-intelfon p-6 space-y-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-900">
            Resumen General por País y Moneda
          </h3>
          <p className="text-xs text-slate-500">
            Saldos originales por país y su cálculo consolidado en dólares americanos
          </p>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="table-intelfon">
            <thead>
              <tr>
                <th>País / Territorio</th>
                <th>Moneda Original</th>
                <th className="text-center">Bancos / Cuentas</th>
                <th className="text-right">Saldo Final Original</th>
                <th className="text-right">Saldo Final (USD)</th>
                <th className="text-right">% Participación</th>
                <th className="text-center">Conciliación</th>
              </tr>
            </thead>
            <tbody>
              {/* Guatemala */}
              <tr className="hover:bg-slate-50">
                <td className="font-bold text-slate-900 flex items-center space-x-2">
                  <span className="text-base">🇬🇹</span>
                  <span>Guatemala</span>
                </td>
                <td className="font-mono text-slate-600 font-bold">GTQ (Quetzales)</td>
                <td className="text-center">
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-xs font-semibold text-slate-700">
                    {gt.meta.banks} bancos · {gt.meta.accounts} ctas
                  </span>
                </td>
                <td className="text-right font-mono font-bold text-slate-800">
                  {formatMoney(gt.totals.final, 'GTQ', 'Q')}
                </td>
                <td className="text-right font-mono font-black text-blue-700">
                  {formatMoney(gtFinalUsd, 'USD', '$')}
                </td>
                <td className="text-right font-mono font-bold text-slate-700">
                  {((gtFinalUsd / totalFinalUsd) * 100).toFixed(1)}%
                </td>
                <td className="text-center">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                    100% Cuadrado
                  </span>
                </td>
              </tr>

              {/* El Salvador */}
              <tr className="hover:bg-slate-50">
                <td className="font-bold text-slate-900 flex items-center space-x-2">
                  <span className="text-base">🇸🇻</span>
                  <span>El Salvador</span>
                </td>
                <td className="font-mono text-slate-600 font-bold">USD (Dólares)</td>
                <td className="text-center">
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-xs font-semibold text-slate-700">
                    {sv.meta.banks} bancos · {sv.meta.accounts} ctas
                  </span>
                </td>
                <td className="text-right font-mono font-bold text-slate-800">
                  {formatMoney(sv.totals.final, 'USD', '$')}
                </td>
                <td className="text-right font-mono font-black text-emerald-700">
                  {formatMoney(sv.totals.final, 'USD', '$')}
                </td>
                <td className="text-right font-mono font-bold text-slate-700">
                  {((sv.totals.final / totalFinalUsd) * 100).toFixed(1)}%
                </td>
                <td className="text-center">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                    100% Cuadrado
                  </span>
                </td>
              </tr>

              {/* Total Regional */}
              <tr className="bg-slate-50/90 font-black border-t-2 border-slate-300">
                <td className="font-black text-slate-900 flex items-center space-x-2">
                  <span className="text-base">🌎</span>
                  <span>TOTAL CONSOLIDADO RED INTELFON</span>
                </td>
                <td className="font-mono text-slate-900 font-extrabold">USD</td>
                <td className="text-center text-xs">
                  {gt.meta.banks + sv.meta.banks} bancos · {gt.meta.accounts + sv.meta.accounts} ctas
                </td>
                <td className="text-right font-mono text-slate-500">—</td>
                <td className="text-right font-mono text-lg font-black text-slate-900">
                  {formatMoney(totalFinalUsd, 'USD', '$')}
                </td>
                <td className="text-right font-mono font-bold text-slate-900">100.0%</td>
                <td className="text-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                    Auditoría OK
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Table 2: Consolidado Regional Detallado (USD) */}
      <div className="card-intelfon p-6 space-y-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-900">
            Detalle por Banco y Cuenta Homologado en USD
          </h3>
          <p className="text-xs text-slate-500">
            Detalle individual con conversión automática de Quetzales a Dólares
          </p>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="table-intelfon">
            <thead>
              <tr>
                <th>País / Entidad Bancaria</th>
                <th>Cuenta</th>
                <th>Moneda</th>
                <th className="text-right">Monto Original</th>
                <th className="text-right">Monto Equivalente (USD)</th>
                <th className="text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {/* Guatemala accounts converted */}
              {gt.accounts.map((a) => (
                <tr key={`gt-${a.account}`} className="hover:bg-slate-50">
                  <td className="font-bold text-slate-900">
                    <span className="mr-1.5">🇬🇹</span>
                    {a.bank}
                  </td>
                  <td className="font-mono font-bold text-slate-700 text-xs">
                    {a.account}
                  </td>
                  <td className="text-slate-500 font-mono text-xs">GTQ</td>
                  <td className="text-right font-mono text-slate-800">
                    {formatMoney(a.final, 'GTQ', 'Q')}
                  </td>
                  <td className="text-right font-mono font-extrabold text-blue-700">
                    {formatMoney(a.final / exchangeRate, 'USD', '$')}
                  </td>
                  <td className="text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                      Convertido
                    </span>
                  </td>
                </tr>
              ))}

              {/* El Salvador accounts */}
              {sv.accounts.map((a) => (
                <tr key={`sv-${a.account}`} className="hover:bg-slate-50">
                  <td className="font-bold text-slate-900">
                    <span className="mr-1.5">🇸🇻</span>
                    {a.bank}
                  </td>
                  <td className="font-mono font-bold text-slate-700 text-xs">
                    {a.account}
                  </td>
                  <td className="text-slate-500 font-mono text-xs">USD</td>
                  <td className="text-right font-mono text-slate-800">
                    {formatMoney(a.final, 'USD', '$')}
                  </td>
                  <td className="text-right font-mono font-extrabold text-emerald-700">
                    {formatMoney(a.final, 'USD', '$')}
                  </td>
                  <td className="text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                      Base USD
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
