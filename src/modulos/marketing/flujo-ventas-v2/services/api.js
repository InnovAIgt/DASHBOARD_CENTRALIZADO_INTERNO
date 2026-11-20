// Copiado de InnovAIgt/DashboardLeads (Dashboard-Leds/src/services/api.js)
import { extractLeadRows, mapMeetingLead } from '../utils/leads.js'

const API_PATH = '/api/marketing/reuniones'
const PAGE_SIZE = 50

async function fetchPage(offset, signal) {
  const url = new URL(API_PATH, window.location.origin)
  url.searchParams.set('offset', String(offset))
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal,
  })
  if (!response.ok) {
    throw new Error(`No fue posible cargar los leads en offset ${offset} (HTTP ${response.status}).`)
  }
  const contentType = response.headers.get('content-type') || 'no informado'
  const responseText = await response.text()
  let payload
  try {
    payload = JSON.parse(responseText)
  } catch {
    throw new Error(`El API/proxy respondió contenido no JSON en offset ${offset} (HTTP ${response.status}, Content-Type: ${contentType}).`)
  }
  return extractLeadRows(payload).map((row, index) => mapMeetingLead(row, offset + index))
}

export async function fetchLeads(signal) {
  const leads = []
  const seenIds = new Set()

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await fetchPage(offset, signal)
    for (const lead of page) {
      if (seenIds.has(lead.id)) {
        throw new Error(`La API devolvió el identificador duplicado ${lead.id} entre páginas.`)
      }
      seenIds.add(lead.id)
      leads.push(lead)
    }
    if (page.length < PAGE_SIZE) return leads
  }
}
