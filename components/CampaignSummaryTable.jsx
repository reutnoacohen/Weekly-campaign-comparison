import StatusBadge from './StatusBadge.jsx'
import { formatPercent } from '../utils/formatDisplay.js'
import { annotateInsight } from '../utils/generateInsights.js'
import KpiEventBlock, { KpiDefinitionBanner } from './KpiEventBlock.jsx'
import { getKpiDefinitionLine } from '../utils/kpiDisplay.js'

export default function CampaignSummaryTable({
  rows,
  hasPayableColumn,
  usesPayableBaseline,
}) {
  const kpiLine = getKpiDefinitionLine(usesPayableBaseline, hasPayableColumn)

  return (
    <div className="space-y-2">
      <KpiDefinitionBanner line={kpiLine} />
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="whitespace-nowrap border-b border-slate-200 px-3 py-2">
                Campaign
              </th>
              <th className="min-w-[220px] border-b border-slate-200 px-3 py-2">
                Events (week over week)
              </th>
              <th className="whitespace-nowrap border-b border-slate-200 px-3 py-2 text-right">
                Event rate, previous week
              </th>
              <th className="whitespace-nowrap border-b border-slate-200 px-3 py-2 text-right">
                Event rate, current week
              </th>
              <th className="whitespace-nowrap border-b border-slate-200 px-3 py-2">
                Status
              </th>
              <th className="min-w-[240px] border-b border-slate-200 px-3 py-2">
                Insight
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-slate-100 odd:bg-white even:bg-slate-50/60">
                <td className="px-3 py-2 align-top font-medium text-slate-900">
                  {row.display.campaign || '—'}
                </td>
                <td className="px-3 py-2 align-top">
                  <KpiEventBlock prev={row.prevPayable} curr={row.currPayable} />
                </td>
                <td className="px-3 py-2 align-top text-right tabular-nums text-slate-600">
                  {formatPercent(row.prevRate)}
                </td>
                <td className="px-3 py-2 align-top text-right tabular-nums text-slate-600">
                  {formatPercent(row.currRate)}
                </td>
                <td className="px-3 py-2 align-top">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-3 py-2 align-top text-xs leading-snug text-slate-600">
                  {annotateInsight(row, { hasPayableColumn })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="p-6 text-center text-sm text-slate-500">
            No rows match the current filters.
          </div>
        )}
      </div>
    </div>
  )
}
