import StatusBadge from './StatusBadge.jsx'
import { formatCount } from '../utils/formatDisplay.js'

function BulletList({ items, renderItem, emptyLabel }) {
  if (!items.length) {
    return <li className="text-slate-500">{emptyLabel}</li>
  }
  return items.map((item, i) => (
    <li key={i} className="text-slate-800">
      {renderItem(item)}
    </li>
  ))
}

export default function CampaignInsightsSummary({ summaries }) {
  if (!summaries?.length) return null

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Campaign Insights Summary</h2>
      <div className="space-y-4">
        {summaries.map((s, idx) => (
          <article
            key={`${s.campaignName}-${idx}`}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-slate-900">
                Campaign: {s.campaignName || '—'}
              </h3>
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-600">Status:</span>
              <StatusBadge status={s.status} />
            </div>

            <div className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="mb-1.5 font-medium text-slate-700">Main negative drivers</p>
                <ul className="list-inside list-disc space-y-1 pl-0.5 text-xs leading-relaxed sm:text-sm">
                  <BulletList
                    items={s.declining}
                    emptyLabel="None"
                    renderItem={(d) =>
                      `${d.label}: ${formatCount(d.prev)} → ${formatCount(d.curr)} (primary KPI)`
                    }
                  />
                </ul>
              </div>
              <div>
                <p className="mb-1.5 font-medium text-slate-700">Main positive drivers</p>
                <ul className="list-inside list-disc space-y-1 pl-0.5 text-xs leading-relaxed sm:text-sm">
                  {s.improving.length === 0 && s.newSources.length === 0 ? (
                    <li className="text-slate-500">None</li>
                  ) : (
                    <>
                      {s.improving.map((p, i) => (
                        <li key={`g-${i}`} className="text-slate-800">
                          {p.label}: {formatCount(p.prev)} → {formatCount(p.curr)} (primary KPI)
                        </li>
                      ))}
                      {s.newSources.map((n, i) => (
                        <li key={`n-${i}`} className="text-slate-800">
                          {n.label} (new this week, {formatCount(n.curr)} primary KPI)
                        </li>
                      ))}
                    </>
                  )}
                </ul>
              </div>
              <div className="sm:col-span-2">
                <p className="mb-1.5 font-medium text-slate-700">Missing sources</p>
                <ul className="list-inside list-disc space-y-1 pl-0.5 text-xs leading-relaxed sm:text-sm">
                  <BulletList
                    items={s.missing}
                    emptyLabel="None"
                    renderItem={(m) =>
                      `${m.label} (last week ${formatCount(m.prev)} primary KPI; not in current week)`
                    }
                  />
                </ul>
              </div>
            </div>

            <p className="mt-4 border-t border-slate-100 pt-3 text-sm leading-snug text-slate-700">
              <span className="font-medium text-slate-800">Conclusion: </span>
              {s.conclusion}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
