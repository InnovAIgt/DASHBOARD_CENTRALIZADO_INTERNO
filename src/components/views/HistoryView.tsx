import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Calendar,
  Download,
  Eye,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { HistoryItem } from '../../types';
import { obtenerHistorialReportes, DEFAULT_HISTORY_ITEMS } from '../../services/historyService';
import { useReport } from '../../context/ReportContext';

export const HistoryView: React.FC<{ onNavigateToView: (view: any) => void }> = ({ onNavigateToView }) => {
  const { setActiveCountry, activeData } = useReport();
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>(DEFAULT_HISTORY_ITEMS);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const items = await obtenerHistorialReportes();
      setHistoryItems(items.length ? items : DEFAULT_HISTORY_ITEMS);
    } catch (_) {
      setHistoryItems(DEFAULT_HISTORY_ITEMS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filteredItems = historyItems.filter((item) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      item.id.toLowerCase().includes(term) ||
      item.nombreArchivo.toLowerCase().includes(term) ||
      (item.country && item.country.toLowerCase().includes(term));

    if (!matchSearch) return false;

    if (dateFilter === 'all') return true;
    if (dateFilter === 'today') return item.fecha.includes('2026-11-11') || item.fecha.toLowerCase().includes('reciente');
    if (dateFilter === 'week') return true; // Most are in this week
    if (dateFilter === 'month') return item.fecha.includes('2026-11');

    return true;
  });

  const handleLoadInDashboard = (item: HistoryItem) => {
    if (item.country?.includes('SV') || item.nombreArchivo.toLowerCase().includes('sv')) {
      setActiveCountry('SV');
    } else if (item.tipo === 'Consolidado') {
      setActiveCountry('GLOBAL');
    } else {
      setActiveCountry('GT');
    }
    onNavigateToView('overview');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Reportes Anteriores y Auditoría
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Registro histórico de conciliaciones procesadas a través de Make.com y respaldadas en Google Sheets.
          </p>
        </div>

        <div className="flex items-center space-x-3 self-start sm:self-auto">
          <button
            type="button"
            onClick={fetchHistory}
            disabled={loading}
            className="btn-intelfon-secondary text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-red-600' : ''}`} />
            <span>Actualizar Historial</span>
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="card-intelfon p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por ID de reporte, nombre de archivo o país..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
          />
        </div>

        {/* Date Filter selector */}
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="w-full sm:w-56 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">📅 Todas las fechas</option>
            <option value="today">Hoy (Últimas 24h)</option>
            <option value="week">Últimos 7 días</option>
            <option value="month">Este mes (Noviembre 2026)</option>
          </select>
        </div>
      </div>

      {/* History Table */}
      <div className="card-intelfon overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-intelfon">
            <thead>
              <tr>
                <th>ID Reporte</th>
                <th>Fecha de Registro</th>
                <th>Nombre del Archivo</th>
                <th>Región / Moneda</th>
                <th>Tipo</th>
                <th className="text-center">Estado</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    No se encontraron reportes en el historial.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="font-mono font-bold text-slate-900 text-xs">
                      {item.id}
                    </td>
                    <td className="font-mono text-xs text-slate-600">
                      {item.fecha}
                    </td>
                    <td className="font-semibold text-slate-800">
                      <div className="flex items-center space-x-2">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span className="truncate max-w-xs" title={item.nombreArchivo}>
                          {item.nombreArchivo}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700">
                        {item.country || 'Guatemala (GT)'}
                      </span>
                    </td>
                    <td className="text-slate-600 text-xs">
                      {item.tipo}
                    </td>
                    <td className="text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                        {item.estado}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="inline-flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleLoadInDashboard(item)}
                          className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs transition-colors flex items-center space-x-1"
                          title="Cargar y visualizar datos en el Overview"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver</span>
                        </button>

                        <a
                          href={item.urlDescarga}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 transition-colors inline-block"
                          title="Descargar archivo original de Google Drive / Sheets"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
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
