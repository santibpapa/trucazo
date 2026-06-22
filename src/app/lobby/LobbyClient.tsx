'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile, Table } from '@/lib/types'
import { generatePrivateCode } from '@/lib/tables'
import { Button, Panel, Input, Modal, Coins, Logo, Alert, Toggle } from '@/components/ui'

interface Props {
  profile: Profile
  initialTables: Table[]
}

export default function LobbyClient({ profile, initialTables }: Props) {
  const router = useRouter()
  const [tables, setTables] = useState<Table[]>(initialTables)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinPrivate, setShowJoinPrivate] = useState(false)
  const [tableName, setTableName] = useState('')
  const [bet, setBet] = useState(10)
  const [isPrivate, setIsPrivate] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdCode, setCreatedCode] = useState('')
  const [createdTableId, setCreatedTableId] = useState('')

  const supabase = createClient()

  // Tiempo real
  useEffect(() => {
    const channel = supabase
      .channel('tables-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'tables',
      }, (payload) => {
        const newTable = payload.new as Table
        if (!newTable.is_private && newTable.status === 'waiting') {
          setTables(prev => {
            if (prev.find(t => t.id === newTable.id)) return prev
            return [newTable, ...prev]
          })
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'tables',
      }, (payload) => {
        const updated = payload.new as Table
        setTables(prev => prev.filter(t => t.id !== updated.id || updated.status === 'waiting'))
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'tables',
      }, (payload) => {
        setTables(prev => prev.filter(t => t.id !== payload.old.id))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    const interval = setInterval(async () => {
      const { data: myTables } = await supabase
        .from('tables')
        .select('*')
        .eq('creator_id', profile.id)
        .eq('status', 'playing')
        .limit(1)

      if (myTables && myTables.length > 0) {
        const { data: gameData } = await supabase
          .from('games')
          .select('status')
          .eq('id', myTables[0].id)
          .single()

        if (!gameData || gameData.status !== 'finished') {
          clearInterval(interval)
          router.push(`/game/${myTables[0].id}`)
        }
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [profile.id])

  async function handleCreateTable() {
    if (!tableName.trim()) {
      setError('Ponele un nombre a la mesa')
      return
    }
    if (bet < 10) {
      setError('La apuesta mínima es 10 monedas')
      return
    }
    if (bet > profile.coins) {
      setError('No tenés suficientes monedas')
      return
    }

    setLoading(true)
    setError('')

    const code = isPrivate ? generatePrivateCode() : null

    // create_table (security definer) valida el saldo, descuenta y crea la mesa, atómico
    const { data: table, error: tableError } = await supabase.rpc('create_table', {
      p_name: tableName.trim(),
      p_bet: bet,
      p_is_private: isPrivate,
      p_private_code: code,
    })

    if (tableError || !table) {
      setError(tableError?.message || 'Error al crear la mesa')
      setLoading(false)
      return
    }

    // Reflejar el descuento localmente (el servidor ya lo aplicó)
    profile.coins = profile.coins - bet

    if (isPrivate && code) {
      setCreatedTableId(table.id)
      setCreatedCode(code)
    } else {
      router.push(`/game/${table.id}`)
    }

    setLoading(false)
  }

  async function handleJoinTable(table: Table) {
    if (profile.coins < table.bet) {
      setError('No tenés suficientes monedas para unirte a esta mesa')
      return
    }

    setLoading(true)

    // join_table (security definer) valida saldo/disponibilidad, descuenta y arranca la partida
    const { error: joinError } = await supabase.rpc('join_table', { p_table_id: table.id })

    if (joinError) {
      setError('No se pudo unir a la mesa: ' + joinError.message)
      setLoading(false)
      return
    }

    // Reflejar el descuento localmente (el servidor ya lo aplicó)
    profile.coins = profile.coins - table.bet

    router.push(`/game/${table.id}`)
    setLoading(false)
  }

  async function handleJoinPrivate() {
    if (!joinCode.trim()) {
      setError('Ingresá el código de la mesa')
      return
    }

    const { data: table } = await supabase
      .from('tables')
      .select('*')
      .eq('private_code', joinCode.toUpperCase())
      .eq('status', 'waiting')
      .single()

    if (!table) {
      setError('Código inválido o la mesa ya no está disponible')
      return
    }

    await handleJoinTable(table)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (createdCode) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen gap-6 p-6">
        <Panel className="w-full max-w-sm p-8 text-center flex flex-col gap-5 animate-fade-up">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-gold">
              Mesa creada
            </span>
            <h2 className="font-display text-2xl font-bold text-cream">Compartí el código</h2>
          </div>
          <p className="text-sm text-muted">Pasale este código a tu rival para que se una.</p>
          <div className="rounded-2xl border border-gold/30 bg-base py-5 shadow-gold-ring">
            <p className="font-display text-4xl font-extrabold tracking-[0.3em] text-gold">
              {createdCode}
            </p>
          </div>
          <p className="text-sm text-subtle">Esperando que alguien se una…</p>
          <Button fullWidth onClick={() => router.push(`/game/${createdTableId}`)}>
            Ir a la sala de espera
          </Button>
        </Panel>
      </main>
    )
  }

  return (
    <main className="flex flex-col min-h-screen p-4 sm:p-6 gap-5 max-w-2xl mx-auto w-full">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 pt-1">
        <Logo size="md" />
        <div className="flex items-center gap-3 sm:gap-4">
          <Panel className="flex items-center gap-2 px-3 py-1.5 !rounded-full">
            <Coins amount={profile.coins} size="sm" />
          </Panel>
          <div className="hidden sm:flex flex-col items-end leading-tight">
            <span className="text-sm font-semibold text-cream">{profile.username}</span>
            <button
              onClick={handleLogout}
              className="text-xs text-subtle hover:text-negative transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="sm:hidden text-xs text-subtle hover:text-negative transition-colors"
          >
            Salir
          </button>
        </div>
      </header>

      {error && <Alert>{error}</Alert>}

      {/* Acciones principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button
          size="lg"
          fullWidth
          onClick={() => { setShowCreateModal(true); setError('') }}
        >
          <PlusIcon /> Crear mesa
        </Button>
        <Button
          variant="ghost"
          size="lg"
          fullWidth
          onClick={() => { setShowJoinPrivate(true); setError('') }}
        >
          <LockIcon /> Unirse con código
        </Button>
      </div>

      {/* Lista de mesas */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-cream">Mesas disponibles</h2>
          <span className="text-sm text-subtle tabular">{tables.length}</span>
        </div>

        {tables.length === 0 && (
          <Panel className="p-10 text-center flex flex-col gap-1 border-dashed">
            <p className="font-medium text-muted">No hay mesas disponibles</p>
            <p className="text-sm text-subtle">Creá una y esperá a un rival.</p>
          </Panel>
        )}

        <div className="flex flex-col gap-3">
          {tables.map((table, i) => (
            <Panel
              key={table.id}
              className="p-4 flex items-center justify-between gap-3 transition-shadow duration-200 hover:shadow-lift animate-fade-up"
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
            >
              <div className="min-w-0">
                <p className="font-semibold text-cream truncate">{table.name}</p>
                <p className="text-sm text-subtle truncate">por {table.creator_username}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex flex-col items-end leading-tight">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-subtle">
                    Apuesta
                  </span>
                  <Coins amount={table.bet} size="sm" />
                </div>
                {table.creator_id !== profile.id ? (
                  <Button
                    size="sm"
                    onClick={() => handleJoinTable(table)}
                    disabled={loading || profile.coins < table.bet}
                  >
                    Unirse
                  </Button>
                ) : (
                  <span className="text-xs font-semibold text-gold px-2">Tu mesa</span>
                )}
              </div>
            </Panel>
          ))}
        </div>
      </section>

      {/* Modal crear mesa */}
      <Modal
        open={showCreateModal}
        onClose={() => { setShowCreateModal(false); setError('') }}
        title="Crear mesa"
      >
        {error && <Alert>{error}</Alert>}

        <Input
          label="Nombre de la mesa"
          name="tableName"
          type="text"
          value={tableName}
          onChange={e => setTableName(e.target.value)}
          placeholder="ej: La mesa del campeón"
        />

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="bet" className="text-sm font-medium text-muted">Apuesta</label>
            <span className="text-xs text-subtle">
              Tenés <Coins amount={profile.coins} size="sm" className="!text-xs align-middle" />
            </span>
          </div>
          <Input
            id="bet"
            name="bet"
            type="number"
            value={bet}
            onChange={e => setBet(Number(e.target.value))}
            min={10}
            max={profile.coins}
          />
        </div>

        <Toggle checked={isPrivate} onChange={setIsPrivate} label="Mesa privada" />

        <div className="flex gap-3 pt-1">
          <Button
            variant="ghost"
            fullWidth
            onClick={() => { setShowCreateModal(false); setError('') }}
          >
            Cancelar
          </Button>
          <Button fullWidth onClick={handleCreateTable} disabled={loading}>
            {loading ? 'Creando…' : 'Crear'}
          </Button>
        </div>
      </Modal>

      {/* Modal unirse con código */}
      <Modal
        open={showJoinPrivate}
        onClose={() => { setShowJoinPrivate(false); setError(''); setJoinCode('') }}
        title="Unirse con código"
      >
        {error && <Alert>{error}</Alert>}

        <Input
          label="Código de 6 dígitos"
          name="joinCode"
          type="text"
          value={joinCode}
          onChange={e => setJoinCode(e.target.value.toUpperCase())}
          placeholder="ABC123"
          maxLength={6}
          className="text-center text-2xl font-display font-bold tracking-[0.3em] uppercase"
        />

        <div className="flex gap-3 pt-1">
          <Button
            variant="ghost"
            fullWidth
            onClick={() => { setShowJoinPrivate(false); setError(''); setJoinCode('') }}
          >
            Cancelar
          </Button>
          <Button fullWidth onClick={handleJoinPrivate} disabled={loading}>
            {loading ? 'Buscando…' : 'Unirse'}
          </Button>
        </div>
      </Modal>
    </main>
  )
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2.2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
