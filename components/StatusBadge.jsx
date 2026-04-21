import { STATUS } from '../utils/compareRows.js'

const STYLES = {
  [STATUS.IMPROVING]:
    'bg-emerald-50 text-emerald-800 ring-emerald-200',
  [STATUS.DECLINING]: 'bg-rose-50 text-rose-800 ring-rose-200',
  [STATUS.STABLE]: 'bg-slate-100 text-slate-700 ring-slate-200',
  [STATUS.WEAK_EVENT_QUALITY]:
    'bg-amber-50 text-amber-900 ring-amber-200',
  [STATUS.NO_PAYABLE_EVENTS]:
    'bg-orange-50 text-orange-900 ring-orange-300',
  [STATUS.PAUSED_MISSING]: 'bg-slate-100 text-slate-600 ring-slate-200',
  [STATUS.NEW_THIS_WEEK]: 'bg-sky-50 text-sky-900 ring-sky-200',
  [STATUS.NOT_ENOUGH_DATA]: 'bg-slate-50 text-slate-500 ring-slate-200',
}

export default function StatusBadge({ status }) {
  const cls = STYLES[status] || STYLES[STATUS.STABLE]
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}
    >
      {status}
    </span>
  )
}
