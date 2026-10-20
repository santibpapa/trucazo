import type { SupabaseClient } from '@supabase/supabase-js'

export type DeletionObject = { bucket: string; name: string }
export type DeletionJob = {
  id: string
  user_id: string
  objects: DeletionObject[]
  lease_id: string
}

/** Sólo servidor. Cada paso es idempotente; conservar la cola hasta borrar Auth. */
export async function processAccountDeletion(admin: SupabaseClient, job: DeletionJob) {
  try {
    // Evitar nuevas entradas mientras Storage/Auth se terminan de limpiar.
    const banned = await admin.auth.admin.updateUserById(job.user_id, { ban_duration: '876000h' })
    if (banned.error && banned.error.code !== 'user_not_found') throw new Error('auth_block')

    // Releer también los uploads que terminaron justo después de la transacción.
    const inventory = await admin.rpc('account_deletion_objects', { p_user_id: job.user_id })
    if (inventory.error) throw new Error('storage_inventory')
    const objects = [...job.objects, ...((inventory.data ?? []) as DeletionObject[])]
    const byBucket = new Map<string, Set<string>>()
    for (const object of objects) {
      if (!byBucket.has(object.bucket)) byBucket.set(object.bucket, new Set())
      byBucket.get(object.bucket)!.add(object.name)
    }
    for (const [bucket, paths] of Array.from(byBucket.entries())) {
      const names = Array.from(paths)
      for (let i = 0; i < names.length; i += 100) {
        const removed = await admin.storage.from(bucket).remove(names.slice(i, i + 100))
        if (removed.error) throw new Error('storage_remove')
      }
    }
    const deleted = await admin.auth.admin.deleteUser(job.user_id)
    if (deleted.error && deleted.error.code !== 'user_not_found') throw new Error('auth_delete')
    const done = await admin.from('account_deletion_jobs').delete()
      .eq('id', job.id).eq('lease_id', job.lease_id)
    if (done.error) throw new Error('job_complete')
    return true
  } catch (error) {
    // Códigos internos, sin emails, contraseñas ni mensajes de los proveedores.
    const reason = error instanceof Error ? error.message : 'unexpected'
    await admin.from('account_deletion_jobs').update({ locked_until: null, lease_id: null,
      next_attempt_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      last_error: ['auth_block', 'storage_inventory', 'storage_remove', 'auth_delete', 'job_complete'].includes(reason)
        ? reason : 'unexpected' }).eq('id', job.id).eq('lease_id', job.lease_id)
    return false
  }
}

export async function processAccountDeletions(admin: SupabaseClient, jobId?: string) {
  const claimed = await admin.rpc('claim_account_deletions', { p_job_id: jobId ?? null })
  if (claimed.error) throw new Error('No se pudo cargar la cola de eliminación')
  let completed = 0
  const jobs = (claimed.data ?? []) as DeletionJob[]
  for (const job of jobs) {
    if (await processAccountDeletion(admin, job)) completed++
  }
  return { completed, pending: jobs.length - completed }
}
