/**
 * Centralized Configuration & Environment Variables
 * Extracts all secrets and endpoints for Vercel deployment and local execution.
 */

// Local storage key for runtime secrets overrides if tested in browser
const STORAGE_OVERRIDE_KEY = 'intelfon_env_overrides';

function getOverride(key: string, fallback: string): string {
  try {
    const raw = localStorage.getItem(STORAGE_OVERRIDE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed[key] && typeof parsed[key] === 'string' && parsed[key].trim()) {
        return parsed[key].trim();
      }
    }
  } catch (_) {}
  return fallback;
}

export function saveEnvOverrides(overrides: Record<string, string>) {
  try {
    localStorage.setItem(STORAGE_OVERRIDE_KEY, JSON.stringify(overrides));
  } catch (_) {}
}

export function getEnvOverrides(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_OVERRIDE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

export const CONFIG = {
  // Webhook principal de Make.com para procesamiento de archivos Excel
  MAKE_WEBHOOK_URL: getOverride(
    'VITE_MAKE_WEBHOOK_URL',
    import.meta.env.VITE_MAKE_WEBHOOK_URL || 'https://hook.eu2.make.com/uf2f68usry02c9ljgb8wcoy634ymbkcf'
  ),

  // Webhook de Make.com para consultar historial de reportes (Google Sheets / Notion)
  HISTORY_WEBHOOK_URL: getOverride(
    'VITE_HISTORY_WEBHOOK_URL',
    import.meta.env.VITE_HISTORY_WEBHOOK_URL || 'https://hook.eu2.make.com/fa2xcbqi6a9aupb9bby5wqp5wuelk9ea'
  ),

  // Tasa de cambio oficial / por defecto para consolidar GTQ a USD
  DEFAULT_EXCHANGE_RATE: Number(
    getOverride('VITE_EXCHANGE_RATE_GTQ_USD', import.meta.env.VITE_EXCHANGE_RATE_GTQ_USD || '7.75')
  ) || 7.75,

  // Firebase Realtime Database para sincronización entre Guatemala y El Salvador
  FIREBASE: {
    apiKey: getOverride('VITE_FIREBASE_API_KEY', import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAnh2AINDxk5Dqw7QXZ577mFfYAuR2j63E'),
    authDomain: getOverride('VITE_FIREBASE_AUTH_DOMAIN', import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'reportes-bancarios.firebaseapp.com'),
    databaseURL: getOverride('VITE_FIREBASE_DATABASE_URL', import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://reportes-bancarios-default-rtdb.firebaseio.com'),
    projectId: getOverride('VITE_FIREBASE_PROJECT_ID', import.meta.env.VITE_FIREBASE_PROJECT_ID || 'reportes-bancarios'),
    storageBucket: getOverride('VITE_FIREBASE_STORAGE_BUCKET', import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'reportes-bancarios.firebasestorage.app'),
    messagingSenderId: getOverride('VITE_FIREBASE_MESSAGING_SENDER_ID', import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '457368392091'),
    appId: getOverride('VITE_FIREBASE_APP_ID', import.meta.env.VITE_FIREBASE_APP_ID || '1:457368392091:web:0cb70fbb766bbdc5a6913e'),
    measurementId: getOverride('VITE_FIREBASE_MEASUREMENT_ID', import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-RX3B70LFWS')
  },

  // Identidad visual de RED INTELFON
  THEME: {
    primaryRed: '#DC2626',
    darkRed: '#B91C1C',
    accentBorder: '#E2E8F0',
    lightGray: '#F8FAFC'
  },

  // Regiones operativas
  REGIONS: {
    GLOBAL: {
      code: 'GLOBAL' as const,
      name: 'Consolidado Regional',
      flag: '🌎',
      currency: 'USD',
      currencySymbol: '$'
    },
    GT: {
      code: 'GT' as const,
      name: 'Guatemala',
      flag: '🇬🇹',
      currency: 'GTQ',
      currencySymbol: 'Q'
    },
    SV: {
      code: 'SV' as const,
      name: 'El Salvador',
      flag: '🇸🇻',
      currency: 'USD',
      currencySymbol: '$'
    }
  },

  // Credenciales predeterminadas para autenticación
  AUTH: {
    masterUsername: 'intelfon',
    masterEmail: 'admin@intelfon.com',
    masterPassword: import.meta.env.VITE_MASTER_PASSWORD || 'intelfon2026',
    sessionKey: 'intelfon_auth_session',
    usersListKey: 'intelfon_users_list',
    masters: [
      {
        username: 'masterguatemala',
        email: 'masterguatemala@intelfon.com',
        password: import.meta.env.VITE_MASTER_GT_PASSWORD || 'Guatemala2026',
        name: 'Master Guatemala',
        region: 'GT' as const,
        role: 'admin' as const
      },
      {
        username: 'mastersalvador',
        email: 'mastersalvador@intelfon.com',
        password: import.meta.env.VITE_MASTER_SV_PASSWORD || 'Salvador2026',
        name: 'Master El Salvador',
        region: 'SV' as const,
        role: 'admin' as const
      }
    ]
  }
};
