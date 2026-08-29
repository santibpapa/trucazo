import type { User } from '@supabase/supabase-js'

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
    && !isBot,
  )
}
