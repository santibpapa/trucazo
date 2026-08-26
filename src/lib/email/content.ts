import { SITE_URL } from '@/lib/site'

type MailContent = {
  subject: string
  html: string
  text: string
}

type BaseMail = {
  username: string
  preferencesUrl: string
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function layout({
  preview,
  title,
  body,
  cta,
  ctaUrl,
  preferencesUrl,
}: {
  preview: string
  title: string
  body: string
  cta: string
  ctaUrl: string
  preferencesUrl: string
}) {
  return `<!doctype html>
<html lang="es">
  <body style="margin:0;background:#1A0F10;color:#EFE6DA;font-family:Arial,sans-serif">
    <div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preview)}</div>
    <div style="max-width:560px;margin:0 auto;padding:36px 20px">
      <div style="border:1px solid #5a4741;border-radius:18px;background:#251719;padding:30px">
        <p style="margin:0 0 22px;color:#C9A24B;font-size:24px;font-weight:800">TRUCAZO</p>
        <h1 style="margin:0 0 16px;font-size:26px;line-height:1.2;color:#EFE6DA">${escapeHtml(title)}</h1>
        <div style="font-size:16px;line-height:1.65;color:#ddd0c4">${body}</div>
        <p style="margin:28px 0 10px">
          <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;border-radius:12px;background:#C9A24B;color:#1A0F10;padding:13px 20px;text-decoration:none;font-weight:800">${escapeHtml(cta)}</a>
        </p>
      </div>
      <p style="margin:18px 4px 0;color:#9c8982;font-size:12px;line-height:1.5">
        Recibís este correo porque tenés una cuenta en Trucazo.
        Podés solicitar el retiro total o parcial de tu dirección en cualquier momento:
        <a href="${escapeHtml(preferencesUrl)}" style="color:#C9A24B">cambiar preferencias o darme de baja</a>.
      </p>
    </div>
  </body>
</html>`
}

export function newsMail({
  username,
  preferencesUrl,
  title,
  body,
}: BaseMail & { title: string; body: string }): MailContent {
  const greeting = `Hola, ${username}.`
  const htmlBody = `<p style="margin:0 0 14px">${escapeHtml(greeting)}</p><p style="margin:0;white-space:pre-wrap">${escapeHtml(body)}</p>`

  return {
    subject: title,
    html: layout({
      preview: body.slice(0, 120),
      title,
      body: htmlBody,
      cta: 'Ver novedades',
      ctaUrl: `${SITE_URL}/comunidad`,
      preferencesUrl,
    }),
    text: `${greeting}\n\n${title}\n\n${body}\n\nVer novedades: ${SITE_URL}/comunidad\n\nPreferencias: ${preferencesUrl}`,
  }
}

export function reengagementMail({
  username,
  preferencesUrl,
  kind,
}: BaseMail & { kind: 'never_played' | 'inactive' }): MailContent {
  const neverPlayed = kind === 'never_played'
  const title = neverPlayed ? 'Te quedó el mazo sin estrenar' : 'La mesa te está esperando'
  const message = neverPlayed
    ? `Creaste tu cuenta, pero todavía no jugaste tu primera partida. Entrá al lobby y probá una mano cuando quieras.`
    : `Hace un par de días que no tirás una carta. Hay mesas rápidas, rivales contra la máquina y el Modo Historia esperándote.`
  const greeting = `Hola, ${username}.`
  const htmlBody = `<p style="margin:0 0 14px">${escapeHtml(greeting)}</p><p style="margin:0">${escapeHtml(message)}</p>`

  return {
    subject: title,
    html: layout({
      preview: message,
      title,
      body: htmlBody,
      cta: neverPlayed ? 'Jugar mi primera partida' : 'Volver a jugar',
      ctaUrl: `${SITE_URL}/lobby`,
      preferencesUrl,
    }),
    text: `${greeting}\n\n${title}\n\n${message}\n\nJugar: ${SITE_URL}/lobby\n\nPreferencias: ${preferencesUrl}`,
  }
}
