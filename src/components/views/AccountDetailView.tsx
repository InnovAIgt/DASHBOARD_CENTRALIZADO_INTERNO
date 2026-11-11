import React, { useState } from 'react';
import { CreditCard, Search, Filter, CheckCircle2, Download } from 'lucide-react';
import { useReport } from '../../context/ReportContext';
import { formatMoney, exportReportToExcel } from '../../services/dataService';

export const AccountDetailView: React.FC = () => {
  const {
    activeData,
    filteredAccounts,
    selectedBankFilter,
    setSelectedBankFilter
  } = useReport();

  const [searchTerm, setSearchTerm] = useState('');
  const cur = activeData.meta.currency;
  const sym = activeData.meta.symbol;

  const displayedAccounts = filteredAccounts.filter(acc => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      acc.account.toLowerCase().includes(term) ||
      acc.bank.toLowerCase().includes(term) ||
      (acc.accountType && acc.accountType.toLowerCase().includes(term))
    );
  });

  const totalFinal = displayedAccounts.reduce((acc, a) => acc + a.final, 0);
  const totalInitial = displayedAccounts.reduce((acc, a) => acc + a.initial, 0);
  const totalCredits = displayedAccounts.reduce((acc, a) => acc + a.credits, 0);
  const totalDebits = displayedAccounts.reduce((acc, a) => acc + a.debits, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Detalle de Cuentas Bancarias
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Libro mayor de cuentas bancarias de {activeData.meta.countryName} con auditoría individual
          </p>
        </div>

        <button
          type="button"
          onClick={() => exportReportToExcel(activeData, `Cuentas_${activeData.meta.country}.xlsx`)}
          className="btn-intelfon-secondary text-xs self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-emerald-600" />
          <span>Exportar Cuentas (.xlsx)</span>
        </button>
      </div>

      {/* Filters bar */}
      <div className="card-intelfon p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por número o nombre de cuenta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition-all"
          />
        </div>

        {/* Bank Selector */}
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <label className="text-xs font-bold text-slate-600 flex-shrink-0">Filtrar Banco:</label>
          <select
            value={selectedBankFilter}
            onChange={(e) => setSelectedBankFilter(e.target.value)}
            className="w-full sm:w-64 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
          >
            <option value="ALL">🏦 Todos los Bancos ({activeData.banks.length})</option>
            {activeData.banks.map((b) => (
              <option key={b.key} value={b.key}>
                {b.name} ({b.accountsCount} ctas)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary KPI Strip for filtered accounts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="p-3 bg-white border border-slate-200 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Cuentas Filtradas</span>
          <span className="text-base font-extrabold text-slate-900 font-mono">{displayedAccounts.length}</span>
        </div>
        <div className="p-3 bg-white border border-slate-200 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Saldo Inicial Total</span>
          <span className="text-base font-extrabold text-slate-900 font-mono">{formatMoney(totalInitial, cur, sym)}</span>
        </div>
        <div className="p-3 bg-white border border-slate-200 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Movimientos (+ / -)</span>
          <span className="text-base font-extrabold text-slate-900 font-mono">
            +{formatMoney(totalCredits, cur, sym)} / -{formatMoney(totalDebits, cur, sym)}
          </span>
        </div>
        <div className="p-3 bg-white border border-slate-200 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Saldo Final Disponible</span>
          <span className="text-base font-extrabold text-emerald-700 font-mono">{formatMoney(totalFinal, cur, sym)}</span>
        </div>
      </div>

      {/* Account Table */}
      <div className="card-intelfon overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-intelfon">
            <thead>
              <tr>
                <th>Entidad Bancaria</th>
                <th>Número de Cuenta</th>
                <th>Tipo de Cuenta</th>
                <th className="text-right">Saldo Inicial</th>
                <th className="text-right">Créditos (+)</th>
                <th className="text-right">Débitos (-)</th>
                <th className="text-right">Saldo Final</th>
                <th className="text-right">Diferencia</th>
                <th className="text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {displayedAccounts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                    No se encontraron cuentas que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                displayedAccounts.map((acc) => (
                  <tr key={acc.account} className="hover:bg-slate-50 transition-colors">
                    <td className="font-bold text-slate-900">
                      {acc.bank}
                    </td>
                    <td className="font-mono font-bold text-slate-800">
                      {acc.account}
                    </td>
                    <td className="text-slate-500">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-semibold text-slate-700">
                        {acc.accountType || 'Monetaria'}
                      </span>
                    </td>
                    <td className="text-right font-mono text-slate-700">
                      {formatMoney(acc.initial, cur, sym)}
                    </td>
                    <td className="text-right font-mono font-bold text-emerald-600">
                      +{formatMoney(acc.credits, cur, sym)}
                    </td>
                    <td className="text-right font-mono font-bold text-red-600">
                      -{formatMoney(acc.debits, cur, sym)}
                    </td>
                    <td className="text-right font-mono font-extrabold text-slate-900">
                      {formatMoney(acc.final, cur, sym)}
                    </td>
                    <td className={`text-right font-mono font-bold ${
                      acc.change >= 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {acc.change >= 0 ? '+' : ''}{formatMoney(acc.change, cur, sym)}
                    </td>
                    <td className="text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                        Cuadrada
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
