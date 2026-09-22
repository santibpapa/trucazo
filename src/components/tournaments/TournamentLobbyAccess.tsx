import Link from 'next/link'

export default function TournamentLobbyAccess() {
  return (
    <Link
      href="/torneos"
      aria-label="Abrir torneos"
      className="group pointer-events-auto fixed bottom-[calc(10.5rem+env(safe-area-inset-bottom))] right-4 z-30 flex items-center gap-2 rounded-full border border-gold/50 bg-surface px-3 py-2.5 text-gold shadow-lift transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold lg:bottom-[7.25rem] lg:right-6 xl:right-[21.5rem]"
    >
      <span aria-hidden="true" className="text-2xl leading-none">🏆</span>
      <span className="text-sm font-extrabold">Torneos</span>
    </Link>
  )
}
