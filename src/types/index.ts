export type CountryCode = 'GT' | 'SV' | 'GLOBAL';

export type UserRole = 'master' | 'admin' | 'analyst';

export interface User {
  username: string;
  name: string;
  email: string;
  role: UserRole;
  region: CountryCode;
  password?: string;
  createdAt?: string;
  active?: boolean;
}

export interface BankData {
  key: string;
  name: string;
  color: string;
  initial: number;
  final: number;
  credits: number;
  debits: number;
  netFlow: number;
  share: number;
  accountsCount: number;
  country: CountryCode;
}

export interface AccountData {
  bank: string;
  bankKey: string;
  account: string;
  accountType?: string;
  initial: number;
  final: number;
  change: number;
  changePct: number;
  credits: number;
  debits: number;
  country: CountryCode;
  reconciled?: boolean;
  status?: string;
}

export interface DailyFlowItem {
  date: string;
  count: number;
  debits: number;
  credits: number;
  net: number;
}

export interface ReportMetadata {
  file: string;
  fileCut: string;
  latestMovement: string;
  currency: string;
  symbol: string;
  country: CountryCode;
  countryName: string;
  countryFlag: string;
  accounts: number;
  banks: number;
  movementCount: number;
  minDate?: string;
  maxDate?: string;
}

export interface ReportTotals {
  initial: number;
  final: number;
  change: number;
  changePct: number;
  credits: number;
  debits: number;
  netFlow: number;
}

export interface CountryBaseData {
  meta: ReportMetadata;
  totals: ReportTotals;
  banks: BankData[];
  accounts: AccountData[];
  daily: DailyFlowItem[];
}

export interface FullReportPayload {
  GT: CountryBaseData;
  SV: CountryBaseData;
  GLOBAL: CountryBaseData;
  rate: number;
  updatedAt: string;
  executionId?: string;
  rawResponse?: any;
}

export interface HistoryItem {
  id: string;
  fecha: string;
  nombreArchivo: string;
  tipo: string;
  estado: string;
  urlDescarga: string;
  country?: string;
  montoTotal?: number;
  raw?: any;
}

export type ViewType = 
  | 'overview' 
  | 'bank-detail' 
  | 'daily-flow' 
  | 'consolidacion-general' 
  | 'account-detail' 
  | 'generator' 
  | 'history' 
  | 'users';
