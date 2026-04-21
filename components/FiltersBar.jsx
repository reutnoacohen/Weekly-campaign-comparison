const FIELD =
  'w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400'

const MULTI_BOX =
  'max-h-28 overflow-y-auto rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-sm'

const CHECK = 'rounded border-slate-300 text-indigo-600 focus:ring-indigo-400'

const GEO_ACTION =
  'rounded px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40'

function toggleList(list, value, checked) {
  if (checked) {
    return list.includes(value) ? list : [...list, value]
  }
  return list.filter((x) => x !== value)
}

function GeoMultiSelect({
  label,
  options,
  selected,
  onChange,
  disabled,
  emptyHint,
}) {
  const inactive = disabled || options.length === 0
  const allSelected =
    !inactive &&
    options.length > 0 &&
    options.every((opt) => selected.includes(opt))

  return (
    <div
      className={`flex flex-col gap-1 text-xs font-medium text-slate-600 ${inactive ? 'opacity-50' : ''}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
        <span>{label}</span>
        {!inactive && (
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              className={GEO_ACTION}
              onClick={() => onChange([...options])}
              disabled={allSelected}
              aria-label={`Select all ${label} values`}
            >
              All
            </button>
            <button
              type="button"
              className={GEO_ACTION}
              onClick={() => onChange([])}
              disabled={!selected.length}
              aria-label={`Clear ${label} selection`}
            >
              Clear
            </button>
          </div>
        )}
      </div>
      {inactive ? (
        <div className={`${MULTI_BOX} text-slate-500`}>
          {emptyHint || '—'}
        </div>
      ) : (
        <div className={MULTI_BOX} role="group" aria-label={label}>
          {options.map((opt) => (
            <label
              key={opt}
              className="flex cursor-pointer items-center gap-2 py-0.5 font-normal text-slate-800"
            >
              <input
                type="checkbox"
                className={CHECK}
                checked={selected.includes(opt)}
                onChange={(e) =>
                  onChange(toggleList(selected, opt, e.target.checked))
                }
              />
              <span className="truncate" title={opt}>
                {opt}
              </span>
            </label>
          ))}
        </div>
      )}
      {!inactive && (
        <p className="font-normal text-[10px] text-slate-500">
          None selected = all rows (no filter on this dimension)
        </p>
      )}
    </div>
  )
}

export default function FiltersBar({
  filters,
  onChange,
  statusOptions,
  breakdownValue,
  onBreakdownChange,
  breakdownOptions,
  countryOptions = [],
  stateOptions = [],
  showCountryFilter = false,
  showStateFilter = false,
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
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

      {(showCountryFilter || showStateFilter) && (
        <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 md:flex-row md:items-start md:gap-6">
          {showCountryFilter && (
            <div className="min-w-[12rem] flex-1 md:max-w-xs">
              <GeoMultiSelect
                label="Country"
                options={countryOptions}
                selected={filters.country || []}
                onChange={(next) => onChange({ ...filters, country: next })}
                disabled={countryOptions.length === 0}
                emptyHint="No country values in data"
              />
            </div>
          )}
          {showStateFilter && (
            <div className="min-w-[12rem] flex-1 md:max-w-xs">
              <GeoMultiSelect
                label="State"
                options={stateOptions}
                selected={filters.state || []}
                onChange={(next) => onChange({ ...filters, state: next })}
                disabled={stateOptions.length === 0}
                emptyHint="No state values in data"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
