// Google Publisher Tag se carga sólo al elegir voluntariamente el anuncio.
// La señal web de recompensa no es una verificación independiente del servidor.
type Slot = object
type AdEvent = { slot: Slot; isEmpty?: boolean; makeRewardedVisible?: () => void }
interface PubAds {
  addEventListener(name: string, callback: (event: AdEvent) => void): void
  removeEventListener(name: string, callback: (event: AdEvent) => void): void
}
interface PublisherTag {
  cmd: { push(callback: () => void): void }
  enums: { OutOfPageFormat: { REWARDED: unknown } }
  defineOutOfPageSlot(path: string, format: unknown): (Slot & { addService(service: PubAds): void }) | null
  pubads(): PubAds
  enableServices(): void
  display(slot: Slot): void
  destroySlots(slots: Slot[]): void
}
declare global { interface Window { googletag?: PublisherTag } }

export function showCampaignRewardedAd(unit: string, onGranted: () => void): Promise<boolean> {
  return new Promise((resolve, reject) => {
    let slot: Slot | null = null
    let service: PubAds | null = null
    let granted = false
    let settled = false
    const listeners: [string, (e: AdEvent) => void][] = []
    const finish = (error?: string) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      if (service) for (const [name, listener] of listeners) service.removeEventListener(name, listener)
      if (slot) window.googletag?.destroySlots([slot])
      if (error) reject(new Error(error))
      else resolve(granted)
    }
    // Límite para carga/sin inventario; una vez visible, el usuario cierra el anuncio.
    const timeout = setTimeout(() => finish('No hay un anuncio disponible ahora. Podés esperar o pedir ayuda.'), 15000)
    const tag = window.googletag ?? ({ cmd: [] } as unknown as PublisherTag)
    window.googletag = tag
    tag.cmd.push(() => {
      if (settled) return
      try {
        slot = tag.defineOutOfPageSlot(unit, tag.enums.OutOfPageFormat.REWARDED)
        if (!slot) { finish('Este navegador no admite el anuncio. Podés esperar o pedir ayuda.'); return }
        service = tag.pubads()
        ;(slot as Slot & { addService(s: PubAds): void }).addService(service)
        const listen = (name: string, fn: (e: AdEvent) => void) => {
          const listener = (e: AdEvent) => { if (e.slot === slot) fn(e) }
          listeners.push([name, listener])
          service!.addEventListener(name, listener)
        }
        listen('rewardedSlotReady', e => { clearTimeout(timeout); e.makeRewardedVisible?.() })
        listen('rewardedSlotGranted', () => {
          if (!granted) { granted = true; onGranted() }
        })
        listen('rewardedSlotClosed', () => finish())
        listen('slotRenderEnded', e => { if (e.isEmpty) finish('No hay un anuncio disponible ahora. Probá más tarde.') })
        tag.enableServices()
        tag.display(slot)
      } catch { finish('No se pudo abrir el anuncio. Probá más tarde.') }
    })
    if (!document.getElementById('campaign-gpt')) {
      const script = document.createElement('script')
      script.id = 'campaign-gpt'
      script.src = 'https://securepubads.g.doubleclick.net/tag/js/gpt.js'
      script.async = true
      script.onerror = () => { script.remove(); finish('No se pudo cargar el anuncio. Podés esperar o pedir ayuda.') }
      document.head.appendChild(script)
    }
  })
}
