export default function TournamentsLoading() {
  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-3xl px-4 py-5 sm:px-6" aria-busy="true">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 animate-pulse rounded-xl bg-surface2" />
        <div className="h-8 w-32 animate-pulse rounded bg-surface2" />
      </div>
      <div className="mt-6 h-10 animate-pulse rounded-xl bg-surface" />
      <div className="mt-7 grid gap-3.5 sm:grid-cols-2">
        {[0, 1].map(item => <div key={item} className="h-56 animate-pulse rounded-2xl bg-surface" />)}
      </div>
      <span className="sr-only">Cargando torneos</span>
    </main>
  )
}
