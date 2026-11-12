// Copiado de InnovAIgt/DashboardLeads (Dashboard-Leds/src/utils/dates.js)
export function toDate(value) {
  if (!value) return null
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (match) {
      const [, year, month, day] = match.map(Number)
      const date = new Date(year, month - 1, day)
      if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
      return date
    }
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value) {
  const date = toDate(value)
  return date
    ? new Intl.DateTimeFormat('es-SV', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
    : 'Sin fecha'
}

export function monthValue(value) {
  const date = toDate(value)
  return date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : ''
}

export function isOverdue(value, now = new Date()) {
  const date = toDate(value)
  return date !== null && date.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
}
