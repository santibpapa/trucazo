// SUBSCRIBED confirma el canal, no que Postgres Changes ya esté escuchando.
export function createMatchChatReadiness(onReady: () => void) {
  let ready = false
  return {
    system(payload: { extension?: string; status?: string }) {
      if (payload.extension !== 'system' && payload.extension !== 'postgres_changes') return
      if (payload.status === 'error') ready = false
      if (payload.status === 'ok' && !ready) {
        ready = true
        onReady()
      }
    },
    disconnect() { ready = false },
    get ready() { return ready },
  }
}

export function matchChatSendError(cause: unknown) {
  if (cause && typeof cause === 'object' && 'message' in cause &&
      typeof cause.message === 'string' && cause.message.trim()) return cause.message
  return 'No se pudo enviar. Volvé a intentar.'
}
