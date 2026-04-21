import { useId } from 'react'
import { TARGET_FIELDS, getMappingValidationIssues } from '../utils/mapColumns.js'
import { getColumnStats } from '../utils/columnStats.js'

const LABEL = 'mb-1 block text-xs font-medium text-slate-600'
const SELECT =
  'w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 shadow-sm'

function EventNameMappingHint({ rawRows, mapping }) {
  const { eventNameInvalid } = getMappingValidationIssues(rawRows, mapping)
  const col = mapping.eventName

  if (eventNameInvalid) {
    return (
      <p className="text-[10px] text-rose-700">
        Selected column does not look like an event name. It contains numeric or empty values.
      </p>
    )
  }

  if (!col) {
    return (
      <p className="text-[10px] text-slate-500">
        No event name column detected — comparison will run without event-level granularity.
      </p>
    )
  }

  const { total, nonEmpty, distinct } = getColumnStats(rawRows, col)
  return (
    <p className="text-[10px] text-slate-600">
      <span className="font-medium text-slate-700">{nonEmpty.toLocaleString()}</span> of{' '}
      <span className="tabular-nums">{total.toLocaleString()}</span> rows have a value ·{' '}
      <span className="font-medium text-slate-700">{distinct.toLocaleString()}</span> distinct
      names
    </p>
  )
}

function EventCountMappingHint({ rawRows, mapping }) {
  const { eventCountInvalid } = getMappingValidationIssues(rawRows, mapping)
  if (!mapping.eventCount) return null
  if (!eventCountInvalid) return null
  return (
    <p className="text-[10px] text-rose-700">
      This column is not mostly numeric — it should not be used as event count.
    </p>
  )
}

function PayableFallbackNotice({ prevState, currState }) {
  const bothReady =
    prevState?.mapping &&
    currState?.mapping &&
    prevState.headers?.length &&
    currState.headers?.length
  if (!bothReady) return null
  const noPayable =
    !prevState.mapping.payableEventCount && !currState.mapping.payableEventCount
  if (!noPayable) return null
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      Payable events not mapped — using total events as fallback KPI.
    </div>
  )
}

function ColumnMappingForm({ title, headers, mapping, onChange, needsManualHint, rawRows }) {
  if (!headers.length) return null

  const NONE = '__none__'
  const opts = [NONE, ...headers]

  return (
    <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-slate-800">{title}</h3>
        {needsManualHint && (
          <span className="text-xs text-amber-800">
            Confirm or adjust column mapping
          </span>
        )}
      </div>
      <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto md:grid-cols-3">
        {TARGET_FIELDS.map((field) => (
          <label key={field} className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase text-slate-500">{field}</span>
            <select
              className={SELECT}
              value={mapping[field] || NONE}
              onChange={(e) =>
                onChange({
                  ...mapping,
                  [field]: e.target.value === NONE ? '' : e.target.value,
                })
              }
            >
              {opts.map((h) => (
                <option key={`${field}-${h}`} value={h}>
                  {h === NONE ? '— none —' : h}
                </option>
              ))}
            </select>
            {field === 'eventName' && (
              <EventNameMappingHint rawRows={rawRows} mapping={mapping} />
            )}
            {field === 'eventCount' && (
              <EventCountMappingHint rawRows={rawRows} mapping={mapping} />
            )}
          </label>
        ))}
      </div>
    </div>
  )
}

export default function FileUploadSection({
  prevState,
  currState,
  onPrevFile,
  onCurrFile,
  onPrevMapping,
  onCurrMapping,
  onCompare,
  onLoadMock,
  comparing,
}) {
  const idPrev = useId()
  const idCurr = useId()

  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end gap-6">
        <div>
          <label className={LABEL} htmlFor={idPrev}>
            Upload previous week
          </label>
          <input
            id={idPrev}
            type="file"
            accept=".csv,.xlsx,.xlsm,.xls"
            onChange={(e) => onPrevFile(e.target.files?.[0] || null)}
          />
          {prevState?.fileName && (
            <p className="mt-1 text-xs text-slate-500">{prevState.fileName}</p>
          )}
        </div>
        <div>
          <label className={LABEL} htmlFor={idCurr}>
            Upload current week
          </label>
          <input
            id={idCurr}
            type="file"
            accept=".csv,.xlsx,.xlsm,.xls"
            onChange={(e) => onCurrFile(e.target.files?.[0] || null)}
          />
          {currState?.fileName && (
            <p className="mt-1 text-xs text-slate-500">{currState.fileName}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onCompare}
            disabled={!prevState?.ready || !currState?.ready || comparing}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {comparing ? 'Working…' : 'Compare Data'}
          </button>
          <button
            type="button"
            onClick={onLoadMock}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Load mock data
          </button>
        </div>
      </div>

      <PayableFallbackNotice prevState={prevState} currState={currState} />

      {prevState?.headers && (
        <ColumnMappingForm
          title="Previous week — column mapping"
          headers={prevState.headers}
          mapping={prevState.mapping}
          onChange={onPrevMapping}
          needsManualHint={prevState.needsManual}
          rawRows={prevState.rows}
        />
      )}
      {currState?.headers && (
        <ColumnMappingForm
          title="Current week — column mapping"
          headers={currState.headers}
          mapping={currState.mapping}
          onChange={onCurrMapping}
          needsManualHint={currState.needsManual}
          rawRows={currState.rows}
        />
      )}
    </section>
  )
}
