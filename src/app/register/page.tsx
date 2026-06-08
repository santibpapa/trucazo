'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegister() {
    if (!email || !password || !username) {
      setError('Completá todos los campos')
      return
    }
    if (username.length < 3) {
      setError('El nombre de usuario debe tener al menos 3 caracteres')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)
    setError('')

    const supabase = createClient()

    const { data: existing } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single()

    if (existing) {
      setError('Ese nombre de usuario ya está en uso')
      setLoading(false)
      return
    }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (signUpData.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: signUpData.user.id,
        username: username,
        coins: 1000,
      })

      if (profileError) {
        setError('Error al crear el perfil: ' + profileError.message)
        setLoading(false)
        return
      }
    }

    router.push('/lobby')
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="bg-green-900 border border-green-700 rounded-2xl p-8 w-full max-w-sm flex flex-col gap-5">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-yellow-400">🃏 Trucazo</h1>
          <p className="text-green-400 mt-1">Crear cuenta</p>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-300 rounded-lg p-3 text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-green-300 text-sm mb-1 block">Nombre de usuario</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="ej: ElTruco99"
              className="w-full bg-green-800 border border-green-600 rounded-lg px-4 py-2.5 text-white placeholder-green-600 focus:outline-none focus:border-yellow-400"
            />
          </div>

          <div>
            <label className="text-green-300 text-sm mb-1 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full bg-green-800 border border-green-600 rounded-lg px-4 py-2.5 text-white placeholder-green-600 focus:outline-none focus:border-yellow-400"
            />
          </div>

          <div>
            <label className="text-green-300 text-sm mb-1 block">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full bg-green-800 border border-green-600 rounded-lg px-4 py-2.5 text-white placeholder-green-600 focus:outline-none focus:border-yellow-400"
            />
          </div>
        </div>

        <button
          onClick={handleRegister}
          disabled={loading}
          className="bg-yellow-400 text-green-950 font-bold py-3 rounded-xl hover:bg-yellow-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creando cuenta...' : 'Registrarse y ganar 1000 🪙'}
        </button>

        <p className="text-center text-green-500 text-sm">
          ¿Ya tenés cuenta?{' '}
          <Link href="/login" className="text-yellow-400 hover:underline">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </main>
  )
}