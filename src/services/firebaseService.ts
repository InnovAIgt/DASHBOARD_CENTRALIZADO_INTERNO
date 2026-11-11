import { CONFIG } from '../config/env';

export interface SyncState {
  connected: boolean;
  lastUpdated: string;
  lastExecutionId?: string;
}

export const FirebaseService = {
  getBaseUrl(): string {
    return CONFIG.FIREBASE.databaseURL.replace(/\/$/, '');
  },

  async getReportesFinalizados(): Promise<any> {
    try {
      const url = `${this.getBaseUrl()}/intelfon_sync/reportes_finalizados.json`;
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn('[FirebaseService] Error consultando Firebase:', err);
      return null;
    }
  },

  async updateCountryStatus(country: 'GT' | 'SV', data: any): Promise<boolean> {
    try {
      const url = `${this.getBaseUrl()}/intelfon_sync/status_${country.toLowerCase()}.json`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          timestamp: new Date().toISOString()
        })
      });
      return res.ok;
    } catch (err) {
      console.warn('[FirebaseService] Error escribiendo en Firebase:', err);
      return false;
    }
  },

  async checkConnection(): Promise<boolean> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/.json?shallow=true`, { method: 'GET' });
      return res.ok;
    } catch (_) {
      return false;
    }
  }
};
