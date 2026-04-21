const CARD =
  'rounded-lg border border-slate-200 bg-white p-4 shadow-sm'

export default function SummaryCards({ summary }) {
  const items = [
    { label: 'Improving Campaigns', value: summary.improving, tone: 'text-emerald-700' },
    { label: 'Declining Campaigns', value: summary.declining, tone: 'text-rose-700' },
    { label: 'Stable Campaigns', value: summary.stable, tone: 'text-slate-700' },
    { label: 'No Payable Events', value: summary.noPayable, tone: 'text-orange-700' },
    { label: 'New Sources', value: summary.newSources, tone: 'text-sky-700' },
    { label: 'Missing Sources', value: summary.missingSources, tone: 'text-slate-600' },
  ]

  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
      {items.map((it) => (
        <div key={it.label} className={CARD}>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {it.label}
          </div>
          <div className={`mt-2 text-2xl font-semibold ${it.tone}`}>{it.value}</div>
        </div>
      ))}
    </section>
  )
}
