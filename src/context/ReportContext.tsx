import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { CONFIG } from '../config/env';
import { CountryCode, FullReportPayload, CountryBaseData, DailyFlowItem, AccountData } from '../types';
import { loadCurrentReport, saveCurrentReport, clearCurrentReport } from '../services/dataService';
import { FirebaseService } from '../services/firebaseService';
import { useAuth } from './AuthContext';

interface ReportContextType {
  activeCountry: CountryCode;
  setActiveCountry: (c: CountryCode) => void;
  fullReport: FullReportPayload;
  activeData: CountryBaseData;
  exchangeRate: number;
  setExchangeRate: (rate: number) => void;
  dateFilter: { from: string; to: string };
  setDateFilter: (filter: { from: string; to: string }) => void;
  resetDateFilter: () => void;
  filteredDaily: DailyFlowItem[];
  filteredAccounts: AccountData[];
  selectedBankFilter: string;
  setSelectedBankFilter: (bank: string) => void;
  updateReportData: (updater: (prev: FullReportPayload) => FullReportPayload) => void;
  replaceReportData: (newReport: FullReportPayload) => void;
  resetToDemoData: () => void;
  isFirebaseConnected: boolean;
  isSyncing: boolean;
  lastSyncTime: string;
  checkFirebaseSync: () => Promise<void>;
}

const ReportContext = createContext<ReportContextType | undefined>(undefined);

export const ReportProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();

  // Active country defaults based on user role or regional assignment
  const [activeCountry, setActiveCountry] = useState<CountryCode>(() => {
    if (currentUser?.region === 'GT') return 'GT';
    if (currentUser?.region === 'SV') return 'SV';
    return 'GT'; // Default to Guatemala for financial view
  });

  const [fullReport, setFullReport] = useState<FullReportPayload>(() => loadCurrentReport());
  const [exchangeRate, setExchangeRateState] = useState<number>(fullReport.rate || CONFIG.DEFAULT_EXCHANGE_RATE);
  const [dateFilter, setDateFilter] = useState<{ from: string; to: string }>({ from: '', to: '' });
  const [selectedBankFilter, setSelectedBankFilter] = useState<string>('ALL');
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString('es-GT'));

  // Update country if user logs in as regional master
  useEffect(() => {
    if (currentUser?.region === 'GT') setActiveCountry('GT');
    else if (currentUser?.region === 'SV') setActiveCountry('SV');
  }, [currentUser]);

  // Firebase connection test
  const checkFirebaseSync = async () => {
    setIsSyncing(true);
    try {
      const connected = await FirebaseService.checkConnection();
      setIsFirebaseConnected(connected);
      setLastSyncTime(new Date().toLocaleTimeString('es-GT'));
    } catch (_) {
      setIsFirebaseConnected(false);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    checkFirebaseSync();
    const interval = setInterval(() => {
      checkFirebaseSync();
    }, 45000);
    return () => clearInterval(interval);
  }, []);

  // Update exchange rate and recompute global totals
  const setExchangeRate = (rate: number) => {
    if (rate <= 0) return;
    setExchangeRateState(rate);
    setFullReport(prev => {
      const gtTotals = prev.GT.totals;
      const svTotals = prev.SV.totals;

      const gtInitialUsd = gtTotals.initial / rate;
      const gtFinalUsd = gtTotals.final / rate;
      const gtCreditsUsd = gtTotals.credits / rate;
      const gtDebitsUsd = gtTotals.debits / rate;
      const gtNetUsd = gtTotals.netFlow / rate;

      const globalTotals = {
        initial: Math.round((gtInitialUsd + svTotals.initial) * 100) / 100,
        final: Math.round((gtFinalUsd + svTotals.final) * 100) / 100,
        change: Math.round((gtNetUsd + svTotals.change) * 100) / 100,
        changePct: Math.round((((gtFinalUsd + svTotals.final) - (gtInitialUsd + svTotals.initial)) / (gtInitialUsd + svTotals.initial)) * 1000) / 10,
        credits: Math.round((gtCreditsUsd + svTotals.credits) * 100) / 100,
        debits: Math.round((gtDebitsUsd + svTotals.debits) * 100) / 100,
        netFlow: Math.round((gtNetUsd + svTotals.netFlow) * 100) / 100
      };

      const updated: FullReportPayload = {
        ...prev,
        rate,
        GLOBAL: {
          ...prev.GLOBAL,
          totals: globalTotals
        }
      };
      saveCurrentReport(updated);
      return updated;
    });
  };

  const updateReportData = (updater: (prev: FullReportPayload) => FullReportPayload) => {
    setFullReport(prev => {
      const updated = updater(prev);
      saveCurrentReport(updated);
      return updated;
    });
  };

  const replaceReportData = (newReport: FullReportPayload) => {
    setFullReport(newReport);
    saveCurrentReport(newReport);
  };

  const resetToDemoData = () => {
    const fresh = clearCurrentReport();
    setFullReport(fresh);
    setDateFilter({ from: '', to: '' });
    setSelectedBankFilter('ALL');
  };

  const resetDateFilter = () => {
    setDateFilter({ from: '', to: '' });
  };

  const activeData: CountryBaseData = useMemo(() => {
    return fullReport[activeCountry] || fullReport.GT;
  }, [fullReport, activeCountry]);

  // Filter daily records based on date range
  const filteredDaily = useMemo(() => {
    let list = activeData.daily || [];
    if (dateFilter.from) {
      list = list.filter(d => d.date >= dateFilter.from);
    }
    if (dateFilter.to) {
      list = list.filter(d => d.date <= dateFilter.to);
    }
    return list;
  }, [activeData.daily, dateFilter]);

  // Filter accounts based on selected bank
  const filteredAccounts = useMemo(() => {
    let list = activeData.accounts || [];
    if (selectedBankFilter !== 'ALL') {
      list = list.filter(a => a.bankKey.toLowerCase() === selectedBankFilter.toLowerCase() || a.bank.toLowerCase().includes(selectedBankFilter.toLowerCase()));
    }
    return list;
  }, [activeData.accounts, selectedBankFilter]);

  return (
    <ReportContext.Provider
      value={{
        activeCountry,
        setActiveCountry,
        fullReport,
        activeData,
        exchangeRate,
        setExchangeRate,
        dateFilter,
        setDateFilter,
        resetDateFilter,
        filteredDaily,
        filteredAccounts,
        selectedBankFilter,
        setSelectedBankFilter,
        updateReportData,
        replaceReportData,
        resetToDemoData,
        isFirebaseConnected,
        isSyncing,
        lastSyncTime,
        checkFirebaseSync
      }}
    >
      {children}
    </ReportContext.Provider>
  );
};

export function useReport() {
  const context = useContext(ReportContext);
  if (!context) throw new Error('useReport must be used within a ReportProvider');
  return context;
}
