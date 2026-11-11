import { CONFIG } from '../config/env';
import { CountryCode } from '../types';

export interface SendMakeOptions {
  region: CountryCode;
  countryName: string;
  tipoReporte?: string;
  executionId?: string;
}

export interface MakeResponse {
  accepted?: boolean;
  asincrono?: boolean;
  estado?: string;
  mensaje?: string;
  ejecucion_id: string;
  execution_id: string;
  pais: string;
  region: string;
  archivosProcesados?: number;
  data?: any;
  bancosList?: any[];
  [key: string]: any;
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export function generateExecutionId(region: CountryCode): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const rnd = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `EXEC-${region}-${y}${m}${d}-${h}${min}-${rnd}`;
}

export async function enviarArchivosAMake(
  files: File[],
  options: SendMakeOptions
): Promise<MakeResponse> {
  const webhookUrl = CONFIG.MAKE_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error('La URL del Webhook de Make (CONFIG.MAKE_WEBHOOK_URL) no está configurada.');
  }

  if (!files || files.length === 0) {
    throw new Error('Debes seleccionar al menos un archivo Excel (.xlsx).');
  }

  const region = options.region === 'GLOBAL' ? 'GT' : options.region;
  const executionId = options.executionId || generateExecutionId(region);
  const tipoReporte = options.tipoReporte || 'bancario';

  // Read files to base64
  const payloadFiles = await Promise.all(
    files.map(async (file) => ({
      name: file.name,
      data: await readAsBase64(file),
      mimeType: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      pais: options.countryName,
      region,
      ejecucion_id: executionId
    }))
  );

  const formData = new FormData();
  formData.append('files', JSON.stringify(payloadFiles));
  formData.append('tipoReporte', tipoReporte);
  formData.append('pais', options.countryName);
  formData.append('region', region);
  formData.append('ejecucion_id', executionId);
  formData.append('execution_id', executionId);
  formData.append('cantidad_archivos', String(files.length));
  formData.append('origen', 'dashboard-intelfon-react');
  formData.append('fecha_envio', new Date().toISOString());

  try {
    // Try sending directly to Make Webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      body: formData
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`Error en Make (${response.status}): ${responseText || response.statusText}`);
    }

    const trimmed = responseText.trim();
    if (trimmed.toLowerCase() === 'accepted' || !trimmed) {
      return {
        accepted: true,
        asincrono: true,
        estado: 'procesando',
        mensaje: 'Make.com recibió los archivos y continúa procesando el reporte.',
        archivosProcesados: files.length,
        pais: options.countryName,
        region,
        ejecucion_id: executionId,
        execution_id: executionId
      };
    }

    try {
      const data = JSON.parse(trimmed);
      return {
        ...data,
        ejecucion_id: executionId,
        execution_id: executionId,
        pais: options.countryName,
        region
      };
    } catch (_) {
      return {
        accepted: true,
        asincrono: true,
        estado: 'procesando',
        mensaje: trimmed.substring(0, 300),
        archivosProcesados: files.length,
        pais: options.countryName,
        region,
        ejecucion_id: executionId,
        execution_id: executionId
      };
    }
  } catch (err: any) {
    console.error('[MakeService] Error comunicando con Make:', err);
    throw new Error(err?.message || 'Error de red al conectar con Make.com');
  }
}
