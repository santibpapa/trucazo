'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Panel, Logo, Input, Button, Alert } from '@/components/ui'

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
    <main className="flex flex-col items-center justify-center min-h-screen p-6">
      <Panel className="w-full max-w-sm p-8 flex flex-col gap-6 animate-fade-up">
        <div className="flex flex-col items-center gap-2 text-center">
          <Logo size="md" />
          <p className="text-sm text-muted">Entrá a jugar</p>
        </div>

        {error && <Alert>{error}</Alert>}

        <div className="flex flex-col gap-4">
          <Input
            label="Email"
            name="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tu@email.com"
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          <Input
            label="Contraseña"
            name="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Tu contraseña"
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
        </div>

        <Button fullWidth size="lg" onClick={handleLogin} disabled={loading}>
          {loading ? 'Entrando…' : 'Iniciar sesión'}
        </Button>

        <p className="text-center text-sm text-muted">
          ¿No tenés cuenta?{' '}
          <Link href="/register" className="text-gold font-semibold hover:underline">
            Registrate gratis
          </Link>
        </p>
      </Panel>
    </main>
  )
}
