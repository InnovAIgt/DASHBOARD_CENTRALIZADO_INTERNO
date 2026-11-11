// Copiado de InnovAIgt/DashboardLeads (Dashboard-Leds/src/views/AnalyticsView.jsx)
import { Fragment, useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { AdvisorDrawer } from '../components/AdvisorDrawer.jsx'
import { Funnel, Legend, Meter, MonthlyComboChart, PairedBars } from '../components/charts.jsx'
import { KpiGrid } from '../components/KpiGrid.jsx'
import { MonthDetailModal } from '../components/MonthDetailModal.jsx'
import { Badge, Card, CountryTag, DataTable, EmptyState } from '../components/ui.jsx'
import { byAdvisor, byCountry, byMonth, COUNTRIES, COUNTRY_CODE, formatNumber, formatPercent, leadUnits, monthLabel, summarize } from '../utils/analytics.js'
import { leadReferenceMonth } from '../utils/leads.js'

const SERIES = [
  { key: 'total', label: 'Total leads', color: '#2a78d6' },
  { key: 'won', label: 'Radicados', color: '#1baf7a' },
  { key: 'units', label: 'Unidades', color: '#eb6834' },
]

function ConversionPill({ won, total }) {
  const value = total ? won / total : 0
  return <Badge tone={value >= 0.1 ? 'good' : value > 0 ? 'warn' : 'neutral'}>{formatPercent(won, total)}</Badge>
}

function RegionalComparison({ countries }) {
  const metrics = [
    { key: 'total', label: 'Leads' },
    { key: 'qualified', label: 'Calificados' },
    { key: 'won', label: 'Radicados' },
    { key: 'units', label: 'Unidades' },
  ]
  return <div className="grid gap-4">
    <div className="grid grid-cols-2 gap-3">
      {countries.map((row) => <div key={row.country} className="rounded-xl border border-line bg-subtle/60 p-3">
        <div className="flex items-center gap-2 text-xs font-medium text-muted"><CountryTag country={row.country} />{row.country}</div>
        <strong className="mt-2 block text-2xl font-semibold tracking-tight text-ink tabular-nums">{formatPercent(row.won, row.total)}</strong>
        <small className="text-xs text-muted">conversión · {row.won ? formatNumber(Math.round(row.avgUnits)) : '—'} u/cierre</small>
      </div>)}
    </div>
    <div className="grid gap-3">
      {metrics.map((metric) => {
        const max = Math.max(1, ...countries.map((row) => row[metric.key]))
        return <div key={metric.key} className="grid gap-1.5">
          <span className="text-xs font-medium text-ink">{metric.label}</span>
          {countries.map((row) => <div key={row.country} className="grid grid-cols-[2rem_1fr_3.5rem] items-center gap-2 text-xs">
            <span className="text-muted">{COUNTRY_CODE[row.country]}</span>
            <Meter value={row[metric.key]} max={max} color={row.country === 'Guatemala' ? '#2a78d6' : '#eda100'} />
            <span className="text-right tabular-nums text-ink">{formatNumber(row[metric.key])}</span>
          </div>)}
        </div>
      })}
    </div>
  </div>
}

export function AnalyticsView({ leads, summary, showAllFunnel }) {
  const [selectedAdvisor, setSelectedAdvisor] = useState(null)
  const [selectedMonthDetail, setSelectedMonthDetail] = useState(null)
  const months = useMemo(() => byMonth(leads), [leads])
  const advisors = useMemo(() => byAdvisor(leads), [leads])
  const advisorsByCountry = useMemo(() => COUNTRIES.map((country) => {
    const countryLeads = leads.filter((lead) => lead.pais === country)
    return {
      country,
      summary: summarize(countryLeads),
      advisors: byAdvisor(countryLeads).sort((left, right) => right.total - left.total || left.name.localeCompare(right.name)),
    }
  }).filter((group) => group.advisors.length), [leads])
  const countries = useMemo(() => byCountry(leads), [leads])
  const monthlyFunnelGroups = useMemo(() => [
    ...(showAllFunnel ? [{ key: 'all', label: 'Todos', leads }] : []),
    ...months.map(({ month }) => ({
      key: month,
      label: monthLabel(month, 'long'),
      leads: leads.filter((lead) => leadReferenceMonth(lead) === month),
    })),
  ], [leads, months, showAllFunnel])
  const monthlyCountryTables = useMemo(() => COUNTRIES.map((country) => {
    const countryLeads = leads.filter((lead) => lead.pais === country)
    const countryMonths = byMonth(countryLeads).map((month) => {
      const monthLeads = countryLeads.filter((lead) => leadReferenceMonth(lead) === month.month)
      return { ...month, leads: monthLeads }
    })
    const countrySummary = summarize(countryLeads)
    return { country, months: countryMonths, summary: countrySummary }
  }), [leads])
  const unitsFor = (rows) => rows.reduce((totalUnits, lead) => totalUnits + leadUnits(lead), 0)
  const topRadicados = useMemo(() => [...advisors].sort((a, b) => b.won - a.won || b.total - a.total).slice(0, 10), [advisors])
  const openAdvisor = (name, country, sourceLeads = leads, month = null) => {
    setSelectedAdvisor({ name, country, leads: sourceLeads, month })
  }

  return <div className="view-enter grid gap-4">
    <KpiGrid summary={summary} />

    <div className="grid gap-4 xl:grid-cols-3">
      <Card className="xl:col-span-2" title="Leads y unidades por mes" subtitle="Los cierres exitosos se agrupan por fecha de cierre; el resto, por fecha de creación." action={<Legend items={SERIES} />}>
        {months.length ? <MonthlyComboChart rows={months} series={SERIES} /> : <EmptyState title="Sin meses con datos" body="Ajusta los filtros para ver la evolución mensual." />}
      </Card>
      <Card title="Comparativa regional" subtitle="Guatemala vs. El Salvador">
        <RegionalComparison countries={countries} />
      </Card>
    </div>

    <div className="grid gap-4">
      <Card title="Top radicados" subtitle="Total leads vs. leads radicados por ejecutivo" action={<Legend items={[SERIES[0], SERIES[1]]} />}>
        {topRadicados.length
        ? <PairedBars rows={topRadicados} primary={SERIES[0]} secondary={SERIES[1]} onSelect={(name) => openAdvisor(name, advisors.find((row) => row.name === name)?.country)} selected={selectedAdvisor?.name} />
          : <EmptyState title="Sin datos" />}
      </Card>
    </div>

    <Card className="monthly-funnel-card" title="Embudo de conversión por mes" subtitle={showAllFunnel
      ? 'Se muestran todos los meses y el total general.'
      : 'Se muestran únicamente los meses que contienen leads con los filtros activos.'}>
      {months.length
        ? <div className="monthly-funnel-grid">
          {monthlyFunnelGroups.map((group) => {
            const groupSummary = summarize(group.leads)
            const wonLeads = group.leads.filter((lead) => lead.estado === 'ganado')
            return <section className="monthly-funnel-section" key={group.key}>
              <div className="monthly-funnel-heading">
                <h3>{group.label}</h3>
                <span>{formatNumber(groupSummary.total)} leads</span>
              </div>
              <Funnel stages={[
                { label: 'Total leads', value: groupSummary.total },
                { label: 'Leads calificados', value: groupSummary.qualified },
                { label: 'Leads radicados', value: groupSummary.won },
              ]} />
              <div className="monthly-funnel-results" aria-label={`Resultados de ${group.label}`}>
                <div><span>Radicados</span><strong>{formatNumber(groupSummary.won)}</strong></div>
                <div><span>Unidades</span><strong>{formatNumber(unitsFor(wonLeads))}</strong></div>
                <div><span>{group.key === 'all' ? 'Conversión total' : 'Conversión del mes'}</span><strong>{formatPercent(groupSummary.won, groupSummary.total)}</strong></div>
              </div>
            </section>
          })}
        </div>
        : <EmptyState title="Sin meses con datos" body="Ajusta los filtros para consultar un embudo mensual." />}
    </Card>

    <div className="grid gap-4">
      <Card title="Resumen por asesor (agrupado por país)" subtitle="Selecciona un ejecutivo para consultar sus leads, etapas y forecast con los filtros actuales.">
        <DataTable
          headers={['País', 'Asesor', { label: 'Total leads', numeric: true }, { label: 'Calificados', numeric: true }, { label: 'No calificados', numeric: true }, { label: 'Radicados', numeric: true }, { label: 'Conversión', numeric: true }, { label: 'Unidades promedio', numeric: true }, { label: 'Unidades totales', numeric: true }]}
          empty={advisorsByCountry.length ? null : 'No hay asesores en la selección.'}
        >
          {advisorsByCountry.map((group) => <Fragment key={group.country}>
            <tr className="group-row">
              <td colSpan={9}>
                <span className="flex flex-wrap items-center gap-2">
                  <CountryTag country={group.country} />
                  <strong>{group.country}</strong>
                  <span className="text-muted">{group.advisors.length} asesores · {formatNumber(group.summary.total)} leads · {formatNumber(group.summary.won)} radicados</span>
                </span>
              </td>
            </tr>
            {group.advisors.map((row) => <tr key={`${group.country}-${row.name}`}>
              <td><CountryTag country={group.country} /></td>
              <td>
                <button type="button" className="inline-flex items-center gap-1 rounded-md text-left font-medium text-ink hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent" onClick={() => openAdvisor(row.name, group.country)}>
                  {row.name}<ChevronRight size={14} className="text-muted" />
                </button>
              </td>
              <td className="num">{formatNumber(row.total)}</td>
              <td className="num">{formatNumber(row.qualified)}</td>
              <td className="num">{formatNumber(row.unqualified)}</td>
              <td className="num">{formatNumber(row.won)}</td>
              <td className="num"><ConversionPill won={row.won} total={row.total} /></td>
              <td className="num">{row.won ? formatNumber(Math.round(row.avgUnits)) : '—'}</td>
              <td className="num font-semibold text-ink">{formatNumber(row.units)}</td>
            </tr>)}
          </Fragment>)}
        </DataTable>
      </Card>
    </div>

    <div className="grid gap-4">
      {monthlyCountryTables.map((group) => <Card
        key={group.country}
        title={`Resumen mensual · ${group.country}`}
        subtitle={`${group.months.length} meses · ${formatNumber(group.summary.total)} leads · ${formatNumber(group.summary.won)} radicados`}
        action={<CountryTag country={group.country} />}
      >
        <DataTable
          className="month-summary-table"
          headers={['Mes', { label: 'Total leads', numeric: true }, { label: 'Calificados', numeric: true }, { label: 'No calificados', numeric: true }, { label: 'Radicados', numeric: true }, { label: 'Conversión', numeric: true }, { label: 'Unidades promedio', numeric: true }, { label: 'Unidades totales', numeric: true }]}
          empty={group.months.length ? null : `No hay leads de ${group.country} con los filtros actuales.`}
        >
          {group.months.map((row) => <tr key={`${group.country}-${row.month}`}>
            <td><button
              type="button"
              className="month-detail-trigger"
              onClick={() => setSelectedMonthDetail({ country: group.country, month: row.month, leads: row.leads })}
              aria-label={`Ver detalle de ${monthLabel(row.month, 'long')} en ${group.country}`}
            >{monthLabel(row.month, 'long')}<ChevronRight size={14} /></button></td>
            <td className="num">{formatNumber(row.total)}</td>
            <td className="num">{formatNumber(row.qualified)}</td>
            <td className="num">{formatNumber(row.unqualified)}</td>
            <td className="num">{formatNumber(row.won)}</td>
            <td className="num"><ConversionPill won={row.won} total={row.total} /></td>
            <td className="num">{row.won ? formatNumber(Math.round(row.avgUnits)) : '—'}</td>
            <td className="num">{formatNumber(row.units)}</td>
          </tr>)}
        </DataTable>
      </Card>)}
    </div>

    {selectedAdvisor && <AdvisorDrawer
      name={selectedAdvisor.name}
      country={selectedAdvisor.country}
      leads={selectedAdvisor.leads}
      month={selectedAdvisor.month}
      onClose={() => setSelectedAdvisor(null)}
    />}
    {selectedMonthDetail && <MonthDetailModal
      month={selectedMonthDetail.month}
      country={selectedMonthDetail.country}
      leads={selectedMonthDetail.leads}
      onClose={() => setSelectedMonthDetail(null)}
    />}
  </div>
}
