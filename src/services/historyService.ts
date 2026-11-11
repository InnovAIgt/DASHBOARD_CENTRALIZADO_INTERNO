import { CONFIG } from '../config/env';
import { HistoryItem } from '../types';

export const DEFAULT_HISTORY_ITEMS: HistoryItem[] = [
  {
    id: 'REP-GT-20261111-001',
    fecha: '2026-11-11 08:30:00',
    nombreArchivo: 'Conciliacion_Bancaria_Guatemala_Noviembre.xlsx',
    tipo: 'Bancario',
    estado: 'Completado',
    urlDescarga: '#',
    country: 'Guatemala (GT)',
    montoTotal: 12055890.70
  },
  {
    id: 'REP-SV-20261111-002',
    fecha: '2026-11-11 08:45:00',
    nombreArchivo: 'Conciliacion_Bancaria_El_Salvador_Noviembre.xlsx',
    tipo: 'Bancario',
    estado: 'Completado',
    urlDescarga: '#',
    country: 'El Salvador (SV)',
    montoTotal: 1581950.00
  },
  {
    id: 'REP-GLOBAL-20261110-098',
    fecha: '2026-11-10 18:00:00',
    nombreArchivo: 'Consolidado_Regional_GT_SV_Semana45.xlsx',
    tipo: 'Consolidado',
    estado: 'Completado',
    urlDescarga: '#',
    country: 'Regional (USD)',
    montoTotal: 3137548.80
  },
  {
    id: 'REP-GT-20261109-082',
    fecha: '2026-11-09 17:15:00',
    nombreArchivo: 'Cierre_Diario_GT_Bancos_09Nov.xlsx',
    tipo: 'Flujo Diario',
    estado: 'Completado',
    urlDescarga: '#',
    country: 'Guatemala (GT)',
    montoTotal: 11450200.00
  },
  {
    id: 'REP-SV-20261108-077',
    fecha: '2026-11-08 16:30:00',
    nombreArchivo: 'Cierre_Semanal_SV_Bancos_08Nov.xlsx',
    tipo: 'Bancario',
    estado: 'Completado',
    urlDescarga: '#',
    country: 'El Salvador (SV)',
    montoTotal: 1490200.00
  }
];

export async function obtenerHistorialReportes(): Promise<HistoryItem[]> {
  const endpoint = CONFIG.HISTORY_WEBHOOK_URL;
  if (!endpoint) {
    return DEFAULT_HISTORY_ITEMS;
  }

  try {
    const response = await fetch(endpoint, {
      method: 'GET'
    });

    if (!response.ok) {
      console.warn(`[HistoryService] HTTP ${response.status} de Make History, usando historial local.`);
      return DEFAULT_HISTORY_ITEMS;
    }

    const data = await response.json();
    const rawList = Array.isArray(data) ? data : (data.reportes || data.rows || data.data || []);

    if (!Array.isArray(rawList) || rawList.length === 0) {
      return DEFAULT_HISTORY_ITEMS;
    }

    return rawList.map((item: any, index: number) => {
      if (typeof item !== 'object' || item === null) {
        return {
          id: `REP-${String(index + 1).padStart(3, '0')}`,
          fecha: 'Reciente',
          nombreArchivo: 'Reporte.xlsx',
          tipo: 'Bancario',
          estado: 'Completado',
          urlDescarga: '#'
        };
      }

      const id = item.ID_Reporte || item.id || item.ID || item.Codigo || item.Id || item['ID Reporte'] || `REP-${String(index + 1).padStart(3, '0')}`;
      const fecha = item.Fecha || item.fecha || item.Fecha_Creacion || item.fecha_creacion || item.Date || item.date || item.timestamp || 'Reciente';
      const nombreArchivo = item.Nombre_Archivo || item.nombreArchivo || item.nombre || item.Archivo || item.archivo || item.Name || item.filename || 'Reporte_Bancario.xlsx';
      const estado = item.Estado || item.estado || item.Status || item.status || 'Completado';
      const urlDescarga = item.URL_Descarga || item.urlDescarga || item.url || item.link || item.downloadUrl || item.webViewLink || '#';
      const country = item.Pais || item.pais || item.Country || item.region || (nombreArchivo.toLowerCase().includes('sv') ? 'El Salvador (SV)' : 'Guatemala (GT)');

      return {
        id: String(id),
        fecha: String(fecha),
        nombreArchivo: String(nombreArchivo),
        tipo: item.Tipo || item.tipo || 'Bancario',
        estado: String(estado),
        urlDescarga: String(urlDescarga),
        country: String(country),
        montoTotal: Number(item.Monto || item.monto || item.total || 0),
        raw: item
      };
    });
  } catch (error) {
    console.warn('[HistoryService] Error obteniendo historial remoto, fallback a local:', error);
    return DEFAULT_HISTORY_ITEMS;
  }
}
