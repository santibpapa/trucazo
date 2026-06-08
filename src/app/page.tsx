import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-8 p-8">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-yellow-400 mb-2">🃏 Trucazo</h1>
        <p className="text-green-300 text-xl">Truco argentino 1vs1 con monedas ficticias</p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Link
          href="/login"
          className="bg-yellow-400 text-green-950 font-bold py-3 px-8 rounded-xl text-center text-lg hover:bg-yellow-300 transition"
        >
          Iniciar sesión
        </Link>
        <Link
          href="/register"
          className="border-2 border-yellow-400 text-yellow-400 font-bold py-3 px-8 rounded-xl text-center text-lg hover:bg-yellow-400 hover:text-green-950 transition"
        >
          Registrarse
        </Link>
      </div>

      <p className="text-green-600 text-sm">Cada jugador nuevo recibe 1000 monedas 🪙</p>
    </main>
  )
}