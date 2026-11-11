// Copiado de InnovAIgt/DashboardLeads (Dashboard-Leds/src/DashboardHome.jsx)
// Solo la barra de filtros: MONTH_TO_DAY_KEYS, MultiSelect, MonthToDayFilter y FilterBar (líneas 19 y 21-202),
// sin cambios. Los imports se ajustaron a lo que usan estas piezas y se agregó el export al final.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { applyFilters, FILTER_DEFS, formatNumber } from '../utils/analytics.js'

const MONTH_TO_DAY_KEYS = ['filterMonthToDayMonth', 'filterMonthToDayDay']

function MultiSelect({ def, leads, filters }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const display = def.display ?? String

  // Opciones y conteos según los demás filtros activos (no el propio).
  const counts = useMemo(() => {
    const map = new Map()
    for (const lead of applyFilters(leads, filters, def.key)) {
      const value = def.value(lead)
      if (value === undefined || value === null || value === '') continue
      map.set(value, (map.get(value) ?? 0) + 1)
    }
    return map
  }, [def, leads, filters])
  const options = useMemo(() => {
    if (def.options) return def.options
    const all = new Set(leads.map(def.value).filter((value) => value !== undefined && value !== null && value !== ''))
    return [...all].sort(def.sort ?? ((a, b) => String(display(a)).localeCompare(String(display(b)))))
  }, [def, leads, display])

  const selection = filters[def.key]
  const selected = selection == null ? options : selection
  const selectedCount = options.filter((value) => selected.includes(value)).length
  const active = selection != null
  const summary = !active || selectedCount === options.length
    ? 'Todos'
    : selectedCount === 0 ? 'Ninguno'
      : selectedCount === 1 ? display(options.find((value) => selected.includes(value)))
        : `${selectedCount} seleccionados`

  useEffect(() => {
    if (!open) return undefined
    const closeOnOutsideClick = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false) }
    const closeOnEscape = (event) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const update = (next) => filters.setFilter(def.key, next && next.length === options.length ? null : next)
  const toggle = (value) => {
    const next = new Set(selected)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    update(options.filter((option) => next.has(option)))
  }

  return <div ref={rootRef} className="relative min-w-0">
    <button type="button" className={`filter-trigger ${active ? 'is-active' : ''}`} aria-expanded={open} aria-haspopup="listbox" onClick={() => setOpen((wasOpen) => !wasOpen)}>
      <span className="filter-trigger-label">{def.label}</span>
      <strong className="truncate">{summary}</strong>
      <ChevronDown size={14} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <div className="filter-popover" role="listbox" aria-multiselectable="true" aria-label={def.label}>
      <div className="filter-popover-actions">
        <button type="button" onClick={() => update(null)}>Todos</button>
        <button type="button" onClick={() => update([])}>Ninguno</button>
      </div>
      <div className="filter-option-list">
        {options.map((option) => {
          const checked = selected.includes(option)
          return <label key={option} className="filter-option">
            <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggle(option)} />
            <span className={`filter-check ${checked ? 'is-checked' : ''}`}>{checked && <Check size={11} strokeWidth={3} />}</span>
            <span className="min-w-0 flex-1 truncate">{display(option)}</span>
            <small className="tabular-nums text-muted">{formatNumber(counts.get(option) ?? 0)}</small>
          </label>
        })}
        {!options.length && <p className="px-2 py-3 text-xs text-muted">Sin opciones disponibles.</p>}
      </div>
    </div>}
  </div>
}

function MonthToDayFilter({ filters }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const monthDef = FILTER_DEFS.find((def) => def.key === MONTH_TO_DAY_KEYS[0])
  const dayDef = FILTER_DEFS.find((def) => def.key === MONTH_TO_DAY_KEYS[1])
  const months = monthDef.options
  const days = dayDef.options
  const selectedMonths = filters[monthDef.key] ?? months
  const selectedDays = filters[dayDef.key] ?? days
  const active = filters[monthDef.key] != null || filters[dayDef.key] != null
  const summary = !active
    ? 'Todos'
    : `${selectedMonths.length === months.length ? 'Todos los meses' : `${selectedMonths.length} meses`} · ${selectedDays.length === days.length ? 'todos los días' : `${selectedDays.length} días`}`

  useEffect(() => {
    if (!open) return undefined
    const closeOnOutsideClick = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false) }
    const closeOnEscape = (event) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const updateSelection = (key, options, value) => {
    const current = filters[key] ?? options
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value].sort((a, b) => a - b)
    filters.setFilter(key, next.length === options.length ? null : next)
  }
  const setAll = (key, options, all) => filters.setFilter(key, all ? null : [])

  return <div ref={rootRef} className="relative min-w-0">
    <button type="button" className={`filter-trigger ${active ? 'is-active' : ''}`} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((wasOpen) => !wasOpen)}>
      <span className="filter-trigger-label">Month to day</span>
      <strong className="truncate">{summary}</strong>
      <ChevronDown size={14} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <section className="month-to-day-popover" role="dialog" aria-label="Filtro Month to day">
      <div className="month-to-day-section">
        <header>
          <div><h3>Meses</h3><span>Elige uno o varios meses</span></div>
          <div className="month-to-day-actions">
            <button type="button" onClick={() => setAll(monthDef.key, months, true)}>Todos</button>
            <button type="button" onClick={() => setAll(monthDef.key, months, false)}>Limpiar</button>
          </div>
        </header>
        <div className="month-to-day-month-grid">
          {months.map((month) => <button
            type="button"
            key={month}
            aria-pressed={selectedMonths.includes(month)}
            className={selectedMonths.includes(month) ? 'is-selected' : ''}
            onClick={() => updateSelection(monthDef.key, months, month)}
          >{monthDef.display(month)}</button>)}
        </div>
      </div>
      <div className="month-to-day-section">
        <header>
          <div><h3>Días del mes</h3><span>Compara el mismo día entre los meses elegidos</span></div>
          <div className="month-to-day-actions">
            <button type="button" onClick={() => setAll(dayDef.key, days, true)}>Todos</button>
            <button type="button" onClick={() => setAll(dayDef.key, days, false)}>Limpiar</button>
          </div>
        </header>
        <div className="month-to-day-day-grid">
          {days.map((day) => <button
            type="button"
            key={day}
            aria-pressed={selectedDays.includes(day)}
            className={selectedDays.includes(day) ? 'is-selected' : ''}
            onClick={() => updateSelection(dayDef.key, days, day)}
          >{day}</button>)}
        </div>
      </div>
    </section>}
  </div>
}

function FilterBar({ leads, filters, filteredCount }) {
  const activeCount = FILTER_DEFS.filter((def) => !MONTH_TO_DAY_KEYS.includes(def.key) && filters[def.key] != null).length
    + (MONTH_TO_DAY_KEYS.some((key) => filters[key] != null) ? 1 : 0)
  return <div className="filter-bar">
    <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-2 px-4 py-2.5 sm:px-6">
      <span className="hidden items-center gap-1.5 pr-1 text-xs font-semibold text-muted lg:flex"><SlidersHorizontal size={14} />Filtros</span>
      <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:w-auto lg:flex-1 lg:grid-cols-3 xl:grid-cols-4">
        {FILTER_DEFS.map((def) => {
          if (def.key === MONTH_TO_DAY_KEYS[0]) return <MonthToDayFilter key="month-to-day" filters={filters} />
          if (MONTH_TO_DAY_KEYS.includes(def.key)) return null
          return <MultiSelect key={def.key} def={def} leads={leads} filters={filters} />
        })}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <span className="whitespace-nowrap text-xs text-muted"><b className="tabular-nums text-ink">{formatNumber(filteredCount)}</b> de {formatNumber(leads.length)} leads</span>
        <button type="button" className="btn btn-ghost" onClick={filters.clearFilters} disabled={!activeCount}>
          <RotateCcw size={14} />Limpiar{activeCount ? ` (${activeCount})` : ''}
        </button>
      </div>
    </div>
  </div>
}

export { FilterBar }
