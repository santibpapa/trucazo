import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RANGOS } from '../Tablero'
import AnalyticsDashboard from './AnalyticsDashboard'
import type { AcquisitionStats } from './lib'

export const metadata: Metadata = {
  title: 'Tráfico y adquisición',
  robots: { index: false, follow: false },
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: { dias?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const pedido = Number(searchParams?.dias)
  const dias = RANGOS.includes(pedido) ? pedido : 30
  const { data, error } = await supabase.rpc('admin_acquisition', { p_days: dias })
  if (error || !data) redirect('/admin')

  return <AnalyticsDashboard stats={data as AcquisitionStats} dias={dias} />
}
