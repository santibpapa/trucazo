import { createHash } from 'node:crypto'

export type ResendBatchMail = {
  to: string
  subject: string
  html: string
  text: string
  unsubscribeUrl: string
  dedupeKey: string
}

type SentMail<T> = { mail: T; providerId: string }
type UnsentMail<T> = { mail: T; reason: string }

export type ResendBatchResult<T> = {
  sent: SentMail<T>[]
  skipped: UnsentMail<T>[]
  failed: UnsentMail<T>[]
}

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

export async function sendResendBatch<T extends ResendBatchMail>({
  apiKey,
  from,
  mails,
  fetcher = fetch,
}: {
  apiKey: string
  from: string
  mails: T[]
  fetcher?: Fetcher
}): Promise<ResendBatchResult<T>> {
  if (mails.length === 0) return emptyResult()

  const response = await fetcher('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey(mails.map(mail => mail.dedupeKey).join('|')),
    },
    body: JSON.stringify(mails.map(mail => ({
      from,
      to: [mail.to],
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      headers: {
        'List-Unsubscribe': `<${mail.unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'X-Entity-Ref-ID': idempotencyKey(mail.dedupeKey),
      },
    }))),
  })
  const payload = await response.json().catch(() => null) as
    | { data?: { id: string }[]; message?: string }
    | null

  if (response.ok && payload?.data?.length === mails.length) {
    return {
      sent: mails.map((mail, index) => ({ mail, providerId: payload.data![index].id })),
      skipped: [],
      failed: [],
    }
  }

  const reason = payload?.message ?? `Resend respondió ${response.status}`
  if (!isRecipientValidationFailure(response.status, reason)) {
    return { sent: [], skipped: [], failed: mails.map(mail => ({ mail, reason })) }
  }
  if (mails.length === 1) {
    return { sent: [], skipped: [{ mail: mails[0], reason }], failed: [] }
  }

  // Resend rechaza el lote entero si una sola dirección es inválida. Dividir
  // hasta aislarla permite enviar el resto sin superar el límite de 100 por lote.
  const middle = Math.floor(mails.length / 2)
  const left = await sendResendBatch({ apiKey, from, mails: mails.slice(0, middle), fetcher })
  const right = await sendResendBatch({ apiKey, from, mails: mails.slice(middle), fetcher })
  return mergeResults(left, right)
}

export function isRecipientValidationFailure(status: number, reason: string) {
  if (status < 400 || status >= 500 || status === 401 || status === 403 || status === 429) {
    return false
  }
  return /invalid\s+[`'\"]?to|invalid recipient|recipient.*invalid/i.test(reason)
}

function mergeResults<T>(
  left: ResendBatchResult<T>,
  right: ResendBatchResult<T>,
): ResendBatchResult<T> {
  return {
    sent: [...left.sent, ...right.sent],
    skipped: [...left.skipped, ...right.skipped],
    failed: [...left.failed, ...right.failed],
  }
}

function emptyResult<T>(): ResendBatchResult<T> {
  return { sent: [], skipped: [], failed: [] }
}

function idempotencyKey(value: string) {
  return `trucazo-${createHash('sha256').update(value).digest('hex')}`
}
