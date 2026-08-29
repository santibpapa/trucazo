export type AcquisitionInput = {
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  utmContent?: string | null
  referrerHost?: string | null
  siteHost?: string | null
}

export type Acquisition = {
  source: string
  medium: string
  campaign: string | null
  content: string | null
  referrerHost: string | null
}

const SEARCH_ENGINES: [RegExp, string][] = [
  [/(^|\.)google\./, 'Google'],
  [/(^|\.)bing\.com$/, 'Bing'],
  [/(^|\.)search\.yahoo\.com$/, 'Yahoo'],
  [/(^|\.)duckduckgo\.com$/, 'DuckDuckGo'],
  [/(^|\.)ecosia\.org$/, 'Ecosia'],
]

const KNOWN_REFERRERS: [RegExp, string, string][] = [
  [/(^|\.)chatgpt\.com$/, 'ChatGPT', 'referencia'],
  [/(^|\.)perplexity\.ai$/, 'Perplexity', 'referencia'],
  [/(^|\.)instagram\.com$/, 'Instagram', 'social'],
  [/(^|\.)facebook\.com$/, 'Facebook', 'social'],
  [/(^|\.)tiktok\.com$/, 'TikTok', 'social'],
  [/(^|\.)(twitter|x)\.com$/, 'X / Twitter', 'social'],
  [/(^|\.)linkedin\.com$/, 'LinkedIn', 'social'],
  [/(^|\.)whatsapp\.com$/, 'WhatsApp', 'mensajería'],
  [/(^|\.)t\.me$/, 'Telegram', 'mensajería'],
]

export function classifyAcquisition(input: AcquisitionInput): Acquisition {
  const referrerHost = normalizeHost(input.referrerHost)
  const siteHost = normalizeHost(input.siteHost)
  const utmSource = clean(input.utmSource, 80)

  if (utmSource) {
    return {
      source: friendlyUtmSource(utmSource),
      medium: clean(input.utmMedium, 80) || 'campaña',
      campaign: clean(input.utmCampaign, 120),
      content: clean(input.utmContent, 120),
      referrerHost,
    }
  }

  if (!referrerHost || referrerHost === siteHost) {
    return {
      source: 'Directo / sin identificar',
      medium: 'directo',
      campaign: null,
      content: null,
      referrerHost: null,
    }
  }

  for (const [pattern, source] of SEARCH_ENGINES) {
    if (pattern.test(referrerHost)) {
      return { source, medium: 'orgánico', campaign: null, content: null, referrerHost }
    }
  }

  for (const [pattern, source, medium] of KNOWN_REFERRERS) {
    if (pattern.test(referrerHost)) {
      return { source, medium, campaign: null, content: null, referrerHost }
    }
  }

  return {
    source: referrerHost,
    medium: 'referencia',
    campaign: null,
    content: null,
    referrerHost,
  }
}

export function describeUserAgent(userAgent: string | null) {
  const ua = userAgent ?? ''
  const device = /ipad|tablet|kindle|silk/i.test(ua)
    ? 'Tablet'
    : /mobi|iphone|android/i.test(ua)
      ? 'Celular'
      : 'Computadora'

  const browser = /edg\//i.test(ua)
    ? 'Edge'
    : /samsungbrowser/i.test(ua)
      ? 'Samsung Internet'
      : /crios|chrome|chromium/i.test(ua)
        ? 'Chrome'
        : /fxios|firefox/i.test(ua)
          ? 'Firefox'
          : /safari/i.test(ua)
            ? 'Safari'
            : 'Otro'

  const operatingSystem = /iphone|ipad|ipod/i.test(ua)
    ? 'iOS / iPadOS'
    : /android/i.test(ua)
      ? 'Android'
      : /windows/i.test(ua)
        ? 'Windows'
        : /mac os|macintosh/i.test(ua)
          ? 'macOS'
          : /linux/i.test(ua)
            ? 'Linux'
            : 'Otro'

  return { device, browser, operatingSystem }
}

export function isLikelyBot(userAgent: string | null) {
  if (!userAgent) return true
  return /bot\b|crawler|spider|slurp|headless|lighthouse|pagespeed|preview|monitoring|uptime|curl\/|wget\//i.test(userAgent)
}

function friendlyUtmSource(value: string) {
  const normalized = value.toLowerCase().replace(/[ _-]+/g, '')
  const known: Record<string, string> = {
    trucazoemail: 'Email de Trucazo',
    email: 'Email',
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    facebook: 'Facebook',
    google: 'Google',
    qr: 'Código QR',
  }
  return known[normalized] ?? value.slice(0, 80)
}

function normalizeHost(value?: string | null) {
  if (!value) return null
  return value.trim().toLowerCase().replace(/^www\./, '').slice(0, 160) || null
}

function clean(value: string | null | undefined, max: number) {
  const result = value?.trim().slice(0, max)
  return result || null
}
