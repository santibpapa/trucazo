'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Profile, Table } from '@/lib/types'
import { generatePrivateCode } from '@/lib/tables'
import { Button, Panel, Input, Modal, Coins, Logo, Alert, Toggle, Avatar, cn } from '@/components/ui'
import { useCommunity } from '@/lib/useCommunity'
import FriendsPanel from '@/components/FriendsPanel'
import ChatGlobal from '@/components/ChatGlobal'
import ObjectivesFloatingButton from '@/components/objectives/ObjectivesFloatingButton'
import type { ObjectivesData } from '@/lib/objectives'

interface Props {
  profile: Profile
  initialTables: Table[]
  activeGameId: string | null
  myMedal: string
  objectivesEnabled: boolean
  initialObjectives: ObjectivesData | null
}

// "Jugar ya": mesa pública, apuesta fija y partida a 30. Un solo toque y a jugar.
const JUGAR_YA_APUESTA = 50
const JUGAR_YA_PUNTOS = 30

export default function LobbyClient({
  profile,
  initialTables,
  activeGameId,
  myMedal,
  objectivesEnabled,
  initialObjectives,
}: Props) {
  const router = useRouter()
  const [tables, setTables] = useState<Table[]>(initialTables)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinPrivate, setShowJoinPrivate] = useState(false)
  const [tableName, setTableName] = useState('')
  const [bet, setBet] = useState('10')
  const [targetScore, setTargetScore] = useState(30)
  const [timeLimit, setTimeLimit] = useState(30)
  const [isPrivate, setIsPrivate] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdCode, setCreatedCode] = useState('')
  const [createdTableId, setCreatedTableId] = useState('')
  const [coins, setCoins] = useState(profile.coins)
  // Amigos: presencia, solicitudes e invitaciones para el panel social de escritorio
  // y la insignia de Comunidad en la navegación móvil.
  const community = useCommunity(profile.id)
  const [menuOpen, setMenuOpen] = useState(false)
  const friendsBadge =
    (community.data?.incoming.length ?? 0) + (community.data?.invites_in.length ?? 0)

  const supabase = createClient()

  // Fotos y marcos de los creadores de las mesas visibles (profiles es de lectura pública).
  const [creatorAvatars, setCreatorAvatars] = useState<Record<string, string | null>>({})
  const [creatorFrames, setCreatorFrames] = useState<Record<string, string | null>>({})
  useEffect(() => {
    const ids = Array.from(new Set(tables.map(t => t.creator_id))).filter(id => !(id in creatorAvatars))
    if (ids.length === 0) return
    supabase.from('profiles').select('id, avatar_url, active_frame').in('id', ids).then(({ data }) => {
      if (!data) return
      setCreatorAvatars(prev => {
        const next = { ...prev }
        for (const p of data as { id: string; avatar_url: string | null }[]) next[p.id] = p.avatar_url
        return next
      })
      setCreatorFrames(prev => {
        const next = { ...prev }
        for (const p of data as { id: string; active_frame: string | null }[]) next[p.id] = p.active_frame
        return next
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables])

  // Que el lobby no se vea vacío: si quedan pocas mesas esperando, el servidor
  // abre un par con los jugadores de la casa. Si ya hay mesas de gente de
  // verdad, no hace nada (y ahí no refrescamos la lista al pedo).
  useEffect(() => {
    let cancelado = false
    supabase.rpc('ensure_lobby_tables').then(({ data }) => {
      if (cancelado || !data) return
      supabase
        .from('tables')
        .select('*')
        .eq('status', 'waiting')
        .eq('is_private', false)
        .order('created_at', { ascending: false })
        .then(({ data: rows }) => {
          if (!cancelado && rows) setTables(rows as Table[])
        })
    })
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    const betNum = Number(bet)
    if (!bet.trim() || Number.isNaN(betNum) || betNum < 10) {
      setError('La apuesta mínima es 10 monedas')
      return
    }
    if (betNum > coins) {
      setError('No tenés suficientes monedas')
      return
    }

    setLoading(true)
    setError('')

    const code = isPrivate ? generatePrivateCode() : null

    // create_table (security definer) valida el saldo, descuenta y crea la mesa, atómico
    const { data: table, error: tableError } = await supabase.rpc('create_table', {
      p_name: tableName.trim(),
      p_bet: betNum,
      p_is_private: isPrivate,
      p_private_code: code,
      p_target_score: targetScore,
      p_time_limit: timeLimit,
    })

    if (tableError || !table) {
      setError(tableError?.message || 'Error al crear la mesa')
      setLoading(false)
      return
    }

    // Reflejar el descuento localmente (el servidor ya lo aplicó)
    setCoins(c => c - betNum)

    // Aviso al dueño por Telegram (best-effort). Solo mesas públicas y no las
    // que abre el propio dueño (admin). keepalive: que el pedido igual salga
    // aunque enseguida naveguemos a la partida.
    if (!isPrivate && !profile.is_admin) {
      fetch('/api/notify-mesa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        // Solo el id: el texto del aviso lo arma el servidor con datos de la
        // base, así nadie puede inventarlo ni hacerse pasar por otro.
        body: JSON.stringify({ tableId: table.id }),
      }).catch(() => {})
    }

    if (isPrivate && code) {
      setCreatedTableId(table.id)
      setCreatedCode(code)
    } else {
      router.push(`/game/${table.id}`)
    }

    setLoading(false)
  }

  // "Jugar ya": abre una mesa pública de 50 a 30 puntos y te manda derecho a
  // ella. Si en unos segundos no entra nadie, la sala de espera invita a un
  // jugador de la casa, así nunca te quedás sin partida.
  async function handleJugarYa() {
    if (loading) return
    if (coins < JUGAR_YA_APUESTA) {
      setError(`Necesitás ${JUGAR_YA_APUESTA} monedas para jugar ya`)
      return
    }

    setLoading(true)
    setError('')

    const { data: table, error: tableError } = await supabase.rpc('create_table', {
      p_name: `Mesa de ${profile.username}`,
      p_bet: JUGAR_YA_APUESTA,
      p_is_private: false,
      p_private_code: null,
      p_target_score: JUGAR_YA_PUNTOS,
      p_time_limit: 30,
    })

    if (tableError || !table) {
      setError(tableError?.message || 'Error al crear la mesa')
      setLoading(false)
      return
    }

    setCoins(c => c - JUGAR_YA_APUESTA)
    router.push(`/game/${table.id}`)
    setLoading(false)
  }

  async function handleJoinTable(table: Table) {
    if (coins < table.bet) {
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
    setCoins(c => c - table.bet)

    router.push(`/game/${table.id}`)
    setLoading(false)
  }

  // Entrar con código. El navegador ya no busca la mesa por su código (eso
  // permitía leer los códigos ajenos): manda el código y el servidor hace todo
  // junto — lo busca, valida y descuenta la apuesta una sola vez.
  async function handleJoinPrivate() {
    if (!joinCode.trim()) {
      setError('Ingresá el código de la mesa')
      return
    }

    setLoading(true)
    setError('')

    const { data: table, error: joinError } = await supabase.rpc('join_table_by_code', {
      p_code: joinCode.trim().toUpperCase(),
    })

    if (joinError || !table) {
      const m = joinError?.message ?? ''
      setError(
        m.includes('monedas') ? 'No tenés suficientes monedas para esta mesa'
          : m.includes('propia') ? 'Esa mesa la creaste vos'
            : 'Código inválido o la mesa ya no está disponible',
      )
      setLoading(false)
      return
    }

    const joined = table as Table
    setCoins(c => c - joined.bet)
    router.push(`/game/${joined.id}`)
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Bonus anti-quiebra: solo se puede reclamar si te quedaste sin monedas para jugar.
  async function handleClaimBonus() {
    setLoading(true)
    setError('')
    const { data, error: bonusError } = await supabase.rpc('claim_bonus')
    if (bonusError || data == null) {
      setError(bonusError?.message || 'No se pudo reclamar el bonus')
      setLoading(false)
      return
    }
    setCoins(data as number)
    setLoading(false)
  }

  if (createdCode) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 p-6">
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
    <div className="min-h-[100dvh] lg:flex">
      {/* Menú lateral (solo compu) */}
      <aside className="hidden lg:flex lg:flex-col w-56 shrink-0 border-r border-line bg-surface/40 p-4 gap-1 sticky top-0 h-screen">
        <div className="px-2 py-3">
          <Logo size="md" />
        </div>
        <nav className="flex flex-col gap-1 mt-2">
          <NavItem href="/lobby" icon={<HomeIcon />} label="Home" active />
          <NavItem href="/historia" icon={<SwordsIcon />} label="Modo Historia" />
          <NavItem href="/ranking" icon={<RankIcon />} label="Ranking" />
          <NavItem href="/comunidad" icon={<UsersIcon />} label="Comunidad" badge={friendsBadge} />
          <NavItem href="/tienda" icon={<StoreIcon />} label="Tienda" />
        </nav>

        {/* Cuenta: saldo, perfil y salir — anclado abajo del menú */}
        <div className="mt-auto flex flex-col gap-1.5 border-t border-line pt-3">
          <div className="flex items-center justify-between rounded-xl bg-surface2 border border-line px-3 py-2">
            <span className="text-xs text-subtle">Saldo</span>
            <Coins amount={coins} size="sm" />
          </div>
          <Link
            href="/profile"
            className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 hover:bg-surface2 transition-colors group"
          >
            <Avatar url={profile.avatar_url} name={profile.username} size={36} frame={profile.active_frame} medal={myMedal} className="border-gold/40" />
            <span className="flex flex-col leading-tight min-w-0">
              <span className="text-sm font-semibold text-cream truncate group-hover:text-gold transition-colors">
                {profile.username}
              </span>
              <span className="text-xs text-subtle">Ver perfil</span>
            </span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium text-subtle hover:text-negative hover:bg-surface2 transition-colors"
          >
            <LogoutIcon /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Columna central */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Barra superior (solo celular/tablet: en compu todo esto vive en el menú lateral) */}
        <header className="flex lg:hidden items-center justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-5">
          <Logo size="md" />

          {/* Ícono de perfil con menucito (perfil / cerrar sesión) */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Perfil"
              className="rounded-full transition-opacity hover:opacity-90"
            >
              <Avatar url={profile.avatar_url} name={profile.username} size={40} frame={profile.active_frame} medal={myMedal} className="border-gold/40" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 z-40 w-48 rounded-xl border border-line bg-surface shadow-lift p-1.5 animate-fade-up">
                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-lg px-3 py-2 text-sm font-medium text-cream hover:bg-surface2 transition-colors"
                  >
                    Mi perfil
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left rounded-lg px-3 py-2 text-sm font-medium text-subtle hover:text-negative hover:bg-surface2 transition-colors"
                  >
                    Cerrar sesión
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Tira de nombre + monedas (solo celular) */}
        <div className="lg:hidden flex items-center justify-center gap-2 border-y border-line bg-surface/40 px-4 py-1.5 mt-3 text-sm">
          <span className="text-muted truncate max-w-[45%]">{profile.username}</span>
          <span className="text-subtle">·</span>
          <Coins amount={coins} size="sm" />
        </div>

        <main className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 lg:mx-0 lg:max-w-none lg:pb-28 lg:pt-6 xl:mx-0">
          {error && <Alert>{error}</Alert>}

          {/* Volver a la partida en curso */}
          {activeGameId && (
            <Panel className="p-4 flex items-center justify-between gap-3 border-gold/50 bg-gold/10 shadow-gold-ring">
              <div className="min-w-0">
                <p className="font-semibold text-cream">Tenés una partida en curso</p>
                <p className="text-sm text-subtle">Volvé para seguir jugando.</p>
              </div>
              <Button size="sm" onClick={() => router.push(`/game/${activeGameId}`)} className="shrink-0">
                Volver a la partida
              </Button>
            </Panel>
          )}

          {objectivesEnabled && (
            <ObjectivesFloatingButton initialData={initialObjectives} onCoinsChange={setCoins} />
          )}

          {/* Anti-quiebra: si te quedaste sin monedas para jugar, reclamá el bonus */}
          {coins < 10 && (
            <Panel className="p-4 flex items-center justify-between gap-3 border-gold/40 bg-gold/5">
              <div className="min-w-0">
                <p className="font-semibold text-cream">Te quedaste sin monedas</p>
                <p className="text-sm text-subtle">Reclamá un bonus para seguir jugando.</p>
              </div>
              <Button size="sm" onClick={handleClaimBonus} disabled={loading} className="shrink-0">
                Reclamar 100
              </Button>
            </Panel>
          )}

          {/* Acciones principales */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              size="md"
              fullWidth
              onClick={() => { setShowCreateModal(true); setError('') }}
              className="!shadow-[0_6px_18px_-7px_rgba(201,162,75,0.4)]"
            >
              <PlusIcon /> Crear mesa
            </Button>
            <Button
              variant="ghost"
              size="md"
              fullWidth
              onClick={() => { setShowJoinPrivate(true); setError('') }}
            >
              <LockIcon /> Unirse
            </Button>
          </div>

          {/* Atajo: una mesa lista y a jugar, sin elegir nada */}
          <Button
            size="lg"
            fullWidth
            onClick={handleJugarYa}
            disabled={loading || coins < JUGAR_YA_APUESTA}
            className="-mt-2 !shadow-[0_8px_22px_-8px_rgba(201,162,75,0.55)]"
          >
            <BoltIcon /> Jugar ya
            <span className="ml-1 rounded-full bg-ink/15 px-2 py-0.5 text-xs font-bold">
              {JUGAR_YA_APUESTA} monedas · a {JUGAR_YA_PUNTOS}
            </span>
          </Button>

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

            <div className="grid gap-3 sm:grid-cols-2">
              {tables.map((table, i) => (
                <Panel
                  key={table.id}
                  className="p-4 flex flex-col gap-3 transition-shadow duration-200 hover:shadow-lift animate-fade-up"
                  style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                >
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <p className="font-semibold text-cream truncate">{table.name}</p>
                    <span className="shrink-0 rounded-full border border-line bg-surface2 px-2 py-0.5 text-[10px] font-bold text-muted">
                      a {table.target_score}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 -mt-1.5 min-w-0">
                    <Avatar url={creatorAvatars[table.creator_id]} name={table.creator_username} size={22} frame={creatorFrames[table.creator_id]} />
                    <p className="text-sm text-subtle truncate">por {table.creator_username}</p>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col leading-tight">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-subtle">
                        Apuesta
                      </span>
                      <Coins amount={table.bet} size="sm" />
                    </div>
                    {table.creator_id !== profile.id ? (
                      <Button
                        size="sm"
                        onClick={() => handleJoinTable(table)}
                        disabled={loading || coins < table.bet}
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
        </main>
      </div>

      {/* Panel social (solo compu ancha): amigos + chat global */}
      <aside className="hidden xl:flex xl:flex-col w-80 shrink-0 border-l border-line sticky top-0 h-screen">
        <div className="p-4 border-b border-line max-h-[44%] overflow-y-auto">
          <h3 className="font-display font-bold text-cream mb-3">Amigos</h3>
          <FriendsPanel c={community} compact />
        </div>
        <div className="flex-1 min-h-0 p-4">
          <ChatGlobal myId={profile.id} isAdmin={!!profile.is_admin} className="h-full" />
        </div>
      </aside>

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
              Tenés <Coins amount={coins} size="sm" className="!text-xs align-middle" />
            </span>
          </div>
          <Input
            id="bet"
            name="bet"
            type="number"
            inputMode="numeric"
            value={bet}
            onChange={e => setBet(e.target.value.replace(/[^0-9]/g, ''))}
            min={10}
            max={coins}
          />
        </div>

        {/* Puntaje objetivo de la partida */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-muted">Puntos</label>
          <div className="grid grid-cols-2 gap-2">
            {[15, 30].map(pts => (
              <button
                key={pts}
                type="button"
                onClick={() => setTargetScore(pts)}
                className={`rounded-xl border py-2.5 font-display font-bold transition-colors ${
                  targetScore === pts
                    ? 'border-gold bg-gold/15 text-gold'
                    : 'border-line bg-surface2 text-muted hover:text-cream'
                }`}
              >
                A {pts}
              </button>
            ))}
          </div>
        </div>

        {/* Tiempo por jugada (se va al mazo si se agota; al 3er mazo por tiempo, pierde) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-muted">Tiempo por jugada</label>
          <div className="grid grid-cols-2 gap-2">
            {[15, 30].map(secs => (
              <button
                key={secs}
                type="button"
                onClick={() => setTimeLimit(secs)}
                className={`rounded-xl border py-2.5 font-display font-bold transition-colors ${
                  timeLimit === secs
                    ? 'border-gold bg-gold/15 text-gold'
                    : 'border-line bg-surface2 text-muted hover:text-cream'
                }`}
              >
                {secs}s
              </button>
            ))}
          </div>
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

      {/* Barra móvil: cinco destinos. Campaña ocupa el centro y se eleva como
          acceso principal; chat y amigos viven juntos dentro de Comunidad. */}
      <nav
        aria-label="Navegación principal"
        className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 flex min-h-[calc(4.25rem+env(safe-area-inset-bottom))] items-stretch border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <BottomTab href="/lobby" icon={<HomeIcon size={22} />} label="Home" active />
        <BottomTab href="/ranking" icon={<RankIcon size={22} />} label="Ranking" />
        <CampaignBottomTab />
        <BottomTab href="/tienda" icon={<StoreIcon size={22} />} label="Tienda" />
        <BottomTab
          href="/comunidad"
          icon={<UsersIcon size={22} />}
          label="Comunidad"
          badge={friendsBadge}
        />
      </nav>
    </div>
  )
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

// Rayo: el atajo para arrancar una partida sin configurar nada.
function BoltIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5z" />
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

function SwordsIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.5 17.5 3 6V3h3l11.5 11.5" />
      <path d="m13 19 6-6M16 16l4 4M19 21l2-2" />
      <path d="M14.5 6.5 18 3h3v3l-3.5 3.5" />
      <path d="m5 14 6 6M8 17l-4 4M5 19l-2-2" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  )
}

function HomeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  )
}

function StoreIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 8 5.5 3h13L20 8" />
      <path d="M4 8h16v2.5a2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-5 0V8Z" />
      <path d="M5.5 12.5V21h13v-8.5" />
      <path d="M9.5 21v-5h5v5" />
    </svg>
  )
}

// Podio (1-2-3): representa el ranking.
function RankIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="6" height="12" />
      <rect x="3" y="13" width="6" height="8" />
      <rect x="15" y="11" width="6" height="10" />
    </svg>
  )
}

function CampaignBottomTab() {
  return (
    <Link
      href="/historia"
      aria-label="Abrir Modo Campaña"
      className="group relative min-w-0 flex-1 focus-visible:outline-none"
    >
      <span className="absolute left-1/2 -top-7 flex -translate-x-1/2 flex-col items-center gap-0.5">
        <span className="campaign-nav-glow relative block h-[4.25rem] w-[4.25rem] rounded-full p-[3px] transition-transform duration-200 group-hover:-translate-y-0.5 group-active:scale-95 group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-4 group-focus-visible:outline-gold">
          <span className="relative block h-full w-full overflow-hidden rounded-full border border-gold/80 bg-surface2 shadow-[inset_0_0_0_1px_rgba(255,239,177,0.2)]">
            <Image
              src="/lobby/campana-nav.webp"
              alt=""
              fill
              sizes="68px"
              className="object-cover"
              aria-hidden="true"
            />
            <span className="absolute inset-0 rounded-full bg-gradient-to-t from-black/30 via-transparent to-gold/10" />
          </span>
        </span>
        <span className="whitespace-nowrap text-[10px] font-bold text-gold [text-shadow:0_1px_4px_rgba(0,0,0,0.9)]">
          Campaña
        </span>
      </span>
    </Link>
  )
}

function BottomTab({
  href, onClick, icon, label, active = false, badge = 0,
}: {
  href?: string; onClick?: () => void; icon: React.ReactNode; label: string; active?: boolean; badge?: number
}) {
  const inner = (
    <span className={cn('flex h-full flex-col items-center justify-center gap-0.5 pt-2 pb-1.5', active ? 'text-gold' : 'text-muted')}>
      <span className="relative">
        {icon}
        {badge > 0 && (
          <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-gold text-ink text-[10px] font-bold flex items-center justify-center">
            {badge}
          </span>
        )}
      </span>
      <span className="text-[10px] font-semibold">{label}</span>
    </span>
  )
  return href ? (
    <Link href={href} className="flex-1">{inner}</Link>
  ) : (
    <button onClick={onClick} className="flex-1" aria-label={label}>{inner}</button>
  )
}

function NavItem({
  href, icon, label, active = false, badge = 0,
}: {
  href: string; icon: React.ReactNode; label: string; active?: boolean; badge?: number
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
        active ? 'bg-gold/15 text-gold' : 'text-muted hover:text-cream hover:bg-surface2',
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
      {badge > 0 && (
        <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-gold text-ink text-[10px] font-bold flex items-center justify-center">
          {badge}
        </span>
      )}
    </Link>
  )
}

function UsersIcon({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
