const FIELD =
  'w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400'

export default function FiltersBar({
  filters,
  onChange,
  statusOptions,
  breakdownValue,
  onBreakdownChange,
  breakdownOptions,
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 lg:flex-row lg:items-end">
      <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Campaign
          <input
            className={FIELD}
            value={filters.campaignName}
            onChange={(e) => onChange({ ...filters, campaignName: e.target.value })}
            placeholder="Contains…"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Media source
          <input
            className={FIELD}
            value={filters.mediaSource}
            onChange={(e) => onChange({ ...filters, mediaSource: e.target.value })}
            placeholder="Contains…"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Agency
          <input
            className={FIELD}
            value={filters.agency}
            onChange={(e) => onChange({ ...filters, agency: e.target.value })}
            placeholder="Contains…"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Attribution type
          <input
            className={FIELD}
            value={filters.attributionType}
            onChange={(e) =>
              onChange({ ...filters, attributionType: e.target.value })
            }
            placeholder="Contains…"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Status
          <select
            className={FIELD}
            value={filters.status}
            onChange={(e) => onChange({ ...filters, status: e.target.value })}
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="w-full max-w-xs">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Breakdown level
          <select
            className={FIELD}
            value={breakdownValue}
            onChange={(e) => onBreakdownChange(e.target.value)}
          >
            {breakdownOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}
