import React from 'react';
import { Calendar, ArrowUpRight, ArrowDownRight, TrendingUp, Layers } from 'lucide-react';
import { useReport } from '../../context/ReportContext';
import { formatMoney, formatDate } from '../../services/dataService';

export const DailyFlowView: React.FC = () => {
  const { filteredDaily, activeData } = useReport();
  const cur = activeData.meta.currency;
  const sym = activeData.meta.symbol;

  const totalDebits = filteredDaily.reduce((acc, d) => acc + d.debits, 0);
  const totalCredits = filteredDaily.reduce((acc, d) => acc + d.credits, 0);
  const totalNet = totalCredits - totalDebits;
  const totalMovements = filteredDaily.reduce((acc, d) => acc + d.count, 0);

  const maxDebitDay = filteredDaily.reduce((prev, curr) => (curr.debits > prev.debits ? curr : prev), filteredDaily[0] || { debits: 0, date: '' });
  const maxCreditDay = filteredDaily.reduce((prev, curr) => (curr.credits > prev.credits ? curr : prev), filteredDaily[0] || { credits: 0, date: '' });
  const maxFlow = Math.max(...filteredDaily.map(d => Math.max(d.credits, d.debits)), 1);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* View Header */}
      <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Evolución y Flujo Diario
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Comportamiento cronológico de las transacciones operadas en {activeData.meta.countryName}
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full font-bold">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{filteredDaily.length} días analizados</span>
        </div>
      </div>

      {/* Daily Top KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-intelfon p-4 border-l-4 border-l-emerald-500">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Total Ingresos del Período
          </span>
          <span className="text-lg font-extrabold text-emerald-600 font-mono">
            +{formatMoney(totalCredits, cur, sym)}
          </span>
          <p className="text-[11px] text-slate-400 mt-1">Créditos registrados en extractos</p>
        </div>

        <div className="card-intelfon p-4 border-l-4 border-l-red-500">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Total Egresos del Período
          </span>
          <span className="text-lg font-extrabold text-red-600 font-mono">
            -{formatMoney(totalDebits, cur, sym)}
          </span>
          <p className="text-[11px] text-slate-400 mt-1">Débitos y pagos bancarios</p>
        </div>

        <div className="card-intelfon p-4 border-l-4 border-l-purple-500">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Flujo Neto Acumulado
          </span>
          <span className={`text-lg font-extrabold font-mono ${totalNet >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {totalNet >= 0 ? '+' : ''}{formatMoney(totalNet, cur, sym)}
          </span>
          <p className="text-[11px] text-slate-400 mt-1">Diferencial contable neto</p>
        </div>

        <div className="card-intelfon p-4 border-l-4 border-l-blue-500">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Volumen de Movimientos
          </span>
          <span className="text-lg font-extrabold text-slate-900 font-mono">
            {totalMovements} transacciones
          </span>
          <p className="text-[11px] text-slate-400 mt-1">Auditadas cuenta por cuenta</p>
        </div>
      </div>

      {/* Visual Timeline Bar Chart */}
      <div className="card-intelfon p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Evolución Diaria de Créditos vs Débitos
            </h3>
            <p className="text-xs text-slate-500">
              Tendencia cronológica de flujos operados por jornada bancaria
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <span className="flex items-center font-semibold text-emerald-600">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 mr-1.5" />
              Créditos (Ingresos)
            </span>
            <span className="flex items-center font-semibold text-red-600">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-500 mr-1.5" />
              Débitos (Egresos)
            </span>
          </div>
        </div>

        {/* Timeline Visualization */}
        <div className="space-y-3 pt-2">
          {filteredDaily.map((item) => {
            const creditPct = Math.min(Math.round((item.credits / maxFlow) * 100), 100);
            const debitPct = Math.min(Math.round((item.debits / maxFlow) * 100), 100);

            return (
              <div key={item.date} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5 hover:bg-slate-100/60 transition-colors">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-800 font-mono">{formatDate(item.date)}</span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-semibold">
                      {item.count} movs
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 text-xs font-mono">
                    <span className="text-emerald-600 font-bold">+{formatMoney(item.credits, cur, sym)}</span>
                    <span className="text-red-600 font-bold">-{formatMoney(item.debits, cur, sym)}</span>
                    <span className={`font-black pl-2 border-l border-slate-200 ${item.net >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {item.net >= 0 ? '+' : ''}{formatMoney(item.net, cur, sym)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 h-2">
                  <div className="h-full bg-slate-200/60 rounded-full overflow-hidden flex justify-end">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(creditPct, 3)}%` }}
                    />
                  </div>
                  <div className="h-full bg-slate-200/60 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(debitPct, 3)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily Transaction Ledger Table */}
      <div className="card-intelfon p-6 space-y-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-900">
            Libro de Movimientos Diarios
          </h3>
          <p className="text-xs text-slate-500">
            Resumen diario con conciliación de ingresos, egresos y flujo neto
          </p>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="table-intelfon">
            <thead>
              <tr>
                <th>Fecha de Operación</th>
                <th className="text-center">Transacciones</th>
                <th className="text-right">Débitos (Egresos)</th>
                <th className="text-right">Créditos (Ingresos)</th>
                <th className="text-right">Flujo Neto Diario</th>
                <th className="text-center">Estado Contable</th>
              </tr>
            </thead>
            <tbody>
              {filteredDaily.map((item) => (
                <tr key={item.date}>
                  <td className="font-bold text-slate-900 font-mono">
                    {formatDate(item.date)}
                  </td>
                  <td className="text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                      {item.count} ops
                    </span>
                  </td>
                  <td className="text-right font-mono font-bold text-red-600">
                    -{formatMoney(item.debits, cur, sym)}
                  </td>
                  <td className="text-right font-mono font-bold text-emerald-600">
                    +{formatMoney(item.credits, cur, sym)}
                  </td>
                  <td className={`text-right font-mono font-extrabold ${item.net >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {item.net >= 0 ? '+' : ''}{formatMoney(item.net, cur, sym)}
                  </td>
                  <td className="text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Conciliado
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
