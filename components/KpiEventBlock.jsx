import { formatEventChangeBlock } from '../utils/kpiDisplay.js'

export function KpiDefinitionBanner({ line }) {
  if (!line) return null
  return (
    <p className="rounded-md border border-indigo-100 bg-indigo-50/90 px-3 py-2 text-sm leading-relaxed text-indigo-950">
      <span className="font-semibold">How to read the KPI: </span>
      {line}
    </p>
  )
}

export default function KpiEventBlock({ prev, curr }) {
  const b = formatEventChangeBlock(prev, curr)
  return (
    <div className="min-w-[10rem] space-y-0.5 text-left text-xs leading-relaxed text-slate-800">
      <div>
        Previous week:{' '}
        <span className="font-medium tabular-nums text-slate-900">{b.previousWeek}</span> events
      </div>
      <div>
        Current week:{' '}
        <span className="font-medium tabular-nums text-slate-900">{b.currentWeek}</span> events
      </div>
      <div className="pt-0.5 text-slate-800">{b.changeLine}</div>
    </div>
  )
}
