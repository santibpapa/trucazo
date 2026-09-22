export default function TournamentsLoading() {
  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-6xl px-4 py-6 sm:px-6" aria-busy="true">
      <div className="h-5 w-32 animate-pulse rounded bg-surface2" />
      <div className="mt-5 h-10 w-52 animate-pulse rounded bg-surface2" />
      <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map(item => <div key={item} className="h-48 animate-pulse rounded-2xl bg-surface" />)}
      </div>
      <span className="sr-only">Cargando torneos</span>
    </main>
  )
}
