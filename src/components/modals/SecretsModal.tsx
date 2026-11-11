import React, { useState } from 'react';
import {
  X,
  KeyRound,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Save,
  RotateCcw,
  RefreshCw,
  Terminal
} from 'lucide-react';
import { CONFIG, saveEnvOverrides, getEnvOverrides } from '../../config/env';
import { FirebaseService } from '../../services/firebaseService';

interface SecretsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecretsModal: React.FC<SecretsModalProps> = ({ isOpen, onClose }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const initialOverrides = getEnvOverrides();
  const [makeUrl, setMakeUrl] = useState(initialOverrides.VITE_MAKE_WEBHOOK_URL || CONFIG.MAKE_WEBHOOK_URL);
  const [historyUrl, setHistoryUrl] = useState(initialOverrides.VITE_HISTORY_WEBHOOK_URL || CONFIG.HISTORY_WEBHOOK_URL);
  const [fbApiKey, setFbApiKey] = useState(initialOverrides.VITE_FIREBASE_API_KEY || CONFIG.FIREBASE.apiKey);
  const [fbDbUrl, setFbDbUrl] = useState(initialOverrides.VITE_FIREBASE_DATABASE_URL || CONFIG.FIREBASE.databaseURL);
  const [fbProjectId, setFbProjectId] = useState(initialOverrides.VITE_FIREBASE_PROJECT_ID || CONFIG.FIREBASE.projectId);
  const [rateVal, setRateVal] = useState(initialOverrides.VITE_EXCHANGE_RATE_GTQ_USD || String(CONFIG.DEFAULT_EXCHANGE_RATE));

  if (!isOpen) return null;

  const secretsList = [
    {
      group: 'SAP API (FACTURACIÓN, INVENTARIO & ÓRDENES)',
      description: 'API corporativa de SAP para facturas emitidas, inventario por artículo y órdenes de compra',
      vars: [
        {
          key: 'VITE_SAP_API_KEY',
          value: 'fdf0cb340b00402c00a057b0f67c00a3',
          label: 'SAP X-API-KEY',
          usage: 'Encabezado X-API-KEY enviado a https://sapapi.red.com.sv/api/'
        },
        {
          key: 'VITE_SAP_API_URL',
          value: 'https://sapapi.red.com.sv/api',
          label: 'SAP API Base URL',
          usage: 'Servicio de integración SAP para Guatemala y El Salvador'
        }
      ]
    },
    {
      group: 'WORKFLOW RED (VENTAS & ACTIVACIONES)',
      description: 'API de preofertas, radicaciones y etapas de activación operativa',
      vars: [
        {
          key: 'VITE_WORKFLOW_API_KEY',
          value: 'b5a71fed3be962e1030da90406158807dccd6784640232a96a32567a818d1d5b',
          label: 'Workflow Bearer & X-API-KEY',
          usage: 'Token de autorización para https://workflow.red.com.gt/api/'
        },
        {
          key: 'VITE_WORKFLOW_API_URL',
          value: 'https://workflow.red.com.gt/api/integraciones/dashboard/preofertas',
          label: 'Endpoint Preofertas',
          usage: 'Lectura de preofertas y activaciones operativas'
        }
      ]
    },
    {
      group: 'SUPABASE BASES DE DATOS & CRM',
      description: 'Instancias de Supabase para Flujo de Ventas, Store Clientes y SAC',
      vars: [
        {
          key: 'VITE_MARKETING_SUPABASE_KEY',
          value: 'sb_publishable_0ecGBq2zksBqqhIU3kaf8g_JqzUa-47',
          label: 'Supabase Key (Flujo de Ventas)',
          usage: 'Lectura de bitácora y leads comerciales en wciyhyyjdpaavbzlwikl.supabase.co'
        },
        {
          key: 'VITE_CLIENTES_SUPABASE_KEY',
          value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdydWx0YXhheGJjcnV6b2VsamxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3NTQ3NzUsImV4cCI6MjEwNzMzMDc3NX0.ztwf9manF8h5JtVxqLnEc48tZ3r95iUjz2SwUw0HW6M',
          label: 'Supabase Key (Store Clientes)',
          usage: 'RPC tablero_cumplimiento_safe en grultaxaxbcruzoeljld.supabase.co'
        }
      ]
    },
    {
      group: 'MARKETING & CORREO (BREVO)',
      description: 'Claves para integración directa con campañas de mailing y newsletters',
      vars: [
        {
          key: 'VITE_BREVO_API_KEY',
          value: '(Configura tu API Key de Brevo en Vercel)',
          label: 'Brevo API Key (Mailing Campañas)',
          usage: 'Clave REST API para ingesta y lectura directa de reportes y listas Brevo'
        }
      ]
    },
    {
      group: 'FIREBASE REALTIME DATABASE',
      description: 'Credenciales de base de datos para sincronización en vivo entre Guatemala y El Salvador',
      vars: [
        {
          key: 'VITE_FIREBASE_API_KEY',
          value: fbApiKey,
          label: 'Firebase Web API Key',
          usage: 'Identificación de la aplicación cliente en Google Firebase'
        },
        {
          key: 'VITE_FIREBASE_DATABASE_URL',
          value: fbDbUrl,
          label: 'Firebase Database URL (RTDB)',
          usage: 'Instancia de Realtime Database para sincronización cross-country'
        },
        {
          key: 'VITE_FIREBASE_PROJECT_ID',
          value: fbProjectId,
          label: 'Firebase Project ID',
          usage: 'Identificador del proyecto Firebase'
        },
        {
          key: 'VITE_FIREBASE_AUTH_DOMAIN',
          value: CONFIG.FIREBASE.authDomain,
          label: 'Firebase Auth Domain',
          usage: 'Dominio de autenticación Firebase'
        },
        {
          key: 'VITE_FIREBASE_STORAGE_BUCKET',
          value: CONFIG.FIREBASE.storageBucket,
          label: 'Firebase Storage Bucket',
          usage: 'Bucket para almacenamiento de archivos temporales'
        },
        {
          key: 'VITE_FIREBASE_APP_ID',
          value: CONFIG.FIREBASE.appId,
          label: 'Firebase App ID',
          usage: 'Identificador de la app web'
        }
      ]
    },
    {
      group: 'TASA DE CAMBIO & CREDENCIALES',
      description: 'Parámetros financieros corporativos y passwords maestros',
      vars: [
        {
          key: 'VITE_EXCHANGE_RATE_GTQ_USD',
          value: rateVal,
          label: 'Tasa Oficial GTQ a USD',
          usage: 'Tipo de cambio para homologar montos de Guatemala en Consolidado Regional'
        },
        {
          key: 'VITE_MASTER_PASSWORD',
          value: CONFIG.AUTH.masterPassword,
          label: 'Contraseña Master Global (intelfon)',
          usage: 'Clave para el superadministrador con acceso total y gestión de usuarios'
        },
        {
          key: 'VITE_MASTER_GT_PASSWORD',
          value: CONFIG.AUTH.masters[0].password,
          label: 'Contraseña Master Guatemala (masterguatemala)',
          usage: 'Clave para el administrador regional de Guatemala'
        },
        {
          key: 'VITE_MASTER_SV_PASSWORD',
          value: CONFIG.AUTH.masters[1].password,
          label: 'Contraseña Master El Salvador (mastersalvador)',
          usage: 'Clave para el administrador regional de El Salvador'
        }
      ]
    }
  ];

  const handleCopySingle = (key: string, val: string) => {
    navigator.clipboard.writeText(`${key}=${val}`);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopyAll = () => {
    const lines = secretsList.flatMap(group => [
      `# ${group.group}`,
      ...group.vars.map(v => `${v.key}="${v.value}"`),
      ''
    ]).join('\n');

    navigator.clipboard.writeText(lines);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const handleSaveOverrides = () => {
    saveEnvOverrides({
      VITE_MAKE_WEBHOOK_URL: makeUrl,
      VITE_HISTORY_WEBHOOK_URL: historyUrl,
      VITE_FIREBASE_API_KEY: fbApiKey,
      VITE_FIREBASE_DATABASE_URL: fbDbUrl,
      VITE_FIREBASE_PROJECT_ID: fbProjectId,
      VITE_EXCHANGE_RATE_GTQ_USD: rateVal
    });
    alert('Variables guardadas en el navegador. La aplicación las usará inmediatamente.');
  };

  const handleResetDefaults = () => {
    localStorage.removeItem('intelfon_env_overrides');
    setMakeUrl(CONFIG.MAKE_WEBHOOK_URL);
    setHistoryUrl(CONFIG.HISTORY_WEBHOOK_URL);
    setFbApiKey(CONFIG.FIREBASE.apiKey);
    setFbDbUrl(CONFIG.FIREBASE.databaseURL);
    setFbProjectId(CONFIG.FIREBASE.projectId);
    setRateVal(String(CONFIG.DEFAULT_EXCHANGE_RATE));
    alert('Restablecido a las variables por defecto del repositorio.');
  };

  const handleTestEndpoints = async () => {
    setTesting(true);
    setTestResult('Probando conexiones con Make y Firebase...');
    try {
      const fbOk = await FirebaseService.checkConnection();
      let historyStatus = 'No probado';
      try {
        const hRes = await fetch(historyUrl, { method: 'GET' });
        historyStatus = hRes.ok ? `OK (HTTP ${hRes.status})` : `HTTP ${hRes.status}`;
      } catch (e: any) {
        historyStatus = `Error red: ${e?.message || 'CORS o endpoint inactivo'}`;
      }

      setTestResult(
        `Firebase RTDB: ${fbOk ? '✅ Conexión Exitosa' : '⚠️ Sin respuesta directa'} | Webhook Historial: ${historyStatus}`
      );
    } catch (e: any) {
      setTestResult(`Fallo en prueba: ${e?.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shadow-xs">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">
                Variables de Entorno & Secrets para Vercel
              </h3>
              <p className="text-xs text-slate-500">
                Listado consolidado de claves y webhooks extraídos para configuración en Vercel Project Settings.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Instructions banner */}
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 space-y-2">
            <div className="flex items-center space-x-2 font-bold text-sm">
              <Terminal className="w-4 h-4 text-blue-700" />
              <span>¿Cómo configurar estos Secrets en Vercel?</span>
            </div>
            <p className="text-xs leading-relaxed text-blue-800">
              1. En tu panel de <strong>Vercel</strong>, entra a tu proyecto y haz clic en <strong>Settings &rarr; Environment Variables</strong>.<br />
              2. Copia y pega las variables de la lista inferior. Al usar prefijo <code className="bg-blue-100 px-1 py-0.5 rounded font-mono font-bold">VITE_</code>, React Vite las expondrá de forma segura en tiempo de compilación.<br />
              3. Si deseas probar con tus propios webhooks directamente en este navegador sin re-desplegar, puedes editar los campos y presionar <strong>"Guardar en Navegador"</strong>.
            </p>
          </div>

          {/* Test connection result bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-700">Diagnóstico de Conectividad:</span>
              <span className="text-slate-600 font-mono text-[11px]">{testResult || 'Endpoints listos'}</span>
            </div>
            <button
              type="button"
              onClick={handleTestEndpoints}
              disabled={testing}
              className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:text-red-600 transition-colors flex items-center justify-center space-x-1 self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin text-red-600' : ''}`} />
              <span>Probar Endpoints</span>
            </button>
          </div>

          {/* Secrets Groups */}
          <div className="space-y-6">
            {secretsList.map((group) => (
              <div key={group.group} className="space-y-3">
                <div className="border-b border-slate-200 pb-1.5">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    {group.group}
                  </h4>
                  <p className="text-[11px] text-slate-400">{group.description}</p>
                </div>

                <div className="space-y-2.5">
                  {group.vars.map((v) => (
                    <div
                      key={v.key}
                      className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/90 space-y-1 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded text-xs">
                            {v.key}
                          </span>
                          <span className="text-slate-500 text-[11px] font-semibold">({v.label})</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCopySingle(v.key, v.value)}
                          className="flex items-center space-x-1 text-slate-500 hover:text-slate-900 font-semibold self-start sm:self-auto text-[11px]"
                          title="Copiar KEY=VALUE"
                        >
                          {copiedKey === v.key ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-600 font-bold">Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="p-2 bg-white rounded-lg border border-slate-200 font-mono text-[11px] text-slate-800 break-all select-all">
                        {v.value}
                      </div>

                      <p className="text-[10px] text-slate-400 italic">{v.usage}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleSaveOverrides}
              className="btn-intelfon-primary text-xs"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              <span>Guardar en Navegador</span>
            </button>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="btn-intelfon-secondary text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              <span>Restablecer</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleCopyAll}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5"
            >
              {copiedAll ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>¡Todo Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar Todo (.env para Vercel)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
