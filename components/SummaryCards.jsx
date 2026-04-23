import { KpiDefinitionBanner } from './KpiEventBlock.jsx'
import { getKpiDefinitionLine } from '../utils/kpiDisplay.js'

const CARD =
  'rounded-lg border border-slate-200 bg-white p-4 shadow-sm'

export default function SummaryCards({
  summary,
  narrative,
  usesPayableBaseline,
  hasPayableKpi,
}) {
  const kpiLine = getKpiDefinitionLine(usesPayableBaseline, hasPayableKpi)
  const items = [
    { label: 'Improving campaigns', value: summary.improving, tone: 'text-emerald-700' },
    { label: 'Declining campaigns', value: summary.declining, tone: 'text-rose-700' },
    { label: 'Stable campaigns', value: summary.stable, tone: 'text-slate-700' },
    { label: 'No payable events', value: summary.noPayable, tone: 'text-orange-700' },
    { label: 'New sources', value: summary.newSources, tone: 'text-sky-700' },
    { label: 'Missing sources', value: summary.missingSources, tone: 'text-slate-600' },
  ]

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">Summary</h2>
      <KpiDefinitionBanner line={kpiLine} />
      {narrative ? (
        <p className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-800 shadow-sm">
          {narrative}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {items.map((it) => (
          <div key={it.label} className={CARD}>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {it.label}
            </div>
            <div className={`mt-2 text-2xl font-semibold ${it.tone}`}>{it.value}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
