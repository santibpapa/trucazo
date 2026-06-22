'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Panel, Logo, Input, Button, Alert, CoinIcon } from '@/components/ui'

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
    <main className="flex flex-col items-center justify-center min-h-screen p-6">
      <Panel className="w-full max-w-sm p-8 flex flex-col gap-6 animate-fade-up">
        <div className="flex flex-col items-center gap-2 text-center">
          <Logo size="md" />
          <p className="text-sm text-muted">Creá tu cuenta</p>
        </div>

        {error && <Alert>{error}</Alert>}

        <div className="flex flex-col gap-4">
          <Input
            label="Nombre de usuario"
            name="username"
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="ej: ElTruco99"
          />
          <Input
            label="Email"
            name="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tu@email.com"
          />
          <Input
            label="Contraseña"
            name="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
          />
        </div>

        <Button fullWidth size="lg" onClick={handleRegister} disabled={loading}>
          {loading ? (
            'Creando cuenta…'
          ) : (
            <span className="inline-flex items-center gap-2">
              Registrarse y ganar <CoinIcon size={16} /> 1.000
            </span>
          )}
        </Button>

        <p className="text-center text-sm text-muted">
          ¿Ya tenés cuenta?{' '}
          <Link href="/login" className="text-gold font-semibold hover:underline">
            Iniciá sesión
          </Link>
        </p>
      </Panel>
    </main>
  )
}
