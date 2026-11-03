import PageLoading from '@/components/PageLoading'

// Se muestra al instante mientras la ruta del juego carga (datos en prod,
// compilación on-demand en dev). Evita la sensación de pantalla congelada.
export default function GameLoading() {
  return <PageLoading text="Cargando la mesa…" />
}
