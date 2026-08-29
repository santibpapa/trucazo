import { SITE_URL } from '@/lib/site'
import type { ReengagementCampaign } from './candidates'

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

function trackedUrl(path: string, campaign: string) {
  const url = new URL(path, SITE_URL)
  url.searchParams.set('utm_source', 'trucazo_email')
  url.searchParams.set('utm_medium', 'email')
  url.searchParams.set('utm_campaign', campaign)
  return url.toString()
}

function campaignSlug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'reactivacion'
}

export function personalize(value: string, username: string) {
  return value.replaceAll('{{usuario}}', username)
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
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <style>
      :root { color-scheme: light dark; supported-color-schemes: light dark; }
      @media screen and (max-width: 600px) {
        .email-shell { padding: 18px 12px 24px !important; }
        .email-card { padding: 28px 22px 26px !important; }
        .email-title { font-size: 29px !important; line-height: 1.12 !important; }
        .email-button { display: block !important; text-align: center !important; }
      }
      @media (prefers-color-scheme: dark) {
        .email-bg, .email-body { background-color: #1A0F10 !important; }
        .email-card { background-color: #251719 !important; border-color: #543C3E !important; }
        .email-title { color: #EFE6DA !important; }
        .email-copy { color: #D9CBC1 !important; }
        .email-footer { color: #A9958D !important; }
        .email-footer a { color: #D7B566 !important; }
      }
    </style>
  </head>
  <body class="email-body" style="margin:0;padding:0;background-color:#F3EBE5;color:#251719;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;text-size-adjust:100%">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(preview)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
    <table class="email-bg" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#F3EBE5">
      <tr>
        <td class="email-shell" align="center" style="padding:32px 18px 38px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:580px">
            <tr>
              <td style="padding:0 8px 18px">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="color:#A98532;font-size:22px;line-height:1;font-weight:900;letter-spacing:2.5px">TRUCAZO</td>
                    <td align="right" style="color:#907E76;font-size:11px;line-height:1.2;font-weight:700;letter-spacing:1.4px;text-transform:uppercase">Truco argentino online</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="email-card" style="background-color:#FFFDFC;border:1px solid #D8C6BD;border-top:4px solid #C9A24B;border-radius:22px;padding:38px 38px 34px;box-shadow:0 10px 28px rgba(55,31,29,.08)">
                <h1 class="email-title" style="margin:0;color:#251719;font-size:34px;line-height:1.12;letter-spacing:-.7px;font-weight:850">${escapeHtml(title)}</h1>
                <div style="width:42px;height:3px;margin:22px 0;background-color:#C9A24B;border-radius:2px"></div>
                <div class="email-copy" style="color:#59494A;font-size:17px;line-height:1.65">${body}</div>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:28px">
                  <tr>
                    <td style="background-color:#C9A24B;border-radius:12px">
                      <a class="email-button" href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:15px 24px;color:#1A0F10;text-decoration:none;font-size:16px;line-height:1.2;font-weight:850">${escapeHtml(cta)}&nbsp;&nbsp;→</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="email-footer" style="padding:20px 10px 0;color:#907E76;font-size:12px;line-height:1.65;text-align:center">
                Este email te llegó porque tenés una cuenta en Trucazo.<br>
                <a href="${escapeHtml(preferencesUrl)}" style="color:#8C691D;text-decoration:underline">Elegir qué emails recibir o darme de baja</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
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
      ctaUrl: trackedUrl('/comunidad', 'novedades'),
      preferencesUrl,
    }),
    text: `${greeting}\n\n${title}\n\n${body}\n\nVer novedades: ${trackedUrl('/comunidad', 'novedades')}\n\nPreferencias: ${preferencesUrl}`,
  }
}

export function reengagementMail({
  username,
  preferencesUrl,
  campaign,
}: BaseMail & { campaign: ReengagementCampaign }): MailContent {
  const subject = personalize(campaign.subject, username)
  const preview = personalize(campaign.preview, username)
  const title = personalize(campaign.heading, username)
  const message = personalize(campaign.body, username)
  const cta = personalize(campaign.cta_label, username)
  const greeting = `Hola, ${username}.`
  const htmlBody = `<p style="margin:0 0 14px">${escapeHtml(greeting)}</p><p style="margin:0;white-space:pre-wrap">${escapeHtml(message)}</p>`
  const site = new URL(SITE_URL)
  const requestedUrl = new URL(campaign.cta_path, site)
  const ctaUrl = requestedUrl.origin === site.origin
    ? trackedUrl(requestedUrl.toString(), `reactivacion-${campaignSlug(campaign.name)}`)
    : trackedUrl('/lobby', `reactivacion-${campaignSlug(campaign.name)}`)

  return {
    subject,
    html: layout({
      preview,
      title,
      body: htmlBody,
      cta,
      ctaUrl,
      preferencesUrl,
    }),
    text: `${greeting}\n\n${title}\n\n${message}\n\n${cta}: ${ctaUrl}\n\nPreferencias: ${preferencesUrl}`,
  }
}
