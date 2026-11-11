import React from 'react';
import { Building2, CheckCircle2, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, CreditCard, ShieldCheck } from 'lucide-react';
import { useReport } from '../../context/ReportContext';
import { formatMoney, formatPct } from '../../services/dataService';

export const BankDetailView: React.FC = () => {
  const { activeData } = useReport();
  const cur = activeData.meta.currency;
  const sym = activeData.meta.symbol;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Detalle por Entidad Bancaria
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Balances, movimientos acumulados y conciliación contable por banco en {activeData.meta.countryName}
          </p>
        </div>

        <span className="inline-flex items-center self-start sm:self-auto px-3 py-1.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
          <ShieldCheck className="w-4 h-4 mr-1.5 text-red-600" />
          {activeData.banks.length} Bancos Auditados
        </span>
      </div>

      {/* Grid of Bank Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {activeData.banks.map((bank) => {
          const bankAccounts = activeData.accounts.filter(
            a => a.bankKey.toLowerCase() === bank.key.toLowerCase() || a.bank.toLowerCase().includes(bank.name.toLowerCase())
          );
          const isSuperavit = bank.netFlow >= 0;

          return (
            <div
              key={bank.key}
              className="card-intelfon overflow-hidden border-t-4 hover:shadow-md transition-shadow"
              style={{ borderTopColor: bank.color }}
            >
              {/* Card Header */}
              <div className="p-6 pb-4 border-b border-slate-100 flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-xs"
                    style={{ backgroundColor: bank.color }}
                  >
                    {bank.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      {bank.name}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {activeData.meta.countryName} · {bankAccounts.length} cuenta{bankAccounts.length !== 1 ? 's' : ''} activa{bankAccounts.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  Cuadrado
                </span>
              </div>

              {/* Balances Summary in 2-column strip */}
              <div className="grid grid-cols-2 divide-x divide-slate-100 bg-slate-50/70 border-b border-slate-100 text-xs">
                <div className="p-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Saldo Inicial
                  </span>
                  <span className="font-extrabold text-slate-800 text-base font-mono">
                    {formatMoney(bank.initial, cur, sym)}
                  </span>
                </div>
                <div className="p-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Saldo Final Disponible
                  </span>
                  <span className="font-extrabold text-emerald-700 text-base font-mono">
                    {formatMoney(bank.final, cur, sym)}
                  </span>
                </div>
              </div>

              {/* Financial Movement Stats */}
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase block flex items-center justify-center">
                      <ArrowUpRight className="w-3 h-3 mr-0.5" /> Créditos
                    </span>
                    <span className="font-bold text-slate-900 font-mono text-xs block mt-1">
                      {formatMoney(bank.credits, cur, sym)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-red-50/60 border border-red-100">
                    <span className="text-[10px] font-bold text-red-700 uppercase block flex items-center justify-center">
                      <ArrowDownRight className="w-3 h-3 mr-0.5" /> Débitos
                    </span>
                    <span className="font-bold text-slate-900 font-mono text-xs block mt-1">
                      {formatMoney(bank.debits, cur, sym)}
                    </span>
                  </div>

                  <div className={`p-2.5 rounded-xl border ${
                    isSuperavit ? 'bg-emerald-50/80 border-emerald-200' : 'bg-red-50/80 border-red-200'
                  }`}>
                    <span className={`text-[10px] font-bold uppercase block ${
                      isSuperavit ? 'text-emerald-700' : 'text-red-700'
                    }`}>
                      Flujo Neto
                    </span>
                    <span className={`font-black font-mono text-xs block mt-1 ${
                      isSuperavit ? 'text-emerald-800' : 'text-red-800'
                    }`}>
                      {isSuperavit ? '+' : ''}{formatMoney(bank.netFlow, cur, sym)}
                    </span>
                  </div>
                </div>

                {/* Accounts Table for this Bank */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Cuentas Vinculadas ({bankAccounts.length})
                  </span>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3 font-bold">Cuenta</th>
                          <th className="py-2 px-3 font-bold">Tipo</th>
                          <th className="py-2 px-3 font-bold text-right">Saldo Final</th>
                          <th className="py-2 px-3 font-bold text-right">Diferencia</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {bankAccounts.map((acc) => (
                          <tr key={acc.account} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                              {acc.account}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">
                              {acc.accountType || 'Monetaria'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-extrabold text-slate-900">
                              {formatMoney(acc.final, cur, sym)}
                            </td>
                            <td className={`py-2.5 px-3 text-right font-mono font-bold ${
                              acc.change >= 0 ? 'text-emerald-600' : 'text-red-600'
                            }`}>
                              {acc.change >= 0 ? '+' : ''}{formatMoney(acc.change, cur, sym)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
