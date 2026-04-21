export default function Header() {
  return (
    <header className="border-b border-slate-200 bg-white px-8 py-6">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        Weekly Campaign Comparison Dashboard
      </h1>
      <p className="mt-1 max-w-3xl text-sm text-slate-500">
        Compare payable-first campaign performance between two weekly exports. Uploads
        stay in your browser — there is no server or authentication layer in this MVP.
      </p>
    </header>
  )
}
