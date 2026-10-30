import { Suspense } from 'react'
import ResenaScreen from './ResenaScreen'

export default function ResenaPage() {
  return <Suspense fallback={<p role="status">Abriendo reseña…</p>}><ResenaScreen /></Suspense>
}
