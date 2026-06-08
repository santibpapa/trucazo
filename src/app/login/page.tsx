'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!email || !password) {
      setError('Completá todos los campos')
      return
    }

    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
      return
    }

    router.push('/lobby')
    router.refresh()
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="bg-green-900 border border-green-700 rounded-2xl p-8 w-full max-w-sm flex flex-col gap-5">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-yellow-400">🃏 Trucazo</h1>
          <p className="text-green-400 mt-1">Iniciar sesión</p>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-300 rounded-lg p-3 text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-green-300 text-sm mb-1 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="w-full bg-green-800 border border-green-600 rounded-lg px-4 py-2.5 text-white placeholder-green-600 focus:outline-none focus:border-yellow-400"
            />
          </div>

          <div>
            <label className="text-green-300 text-sm mb-1 block">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Tu contraseña"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="w-full bg-green-800 border border-green-600 rounded-lg px-4 py-2.5 text-white placeholder-green-600 focus:outline-none focus:border-yellow-400"
            />
          </div>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="bg-yellow-400 text-green-950 font-bold py-3 rounded-xl hover:bg-yellow-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Entrando...' : 'Iniciar sesión'}
        </button>

        <p className="text-center text-green-500 text-sm">
          ¿No tenés cuenta?{' '}
          <Link href="/register" className="text-yellow-400 hover:underline">
            Registrate gratis
          </Link>
        </p>
      </div>
    </main>
  )
}