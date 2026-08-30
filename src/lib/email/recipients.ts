import type { User } from '@supabase/supabase-js'

const BLOCKED_EMAIL_DOMAINS = new Set([
  'example.com',
  'example.net',
  'example.org',
  'test.com',
])

type RecipientUser = Pick<
  User,
  'email' | 'email_confirmed_at' | 'is_anonymous' | 'app_metadata'
>

export function isConfirmedEmailRecipient(user: RecipientUser) {
  const providers = Array.isArray(user.app_metadata?.providers)
    ? user.app_metadata.providers
    : []
  const isBot = user.app_metadata?.provider === 'bot'
    || providers.includes('bot')
    || user.email?.endsWith('@trucazo.bot')

  return Boolean(
    user.email
    && user.email_confirmed_at
    && !user.is_anonymous
    && !isBot
    && !isTestEmailAddress(user.email)
  )
}

export function isTestEmailAddress(email: string | undefined) {
  if (!email) return false
  const domain = email.trim().toLowerCase().split('@').at(-1) ?? ''
  return BLOCKED_EMAIL_DOMAINS.has(domain)
    || domain.endsWith('.example.com')
    || domain.endsWith('.example.net')
    || domain.endsWith('.example.org')
    || domain.endsWith('.invalid')
    || domain.endsWith('.localhost')
    || domain.endsWith('.test')
}
