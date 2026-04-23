import StatusBadge from './StatusBadge.jsx'
import { formatCount } from '../utils/formatDisplay.js'
import KpiEventBlock, { KpiDefinitionBanner } from './KpiEventBlock.jsx'
import { getKpiDefinitionLine } from '../utils/kpiDisplay.js'

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

export default function CampaignInsightsSummary({
  summaries,
  usesPayableBaseline,
  hasPayableKpi,
}) {
  if (!summaries?.length) return null

  const kpiLine = getKpiDefinitionLine(usesPayableBaseline, hasPayableKpi)

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Campaign Insights Summary</h2>
      <KpiDefinitionBanner line={kpiLine} />
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
                <p className="mb-1.5 font-medium text-slate-700">
                  Main negative drivers (main media sources)
                </p>
                <ul className="list-none space-y-3 pl-0.5 text-xs leading-relaxed sm:text-sm">
                  <BulletList
                    items={s.declining}
                    emptyLabel="None"
                    renderItem={(d) => (
                      <div className="list-none pl-0">
                        <div className="font-medium text-slate-900">{d.label}</div>
                        <KpiEventBlock prev={d.prev} curr={d.curr} />
                      </div>
                    )}
                  />
                </ul>
              </div>
              <div>
                <p className="mb-1.5 font-medium text-slate-700">
                  Main positive drivers (main media sources)
                </p>
                <ul className="space-y-3 text-xs leading-relaxed sm:text-sm">
                  {s.improving.length === 0 && s.newSources.length === 0 ? (
                    <li className="list-inside list-disc text-slate-500">None</li>
                  ) : (
                    <>
                      {s.improving.map((p, i) => (
                        <li key={`g-${i}`} className="list-none">
                          <div className="font-medium text-slate-900">{p.label}</div>
                          <KpiEventBlock prev={p.prev} curr={p.curr} />
                        </li>
                      ))}
                      {s.newSources.map((n, i) => (
                        <li key={`n-${i}`} className="list-none text-slate-800">
                          <div className="font-medium text-slate-900">{n.label}</div>
                          <div className="mt-0.5 text-xs">
                            New this week — current week:{' '}
                            <span className="font-medium tabular-nums">
                              {formatCount(n.curr)}
                            </span>{' '}
                            events
                          </div>
                        </li>
                      ))}
                    </>
                  )}
                </ul>
              </div>
              {s.subSourceCallouts?.length > 0 && (
                <div className="sm:col-span-2">
                  <p className="mb-1.5 font-medium text-slate-700">
                    Sub-source detail (within main media)
                  </p>
                  <ul className="space-y-3 pl-0.5 text-xs leading-relaxed text-slate-700 sm:text-sm">
                    {s.subSourceCallouts.map((bl, j) => (
                      <li key={j} className="list-none text-slate-800">
                        <span className="font-medium text-slate-900">{bl.mainSource}</span>
                        <ul className="mt-1 space-y-2">
                          {bl.items.map((it, k) => (
                            <li key={k} className="list-none">
                              <div className="text-slate-700">Sub-source: {it.sub}</div>
                              <KpiEventBlock prev={it.prev} curr={it.curr} />
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="sm:col-span-2">
                <p className="mb-1.5 font-medium text-slate-700">Missing main media sources</p>
                <ul className="list-none space-y-3 pl-0.5 text-xs leading-relaxed sm:text-sm">
                  <BulletList
                    items={s.missing}
                    emptyLabel="None"
                    renderItem={(m) => (
                      <div className="list-none">
                        <div className="font-medium text-slate-900">{m.label}</div>
                        <div className="text-xs">
                          Previous week only:{' '}
                          <span className="font-medium tabular-nums">
                            {formatCount(m.prev)}
                          </span>{' '}
                          events (not in current week)
                        </div>
                      </div>
                    )}
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
