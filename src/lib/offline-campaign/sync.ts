import { confirmResults, type Campaign, type Receipt, type Snapshot } from './model'

// La cola permanece entera hasta el guardado final. Un corte entre lotes o
// después de acreditar se resuelve reenviando los mismos registros inmutables.
export async function synchronize(current: Campaign, send: (records: Campaign['pending'], complete: boolean) => Promise<{
  receipts: Receipt[]; snapshot: Snapshot | null
}>): Promise<Campaign> {
  if (!current.pending.length || current.trial?.game.status === 'playing') return current
  if (current.pending.some(p => !p.grant_id)) throw new Error('Son partidas del prototipo anterior. Actualizá la descarga; se conservarán como ensayos, sin premios oficiales.')
  const receipts: Receipt[] = []; let snapshot: Snapshot | null = null
  let batch: Campaign['pending'] = []
  for (let i = 0; i < current.pending.length; i++) {
    const record = current.pending[i]
    const size = new TextEncoder().encode(JSON.stringify({ records: [...batch, record], complete: false })).length
    if (batch.length && (batch.length === 10 || size > 1500000)) {
      const result = await send(batch, false); receipts.push(...result.receipts); batch = []
    }
    batch.push(record)
    if (i === current.pending.length - 1) {
      const result = await send(batch, true); receipts.push(...result.receipts); snapshot = result.snapshot
    }
  }
  if (!snapshot) throw new Error('Falta la confirmación del servidor. Las partidas siguen guardadas.')
  return confirmResults(current, snapshot, receipts)
}
