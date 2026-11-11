import React, { useState } from 'react';
import { RefreshCw, ArrowRightLeft, Database, CheckCircle2, AlertCircle } from 'lucide-react';
import { useReport } from '../../context/ReportContext';
import { useAuth } from '../../context/AuthContext';
import { CountryCode } from '../../types';

export const RegionStatusBar: React.FC = () => {
  const {
    activeCountry,
    setActiveCountry,
    exchangeRate,
    setExchangeRate,
    activeData,
    isFirebaseConnected,
    isSyncing,
    lastSyncTime,
    checkFirebaseSync
  } = useReport();

  const { currentUser, isMaster } = useAuth();
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [newRateInput, setNewRateInput] = useState(String(exchangeRate));

  const handleRateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(newRateInput);
    if (!isNaN(parsed) && parsed > 0) {
      setExchangeRate(parsed);
      setIsEditingRate(false);
    }
  };

  const countries: { code: CountryCode; label: string; flag: string; curr: string }[] = [
    { code: 'GT', label: 'Guatemala', flag: '🇬🇹', curr: 'GTQ (Q)' },
    { code: 'SV', label: 'El Salvador', flag: '🇸🇻', curr: 'USD ($)' },
    { code: 'GLOBAL', label: 'Consolidado', flag: '🌎', curr: 'USD ($)' }
  ];

  return (
    <div className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
      {/* Country Pills Switcher */}
      <div className="flex items-center space-x-1.5 sm:space-x-2 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
        {countries.map((c) => {
          const isActive = activeCountry === c.code;
          return (
            <button
              key={c.code}
              type="button"
              onClick={() => setActiveCountry(c.code)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all text-xs ${
                isActive
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60 text-red-600'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span>{c.flag}</span>
              <span className="font-semibold">{c.label}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                isActive ? 'bg-red-50 text-red-600' : 'text-slate-400'
              }`}>
                {c.curr}
              </span>
            </button>
          );
        })}
      </div>

      {/* Meta indicators & Realtime Sync */}
      <div className="flex items-center flex-wrap gap-2.5 sm:gap-4 text-slate-500">
        {/* Exchange Rate widget */}
        <div className="flex items-center space-x-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
          <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[11px] font-medium text-slate-500">Tasa GTQ/USD:</span>
          {isEditingRate ? (
            <form onSubmit={handleRateSubmit} className="flex items-center space-x-1">
              <input
                type="number"
                step="0.01"
                min="1"
                value={newRateInput}
                onChange={(e) => setNewRateInput(e.target.value)}
                className="w-16 px-1.5 py-0.5 text-xs border border-red-300 rounded bg-white font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-500"
                autoFocus
              />
              <button
                type="submit"
                className="px-1.5 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold"
              >
                OK
              </button>
              <button
                type="button"
                onClick={() => setIsEditingRate(false)}
                className="text-slate-400 hover:text-slate-600 text-[10px]"
              >
                ✕
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setNewRateInput(String(exchangeRate));
                setIsEditingRate(true);
              }}
              className="font-mono font-bold text-slate-800 hover:text-red-600 underline decoration-dotted transition-colors"
              title="Click para ajustar la tasa de cambio GTQ / USD"
            >
              Q {exchangeRate.toFixed(2)}
            </button>
          )}
        </div>

        {/* Firebase Sync Status */}
        <div className="flex items-center space-x-1.5">
          <Database className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden md:inline text-[11px]">Firebase RTDB:</span>
          <span className={`inline-flex items-center font-semibold text-[11px] ${
            isFirebaseConnected ? 'text-emerald-700' : 'text-amber-700'
          }`}>
            {isFirebaseConnected ? (
              <>
                <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" />
                Sincronizado
              </>
            ) : (
              <>
                <AlertCircle className="w-3 h-3 mr-1 text-amber-500" />
                Local
              </>
            )}
          </span>
          <span className="text-[10px] text-slate-400 hidden lg:inline">
            ({lastSyncTime})
          </span>
        </div>

        {/* Active file snapshot indicator */}
        <div className="hidden xl:flex items-center space-x-1 text-[11px] text-slate-400 max-w-[220px] truncate">
          <span>Archivo:</span>
          <span className="font-semibold text-slate-600 truncate" title={activeData.meta.file}>
            {activeData.meta.file}
          </span>
        </div>
      </div>
    </div>
  );
};
