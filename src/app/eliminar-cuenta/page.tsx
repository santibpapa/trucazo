import Link from 'next/link'
import { Logo } from '@/components/ui'
import { createPublicMetadata } from '@/lib/seo'
import AccountDeletionForm from './AccountDeletionForm'

export const metadata = createPublicMetadata({ title: 'Eliminar mi cuenta de Trucazo',
  description: 'Eliminá tu cuenta de Trucazo y los datos personales asociados, desde la web y sin tener la aplicación instalada.',
  path: '/eliminar-cuenta', type: 'website' })

export default function DeleteAccountPage() {
  return (
    <main className="min-h-screen max-w-2xl mx-auto p-5 sm:p-8 flex flex-col gap-6">
      <Link href="/" aria-label="Inicio de Trucazo"><Logo size="md" /></Link>
      <h1 className="font-display text-3xl font-extrabold text-cream">Eliminar mi cuenta de Trucazo</h1>
      <p className="text-muted">Podés eliminar tu cuenta desde esta página, sin tener la aplicación instalada, o desde tu perfil.</p>
      <AccountDeletionForm />
      <section className="flex flex-col gap-3 text-muted">
        <h2 className="font-display text-xl font-bold text-cream">Qué se elimina</h2>
        <p>La cuenta de acceso, email, perfil, fotos subidas, monedas, personalización, progreso de campaña, misiones, amistades, mensajes, reseñas y preferencias de correo. También se eliminan los datos de navegación vinculados a tu cuenta.</p>
        <p>Los resultados compartidos que necesitan otros jugadores se conservan sin tu identidad, con la leyenda “Cuenta eliminada”. Si liderás un grupo con otros miembros, el liderazgo pasa a otro jugador.</p>
        <p>Normalmente el proceso termina al confirmar. Si falla un proveedor, guardamos la solicitud y reintentamos automáticamente. Conservamos únicamente tu identificador y la lista de archivos pendientes hasta completar el borrado; después también se eliminan.</p>
        <p>Los proveedores técnicos pueden conservar copias de seguridad o registros durante sus plazos propios, sin utilizarlos como una cuenta activa.</p>
      </section>
      <section className="flex flex-col gap-3 text-muted">
        <h2 className="font-display text-xl font-bold text-cream">Si no podés entrar</h2>
        <p>Solicitá la eliminación escribiendo a <a href="mailto:hola@trucazo.com.ar?subject=Eliminar%20mi%20cuenta%20de%20Trucazo" className="text-gold underline">hola@trucazo.com.ar</a> desde el email de tu cuenta. Confirmaremos tu identidad antes de borrarla. No envíes tu contraseña.</p>
      </section>
      <Link href="/privacidad" className="text-gold underline">Política de privacidad</Link>
    </main>
  )
}
