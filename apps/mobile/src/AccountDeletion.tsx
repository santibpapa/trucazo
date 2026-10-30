import { useEffect, useState } from 'react'
import AccountDeletionForm from '../../../src/app/eliminar-cuenta/AccountDeletionForm'
import { loadCampaign } from './campaign-storage'
import { cachedSession } from './services'
import { googleSignIn, rememberDestination } from './auth'
import { Button } from '../../../src/components/ui'
import { clearDeletedAccount } from './deleted-account'

export default function AccountDeletion() {
  const [owner] = useState(() => cachedSession()?.user.id)
  const [pending, setPending] = useState<number>()
  const [error, setError] = useState('')
  useEffect(() => { if (owner) void loadCampaign(owner).then(saved => setPending(saved?.pending.length ?? 0)).catch(() => setError('No pudimos leer Historia. El borrado elimina también los resultados sin sincronizar.')) }, [owner])
  if (!owner) return <main className="p-5"><a href="#/login" className="text-gold">Entrá con tu cuenta para eliminarla</a></main>
  return <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-5 p-5">
    <a href="#/profile" className="text-gold">← Volver al perfil</a>
    <h1 className="font-display text-2xl font-bold">Eliminar mi cuenta de Trucazo</h1>
    {error && <p role="alert" className="text-negative">{error}</p>}
    <AccountDeletionForm onDeleted={clearDeletedAccount}
      localNotice={<p className="text-sm text-muted">Se borran el guardado de Historia y los avisos de esta cuenta en este teléfono. {pending ? `Tenés ${pending} resultado(s) sin sincronizar: se perderán.` : 'Los resultados sin sincronizar se pierden.'} Si querés conservarlos, volvé a Historia y sincronizá antes. Otros equipos sin red ocultarán el guardado al reconectarse.</p>}
      googleButton={<Button type="button" variant="secondary" onClick={() => {
        rememberDestination('/eliminar-cuenta')
        void googleSignIn().catch(failure => setError(failure.message))
      }}>Confirmar con Google</Button>} />
    <a href="#/privacidad" className="text-gold underline">Política de privacidad</a>
  </main>
}
