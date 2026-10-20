export default function AdminTournamentsLoading() {
  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-6xl px-4 py-6 sm:px-6" aria-busy="true">
      <div className="h-5 w-32 animate-pulse rounded bg-surface2" />
      <div className="mt-5 h-10 w-64 animate-pulse rounded bg-surface2" />
      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map(item => <div key={item} className="h-28 animate-pulse rounded-2xl bg-surface" />)}
      </div>
      <span className="sr-only">Cargando administración de torneos</span>
    </main>
  )
}
