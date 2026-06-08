'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile, Table } from '@/lib/types'
import { generatePrivateCode } from '@/lib/tables'

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
  const [privateCode, setPrivateCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdCode, setCreatedCode] = useState('')

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

  async function refreshTables() {
    const { data } = await supabase
      .from('tables')
      .select('*')
      .eq('status', 'waiting')
      .eq('is_private', false)
      .order('created_at', { ascending: false })
    if (data) setTables(data)
  }

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

    const { data: table, error: tableError } = await supabase
      .from('tables')
      .insert({
        name: tableName.trim(),
        creator_id: profile.id,
        creator_username: profile.username,
        bet,
        is_private: isPrivate,
        private_code: code,
      })
      .select()
      .single()

    if (tableError) {
      setError('Error al crear la mesa')
      setLoading(false)
      return
    }

    // Descontar monedas
    await supabase
      .from('profiles')
      .update({ coins: profile.coins - bet })
      .eq('id', profile.id)

    // Actualizar monedas localmente
    profile.coins = profile.coins - bet

    if (isPrivate && code) {
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

    const { data, error: joinError } = await supabase
      .from('tables')
      .update({
        opponent_id: profile.id,
        opponent_username: profile.username,
        status: 'playing',
      })
      .eq('id', table.id)
      .select()

    console.log('Join result:', data, joinError)

    if (joinError || !data || data.length === 0) {
      setError('No se pudo unir a la mesa: ' + (joinError?.message || 'sin datos'))
      setLoading(false)
      return
    }

    await supabase
      .from('profiles')
      .update({ coins: profile.coins - table.bet })
      .eq('id', profile.id)

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
      <main className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
        <div className="bg-green-900 border border-green-700 rounded-2xl p-8 w-full max-w-sm text-center flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-yellow-400">Mesa creada 🎉</h2>
          <p className="text-green-300">Compartí este código con tu rival:</p>
          <div className="bg-green-800 rounded-xl p-4">
            <p className="text-4xl font-bold text-white tracking-widest">{createdCode}</p>
          </div>
          <p className="text-green-400 text-sm">Esperando que alguien se una...</p>
          <button
            onClick={() => router.push(`/game/${createdCode}`)}
            className="bg-yellow-400 text-green-950 font-bold py-3 rounded-xl hover:bg-yellow-300 transition"
          >
            Ir a la sala de espera
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="flex flex-col min-h-screen p-4 gap-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between py-2">
        <h1 className="text-2xl font-bold text-yellow-400">🃏 Trucazo</h1>
        <div className="flex items-center gap-4">
          <span className="text-yellow-400 font-bold">🪙 {profile.coins}</span>
          <span className="text-green-400 text-sm">{profile.username}</span>
          <button
            onClick={handleLogout}
            className="text-green-600 hover:text-red-400 transition text-sm"
          >
            Salir
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-300 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {/* Botones principales */}
      <div className="flex gap-3">
        <button
          onClick={() => { setShowCreateModal(true); setError('') }}
          className="flex-1 bg-yellow-400 text-green-950 font-bold py-3 rounded-xl hover:bg-yellow-300 transition"
        >
          + Crear mesa
        </button>
        <button
          onClick={() => { setShowJoinPrivate(true); setError('') }}
          className="flex-1 border-2 border-yellow-400 text-yellow-400 font-bold py-3 rounded-xl hover:bg-yellow-400 hover:text-green-950 transition"
        >
          🔒 Unirse con código
        </button>
      </div>

      {/* Lista de mesas */}
      <div className="flex flex-col gap-3">
        <h2 className="text-green-300 font-bold">Mesas disponibles</h2>

        {tables.length === 0 && (
          <div className="bg-green-900/50 border border-green-800 rounded-xl p-8 text-center">
            <p className="text-green-500">No hay mesas disponibles</p>
            <p className="text-green-600 text-sm mt-1">¡Creá una y esperá un rival!</p>
          </div>
        )}

        {tables.map(table => (
          <div
            key={table.id}
            className="bg-green-900 border border-green-700 rounded-xl p-4 flex items-center justify-between"
          >
            <div>
              <p className="font-bold text-white">{table.name}</p>
              <p className="text-green-400 text-sm">por {table.creator_username}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-yellow-400 font-bold">🪙 {table.bet}</span>
              {table.creator_id !== profile.id ? (
                <button
                  onClick={() => handleJoinTable(table)}
                  disabled={loading || profile.coins < table.bet}
                  className="bg-yellow-400 text-green-950 font-bold py-2 px-4 rounded-lg hover:bg-yellow-300 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Unirse
                </button>
              ) : (
                <span className="text-green-500 text-sm">Tu mesa</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal crear mesa */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-green-900 border border-green-700 rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4">
            <h2 className="text-xl font-bold text-yellow-400">Crear mesa</h2>

            {error && (
              <div className="bg-red-900/50 border border-red-500 text-red-300 rounded-lg p-3 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="text-green-300 text-sm mb-1 block">Nombre de la mesa</label>
              <input
                type="text"
                value={tableName}
                onChange={e => setTableName(e.target.value)}
                placeholder="ej: La mesa del campeón"
                className="w-full bg-green-800 border border-green-600 rounded-lg px-4 py-2.5 text-white placeholder-green-600 focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="text-green-300 text-sm mb-1 block">
                Apuesta (tenés 🪙 {profile.coins})
              </label>
              <input
                type="number"
                value={bet}
                onChange={e => setBet(Number(e.target.value))}
                min={10}
                max={profile.coins}
                className="w-full bg-green-800 border border-green-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPrivate(!isPrivate)}
                className={`w-12 h-6 rounded-full transition ${isPrivate ? 'bg-yellow-400' : 'bg-green-700'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform mx-0.5 ${isPrivate ? 'translate-x-6' : ''}`} />
              </button>
              <span className="text-green-300 text-sm">Mesa privada</span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowCreateModal(false); setError('') }}
                className="flex-1 border border-green-600 text-green-400 font-bold py-2.5 rounded-xl hover:bg-green-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateTable}
                disabled={loading}
                className="flex-1 bg-yellow-400 text-green-950 font-bold py-2.5 rounded-xl hover:bg-yellow-300 transition disabled:opacity-50"
              >
                {loading ? 'Creando...' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal unirse con código */}
      {showJoinPrivate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-green-900 border border-green-700 rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4">
            <h2 className="text-xl font-bold text-yellow-400">Unirse con código</h2>

            {error && (
              <div className="bg-red-900/50 border border-red-500 text-red-300 rounded-lg p-3 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="text-green-300 text-sm mb-1 block">Código de 6 dígitos</label>
              <input
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ej: ABC123"
                maxLength={6}
                className="w-full bg-green-800 border border-green-600 rounded-lg px-4 py-2.5 text-white placeholder-green-600 focus:outline-none focus:border-yellow-400 tracking-widest text-center text-xl font-bold uppercase"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowJoinPrivate(false); setError(''); setJoinCode('') }}
                className="flex-1 border border-green-600 text-green-400 font-bold py-2.5 rounded-xl hover:bg-green-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleJoinPrivate}
                disabled={loading}
                className="flex-1 bg-yellow-400 text-green-950 font-bold py-2.5 rounded-xl hover:bg-yellow-300 transition disabled:opacity-50"
              >
                {loading ? 'Buscando...' : 'Unirse'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}