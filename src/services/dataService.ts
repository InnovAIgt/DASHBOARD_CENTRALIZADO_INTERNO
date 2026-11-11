import * as XLSX from 'xlsx';
import { CONFIG } from '../config/env';
import { CountryBaseData, FullReportPayload, BankData, AccountData, DailyFlowItem, CountryCode } from '../types';

const STORAGE_REPORT_KEY = 'intelfon_current_report';

export function formatMoney(amount: number, currency = 'USD', symbol = '$'): string {
  const val = Number(amount) || 0;
  const formatted = Math.abs(val).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const prefix = val < 0 ? '-' : '';
  return `${prefix}${symbol} ${formatted} ${currency}`;
}

export function formatNumber(amount: number, symbol = ''): string {
  const val = Number(amount) || 0;
  const formatted = Math.abs(val).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const prefix = val < 0 ? '-' : '';
  return `${prefix}${symbol}${formatted}`;
}

export function formatPct(val: number): string {
  const num = Number(val) || 0;
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(1)}%`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr || dateStr === 'Reciente') return dateStr || 'Reciente';
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('es-GT', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
      });
    }
  } catch (_) {}
  return dateStr;
}

// Generates high fidelity initial demo data for both Guatemala & El Salvador
export function generateSeedData(): FullReportPayload {
  const rate = CONFIG.DEFAULT_EXCHANGE_RATE;

  // 1. GUATEMALA (GTQ / Q)
  const gtBanks: BankData[] = [
    {
      key: 'Banco Industrial',
      name: 'Banco Industrial',
      color: '#0033A0',
      initial: 4250000.00,
      final: 5120450.50,
      credits: 3150200.00,
      debits: 2279749.50,
      netFlow: 870450.50,
      share: 42.5,
      accountsCount: 3,
      country: 'GT'
    },
    {
      key: 'Banco G&T Continental',
      name: 'Banco G&T Continental',
      color: '#E30613',
      initial: 2850000.00,
      final: 3410120.00,
      credits: 2100500.00,
      debits: 1540380.00,
      netFlow: 560120.00,
      share: 28.3,
      accountsCount: 2,
      country: 'GT'
    },
    {
      key: 'Banrural',
      name: 'Banrural',
      color: '#00843D',
      initial: 1980000.00,
      final: 2150800.20,
      credits: 1450000.00,
      debits: 1279199.80,
      netFlow: 170800.20,
      share: 17.8,
      accountsCount: 2,
      country: 'GT'
    },
    {
      key: 'BAC Credomatic Guatemala',
      name: 'BAC Credomatic',
      color: '#DC2626',
      initial: 1200000.00,
      final: 1374520.00,
      credits: 980000.00,
      debits: 805480.00,
      netFlow: 174520.00,
      share: 11.4,
      accountsCount: 1,
      country: 'GT'
    }
  ];

  const gtAccounts: AccountData[] = [
    {
      bank: 'Banco Industrial',
      bankKey: 'Banco Industrial',
      account: '004-129481-9',
      accountType: 'Monetaria Principal',
      initial: 2500000.00,
      credits: 2100000.00,
      debits: 1450000.00,
      final: 3150000.00,
      change: 650000.00,
      changePct: 26.0,
      country: 'GT',
      reconciled: true,
      status: 'Cuadrada'
    },
    {
      bank: 'Banco Industrial',
      bankKey: 'Banco Industrial',
      account: '004-884102-3',
      accountType: 'Planillas & Nóminas',
      initial: 950000.00,
      credits: 650200.00,
      debits: 529749.50,
      final: 1070450.50,
      change: 120450.50,
      changePct: 12.6,
      country: 'GT',
      reconciled: true,
      status: 'Cuadrada'
    },
    {
      bank: 'Banco Industrial',
      bankKey: 'Banco Industrial',
      account: '004-331092-1',
      accountType: 'Recaudaciones Agencias',
      initial: 800000.00,
      credits: 400000.00,
      debits: 300000.00,
      final: 900000.00,
      change: 100000.00,
      changePct: 12.5,
      country: 'GT',
      reconciled: true,
      status: 'Cuadrada'
    },
    {
      bank: 'Banco G&T Continental',
      bankKey: 'Banco G&T Continental',
      account: '01-002931-4',
      accountType: 'Operativa Central',
      initial: 1850000.00,
      credits: 1300500.00,
      debits: 980380.00,
      final: 2170120.00,
      change: 320120.00,
      changePct: 17.3,
      country: 'GT',
      reconciled: true,
      status: 'Cuadrada'
    },
    {
      bank: 'Banco G&T Continental',
      bankKey: 'Banco G&T Continental',
      account: '01-558291-8',
      accountType: 'Proveedores & Servicios',
      initial: 1000000.00,
      credits: 800000.00,
      debits: 560000.00,
      final: 1240000.00,
      change: 240000.00,
      changePct: 24.0,
      country: 'GT',
      reconciled: true,
      status: 'Cuadrada'
    },
    {
      bank: 'Banrural',
      bankKey: 'Banrural',
      account: '3033-01928-1',
      accountType: 'Cobros Departamentales',
      initial: 1280000.00,
      credits: 950000.00,
      debits: 829199.80,
      final: 1400800.20,
      change: 120800.20,
      changePct: 9.4,
      country: 'GT',
      reconciled: true,
      status: 'Cuadrada'
    },
    {
      bank: 'Banrural',
      bankKey: 'Banrural',
      account: '3033-99482-6',
      accountType: 'Fondo de Reserva',
      initial: 700000.00,
      credits: 500000.00,
      debits: 450000.00,
      final: 750000.00,
      change: 50000.00,
      changePct: 7.1,
      country: 'GT',
      reconciled: true,
      status: 'Cuadrada'
    },
    {
      bank: 'BAC Credomatic Guatemala',
      bankKey: 'BAC Credomatic Guatemala',
      account: '90-28194-0',
      accountType: 'POS & E-Commerce',
      initial: 1200000.00,
      credits: 980000.00,
      debits: 805480.00,
      final: 1374520.00,
      change: 174520.00,
      changePct: 14.5,
      country: 'GT',
      reconciled: true,
      status: 'Cuadrada'
    }
  ];

  const gtDaily: DailyFlowItem[] = [
    { date: '2026-11-01', count: 48, debits: 280000.00, credits: 420000.00, net: 140000.00 },
    { date: '2026-11-02', count: 62, debits: 395000.00, credits: 610000.00, net: 215000.00 },
    { date: '2026-11-03', count: 54, debits: 320000.00, credits: 490000.00, net: 170000.00 },
    { date: '2026-11-04', count: 71, debits: 450000.00, credits: 580000.00, net: 130000.00 },
    { date: '2026-11-05', count: 65, debits: 380000.00, credits: 640000.00, net: 260000.00 },
    { date: '2026-11-06', count: 83, debits: 510000.00, credits: 720000.00, net: 210000.00 },
    { date: '2026-11-07', count: 59, debits: 340000.00, credits: 490000.00, net: 150000.00 },
    { date: '2026-11-08', count: 42, debits: 290000.00, credits: 380000.00, net: 90000.00 },
    { date: '2026-11-09', count: 88, debits: 580000.00, credits: 890000.00, net: 310000.00 },
    { date: '2026-11-10', count: 94, debits: 620000.00, credits: 910000.00, net: 290000.00 },
    { date: '2026-11-11', count: 76, debits: 490000.00, credits: 690200.00, net: 200200.00 }
  ];

  const gtTotals = {
    initial: 10280000.00,
    final: 12055890.70,
    change: 1775890.70,
    changePct: 17.27,
    credits: 7680700.00,
    debits: 5904809.30,
    netFlow: 1775890.70
  };

  const gtData: CountryBaseData = {
    meta: {
      file: 'Reporte_Bancario_Consolidado_GT.xlsx',
      fileCut: '01 Nov 2026 — 11 Nov 2026',
      latestMovement: '11 Nov 2026',
      currency: 'GTQ',
      symbol: 'Q',
      country: 'GT',
      countryName: 'Guatemala',
      countryFlag: '🇬🇹',
      accounts: gtAccounts.length,
      banks: gtBanks.length,
      movementCount: 742,
      minDate: '2026-11-01',
      maxDate: '2026-11-11'
    },
    totals: gtTotals,
    banks: gtBanks,
    accounts: gtAccounts,
    daily: gtDaily
  };

  // 2. EL SALVADOR (USD / $)
  const svBanks: BankData[] = [
    {
      key: 'Banco Agrícola',
      name: 'Banco Agrícola',
      color: '#0072CE',
      initial: 580000.00,
      final: 715400.00,
      credits: 420000.00,
      debits: 284600.00,
      netFlow: 135400.00,
      share: 45.2,
      accountsCount: 2,
      country: 'SV'
    },
    {
      key: 'Banco Cuscatlán',
      name: 'Banco Cuscatlán',
      color: '#C8102E',
      initial: 390000.00,
      final: 472850.00,
      credits: 295000.00,
      debits: 212150.00,
      netFlow: 82850.00,
      share: 29.9,
      accountsCount: 2,
      country: 'SV'
    },
    {
      key: 'BAC El Salvador',
      name: 'BAC El Salvador',
      color: '#E30613',
      initial: 240000.00,
      final: 289200.00,
      credits: 180000.00,
      debits: 130800.00,
      netFlow: 49200.00,
      share: 18.3,
      accountsCount: 1,
      country: 'SV'
    },
    {
      key: 'Banco Davivienda',
      name: 'Banco Davivienda',
      color: '#ED1C24',
      initial: 95000.00,
      final: 104500.00,
      credits: 65000.00,
      debits: 55500.00,
      netFlow: 9500.00,
      share: 6.6,
      accountsCount: 1,
      country: 'SV'
    }
  ];

  const svAccounts: AccountData[] = [
    {
      bank: 'Banco Agrícola',
      bankKey: 'Banco Agrícola',
      account: '500-109283-0',
      accountType: 'Corriente Corporativa',
      initial: 380000.00,
      credits: 290000.00,
      debits: 194600.00,
      final: 475400.00,
      change: 95400.00,
      changePct: 25.1,
      country: 'SV',
      reconciled: true,
      status: 'Cuadrada'
    },
    {
      bank: 'Banco Agrícola',
      bankKey: 'Banco Agrícola',
      account: '500-884102-1',
      accountType: 'Operaciones Especiales',
      initial: 200000.00,
      credits: 130000.00,
      debits: 90000.00,
      final: 240000.00,
      change: 40000.00,
      changePct: 20.0,
      country: 'SV',
      reconciled: true,
      status: 'Cuadrada'
    },
    {
      bank: 'Banco Cuscatlán',
      bankKey: 'Banco Cuscatlán',
      account: '020-001928-4',
      accountType: 'Recaudaciones San Salvador',
      initial: 260000.00,
      credits: 195000.00,
      debits: 142150.00,
      final: 312850.00,
      change: 52850.00,
      changePct: 20.3,
      country: 'SV',
      reconciled: true,
      status: 'Cuadrada'
    },
    {
      bank: 'Banco Cuscatlán',
      bankKey: 'Banco Cuscatlán',
      account: '020-558291-7',
      accountType: 'Proveedores Nacionales',
      initial: 130000.00,
      credits: 100000.00,
      debits: 70000.00,
      final: 160000.00,
      change: 30000.00,
      changePct: 23.1,
      country: 'SV',
      reconciled: true,
      status: 'Cuadrada'
    },
    {
      bank: 'BAC El Salvador',
      bankKey: 'BAC El Salvador',
      account: '110-394812-9',
      accountType: 'Adquirencia Tarjetas',
      initial: 240000.00,
      credits: 180000.00,
      debits: 130800.00,
      final: 289200.00,
      change: 49200.00,
      changePct: 20.5,
      country: 'SV',
      reconciled: true,
      status: 'Cuadrada'
    },
    {
      bank: 'Banco Davivienda',
      bankKey: 'Banco Davivienda',
      account: '040-928192-3',
      accountType: 'Fondo de Giro',
      initial: 95000.00,
      credits: 65000.00,
      debits: 55500.00,
      final: 104500.00,
      change: 9500.00,
      changePct: 10.0,
      country: 'SV',
      reconciled: true,
      status: 'Cuadrada'
    }
  ];

  const svDaily: DailyFlowItem[] = [
    { date: '2026-11-01', count: 28, debits: 35000.00, credits: 52000.00, net: 17000.00 },
    { date: '2026-11-02', count: 35, debits: 48000.00, credits: 74000.00, net: 26000.00 },
    { date: '2026-11-03', count: 31, debits: 42000.00, credits: 61000.00, net: 19000.00 },
    { date: '2026-11-04', count: 44, debits: 59000.00, credits: 78000.00, net: 19000.00 },
    { date: '2026-11-05', count: 39, debits: 49000.00, credits: 82000.00, net: 33000.00 },
    { date: '2026-11-06', count: 51, debits: 67000.00, credits: 94000.00, net: 27000.00 },
    { date: '2026-11-07', count: 38, debits: 44000.00, credits: 65000.00, net: 21000.00 },
    { date: '2026-11-08', count: 25, debits: 36000.00, credits: 48000.00, net: 12000.00 },
    { date: '2026-11-09', count: 56, debits: 74000.00, credits: 112000.00, net: 38000.00 },
    { date: '2026-11-10', count: 60, debits: 81000.00, credits: 118000.00, net: 37000.00 },
    { date: '2026-11-11', count: 46, debits: 63050.00, credits: 91000.00, net: 27950.00 }
  ];

  const svTotals = {
    initial: 1305000.00,
    final: 1581950.00,
    change: 276950.00,
    changePct: 21.22,
    credits: 960000.00,
    debits: 683050.00,
    netFlow: 276950.00
  };

  const svData: CountryBaseData = {
    meta: {
      file: 'Reporte_Bancario_Consolidado_SV.xlsx',
      fileCut: '01 Nov 2026 — 11 Nov 2026',
      latestMovement: '11 Nov 2026',
      currency: 'USD',
      symbol: '$',
      country: 'SV',
      countryName: 'El Salvador',
      countryFlag: '🇸🇻',
      accounts: svAccounts.length,
      banks: svBanks.length,
      movementCount: 452,
      minDate: '2026-11-01',
      maxDate: '2026-11-11'
    },
    totals: svTotals,
    banks: svBanks,
    accounts: svAccounts,
    daily: svDaily
  };

  // 3. CONSOLIDADO REGIONAL (GLOBAL - Converted to USD)
  const gtInitialInUsd = gtTotals.initial / rate;
  const gtFinalInUsd = gtTotals.final / rate;
  const gtCreditsInUsd = gtTotals.credits / rate;
  const gtDebitsInUsd = gtTotals.debits / rate;
  const gtNetInUsd = gtTotals.netFlow / rate;

  const globalTotals = {
    initial: Math.round((gtInitialInUsd + svTotals.initial) * 100) / 100,
    final: Math.round((gtFinalInUsd + svTotals.final) * 100) / 100,
    change: Math.round((gtNetInUsd + svTotals.change) * 100) / 100,
    changePct: Math.round((((gtFinalInUsd + svTotals.final) - (gtInitialInUsd + svTotals.initial)) / (gtInitialInUsd + svTotals.initial)) * 1000) / 10,
    credits: Math.round((gtCreditsInUsd + svTotals.credits) * 100) / 100,
    debits: Math.round((gtDebitsInUsd + svTotals.debits) * 100) / 100,
    netFlow: Math.round((gtNetInUsd + svTotals.netFlow) * 100) / 100
  };

  const globalBanks: BankData[] = [
    ...gtBanks.map(b => ({
      ...b,
      initial: Math.round((b.initial / rate) * 100) / 100,
      final: Math.round((b.final / rate) * 100) / 100,
      credits: Math.round((b.credits / rate) * 100) / 100,
      debits: Math.round((b.debits / rate) * 100) / 100,
      netFlow: Math.round((b.netFlow / rate) * 100) / 100,
      name: `${b.name} (GT)`,
      share: Math.round(((b.final / rate) / globalTotals.final) * 1000) / 10
    })),
    ...svBanks.map(b => ({
      ...b,
      name: `${b.name} (SV)`,
      share: Math.round((b.final / globalTotals.final) * 1000) / 10
    }))
  ];

  const globalAccounts: AccountData[] = [
    ...gtAccounts.map(a => ({
      ...a,
      bank: `${a.bank} (GT)`,
      initial: Math.round((a.initial / rate) * 100) / 100,
      final: Math.round((a.final / rate) * 100) / 100,
      credits: Math.round((a.credits / rate) * 100) / 100,
      debits: Math.round((a.debits / rate) * 100) / 100,
      change: Math.round((a.change / rate) * 100) / 100
    })),
    ...svAccounts.map(a => ({
      ...a,
      bank: `${a.bank} (SV)`
    }))
  ];

  const globalDaily: DailyFlowItem[] = gtDaily.map((gItem, idx) => {
    const sItem = svDaily[idx] || { debits: 0, credits: 0, net: 0, count: 0 };
    const debitsUsd = (gItem.debits / rate) + sItem.debits;
    const creditsUsd = (gItem.credits / rate) + sItem.credits;
    return {
      date: gItem.date,
      count: gItem.count + sItem.count,
      debits: Math.round(debitsUsd * 100) / 100,
      credits: Math.round(creditsUsd * 100) / 100,
      net: Math.round((creditsUsd - debitsUsd) * 100) / 100
    };
  });

  const globalData: CountryBaseData = {
    meta: {
      file: 'Consolidado_Regional_RED_INTELFON.xlsx',
      fileCut: '01 Nov 2026 — 11 Nov 2026',
      latestMovement: '11 Nov 2026',
      currency: 'USD',
      symbol: '$',
      country: 'GLOBAL',
      countryName: 'Consolidado Regional',
      countryFlag: '🌎',
      accounts: globalAccounts.length,
      banks: globalBanks.length,
      movementCount: 1194,
      minDate: '2026-11-01',
      maxDate: '2026-11-11'
    },
    totals: globalTotals,
    banks: globalBanks,
    accounts: globalAccounts,
    daily: globalDaily
  };

  return {
    GT: gtData,
    SV: svData,
    GLOBAL: globalData,
    rate,
    updatedAt: new Date().toISOString(),
    executionId: 'DEMO-INIT-INTELFON'
  };
}

export function saveCurrentReport(payload: FullReportPayload) {
  try {
    localStorage.setItem(STORAGE_REPORT_KEY, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent('intelfon-report-updated', { detail: { key: STORAGE_REPORT_KEY, value: payload } }));
  } catch (err) {
    console.error('Error guardando reporte en localStorage:', err);
  }
}

export function loadCurrentReport(): FullReportPayload {
  try {
    const raw = localStorage.getItem(STORAGE_REPORT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.GT && parsed.SV && parsed.GLOBAL) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error leyendo reporte de localStorage:', err);
  }
  const initial = generateSeedData();
  saveCurrentReport(initial);
  return initial;
}

export function clearCurrentReport() {
  try {
    localStorage.removeItem(STORAGE_REPORT_KEY);
    localStorage.removeItem('intelfon_processing_id');
    const fresh = generateSeedData();
    saveCurrentReport(fresh);
    return fresh;
  } catch (_) {
    return generateSeedData();
  }
}

/**
 * Parses client-side Excel file (.xlsx) directly with SheetJS
 */
export async function parseExcelClientSide(file: File): Promise<Partial<CountryBaseData>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Find sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (!jsonRows || jsonRows.length === 0) {
          throw new Error('El archivo Excel no contiene filas procesables.');
        }

        // Detect country from filename or content
        const fileName = file.name.toLowerCase();
        const isSV = fileName.includes('salvador') || fileName.includes('sv');
        const countryCode: CountryCode = isSV ? 'SV' : 'GT';
        const currency = isSV ? 'USD' : 'GTQ';
        const symbol = isSV ? '$' : 'Q';

        // Extract accounts and banks
        const accountsMap: AccountData[] = [];
        const banksMap: Record<string, BankData> = {};

        jsonRows.forEach((row, idx) => {
          const bankName = String(
            row['Banco'] || row['banco'] || row['Bank'] || row['Nombre_Banco'] || row['Entidad'] || `Banco ${idx + 1}`
          ).trim();

          const accNum = String(
            row['Cuenta'] || row['cuenta'] || row['No_Cuenta'] || row['Numero_Cuenta'] || row['Account'] || `CTA-${1000 + idx}`
          ).trim();

          const initial = Number(row['Saldo_Inicial'] || row['saldo_inicial'] || row['Saldo Inicial'] || row['Initial_Balance']) || 0;
          const credits = Number(row['Total_Ingresos'] || row['Creditos'] || row['creditos'] || row['Ingresos'] || row['Credits']) || 0;
          const debits = Number(row['Total_Egresos'] || row['Debitos'] || row['debitos'] || row['Egresos'] || row['Debits']) || 0;
          const finalVal = row['Saldo_Final'] || row['saldo_final'] || row['Saldo Final'];
          const final = finalVal !== undefined ? Number(finalVal) : (initial + credits - debits);

          accountsMap.push({
            bank: bankName,
            bankKey: bankName,
            account: accNum,
            accountType: row['Tipo_Cuenta'] || row['Tipo'] || 'Monetaria',
            initial,
            credits,
            debits,
            final,
            change: final - initial,
            changePct: initial !== 0 ? ((final - initial) / Math.abs(initial)) * 100 : 0,
            country: countryCode,
            reconciled: true,
            status: 'Cuadrada'
          });

          if (!banksMap[bankName]) {
            const colors = ['#0033A0', '#E30613', '#00843D', '#DC2626', '#0072CE', '#C8102E'];
            banksMap[bankName] = {
              key: bankName,
              name: bankName,
              color: colors[Object.keys(banksMap).length % colors.length],
              initial: 0,
              final: 0,
              credits: 0,
              debits: 0,
              netFlow: 0,
              share: 0,
              accountsCount: 0,
              country: countryCode
            };
          }

          banksMap[bankName].initial += initial;
          banksMap[bankName].final += final;
          banksMap[bankName].credits += credits;
          banksMap[bankName].debits += debits;
          banksMap[bankName].netFlow += (credits - debits);
          banksMap[bankName].accountsCount += 1;
        });

        const totalFinal = Object.values(banksMap).reduce((acc, b) => acc + b.final, 0) || 1;
        const banksList = Object.values(banksMap).map(b => ({
          ...b,
          share: Math.round((b.final / totalFinal) * 1000) / 10
        }));

        const totalInitial = accountsMap.reduce((acc, a) => acc + a.initial, 0);
        const totalCredits = accountsMap.reduce((acc, a) => acc + a.credits, 0);
        const totalDebits = accountsMap.reduce((acc, a) => acc + a.debits, 0);
        const totalEnd = accountsMap.reduce((acc, a) => acc + a.final, 0);

        resolve({
          meta: {
            file: file.name,
            fileCut: 'Archivo cargado recientemente',
            latestMovement: new Date().toLocaleDateString('es-GT'),
            currency,
            symbol,
            country: countryCode,
            countryName: countryCode === 'GT' ? 'Guatemala' : 'El Salvador',
            countryFlag: countryCode === 'GT' ? '🇬🇹' : '🇸🇻',
            accounts: accountsMap.length,
            banks: banksList.length,
            movementCount: jsonRows.length
          },
          totals: {
            initial: totalInitial,
            final: totalEnd,
            change: totalEnd - totalInitial,
            changePct: totalInitial !== 0 ? ((totalEnd - totalInitial) / Math.abs(totalInitial)) * 100 : 0,
            credits: totalCredits,
            debits: totalDebits,
            netFlow: totalCredits - totalDebits
          },
          banks: banksList,
          accounts: accountsMap
        });
      } catch (err: any) {
        reject(new Error(err?.message || 'Error procesando archivo Excel.'));
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo.'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Exports current dashboard view to a real formatted Excel (.xlsx) file
 */
export function exportReportToExcel(data: CountryBaseData, filename = 'Reporte_Bancario_INTELFON.xlsx') {
  const wb = XLSX.utils.book_new();

  // 1. Sheet Resumen
  const resumenRows = [
    ['RED INTELFON - REPORTE DE CONCILIACIÓN BANCARIA'],
    ['País / Región:', `${data.meta.countryName} (${data.meta.country})`],
    ['Moneda:', `${data.meta.currency} (${data.meta.symbol})`],
    ['Fecha de Generación:', new Date().toLocaleString()],
    ['Archivo Origen:', data.meta.file],
    ['Cuentas Auditadas:', data.meta.accounts],
    ['Bancos Auditados:', data.meta.banks],
    [],
    ['MÉTRICAS CONSOLIDADAS', 'VALOR'],
    ['Saldo Inicial:', data.totals.initial],
    ['Total Créditos (Ingresos):', data.totals.credits],
    ['Total Débitos (Egresos):', data.totals.debits],
    ['Flujo Neto del Período:', data.totals.netFlow],
    ['Saldo Final Disponible:', data.totals.final],
    ['Variación Porcentual:', `${data.totals.changePct}%`]
  ];
  const wsResumen = XLSX.utils.aoa_to_sheet(resumenRows);
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen Ejecutivo');

  // 2. Sheet Detalle por Banco
  const bancoRows = [
    ['Entidad Bancaria', 'País', 'Cuentas', 'Saldo Inicial', 'Créditos', 'Débitos', 'Flujo Neto', 'Saldo Final', '% Participación'],
    ...data.banks.map(b => [
      b.name,
      b.country,
      b.accountsCount,
      b.initial,
      b.credits,
      b.debits,
      b.netFlow,
      b.final,
      `${b.share}%`
    ])
  ];
  const wsBancos = XLSX.utils.aoa_to_sheet(bancoRows);
  XLSX.utils.book_append_sheet(wb, wsBancos, 'Detalle por Banco');

  // 3. Sheet Detalle de Cuentas
  const cuentasRows = [
    ['Entidad Bancaria', 'Número de Cuenta', 'Tipo', 'Saldo Inicial', 'Créditos (+)', 'Débitos (-)', 'Saldo Final', 'Diferencia', 'Estado'],
    ...data.accounts.map(a => [
      a.bank,
      a.account,
      a.accountType || 'Monetaria',
      a.initial,
      a.credits,
      a.debits,
      a.final,
      a.change,
      a.status || 'Cuadrada'
    ])
  ];
  const wsCuentas = XLSX.utils.aoa_to_sheet(cuentasRows);
  XLSX.utils.book_append_sheet(wb, wsCuentas, 'Detalle de Cuentas');

  // 4. Sheet Flujo Diario
  if (data.daily && data.daily.length > 0) {
    const dailyRows = [
      ['Fecha', 'Movimientos', 'Débitos (Egresos)', 'Créditos (Ingresos)', 'Flujo Neto'],
      ...data.daily.map(d => [
        d.date,
        d.count,
        d.debits,
        d.credits,
        d.net
      ])
    ];
    const wsDaily = XLSX.utils.aoa_to_sheet(dailyRows);
    XLSX.utils.book_append_sheet(wb, wsDaily, 'Flujo Diario');
  }

  XLSX.writeFile(wb, filename);
}
