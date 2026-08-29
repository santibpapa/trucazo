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

// Molde de todos los mails. Va en oscuro (vino + oro) como el sitio: así se ve
// igual en modo claro y en modo oscuro, en vez de quedar a merced del invertido
// automático de Gmail, que dejaba el diseño claro hecho un barro marrón.
const FONT_STACK =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Helvetica,Arial,sans-serif"

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
  const markUrl = new URL('/icon-192.png', SITE_URL).toString()

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="color-scheme" content="dark">
    <meta name="supported-color-schemes" content="dark">
    <style>
      :root { color-scheme: dark; supported-color-schemes: dark; }
      @media screen and (max-width: 600px) {
        .email-shell { padding: 20px 14px 28px !important; }
        .email-card { padding: 30px 24px 28px !important; }
        .email-title { font-size: 28px !important; }
        .email-copy { font-size: 16px !important; }
        .email-button a { display: block !important; }
      }
      /* Outlook.com en oscuro: que no nos aclare el texto ni las superficies. */
      [data-ogsc] .email-title { color: #EFE6DA !important; }
      [data-ogsc] .email-copy { color: #CDB9B5 !important; }
      [data-ogsc] .email-footer { color: #9A827E !important; }
      a { color: #D7B566; }
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:#140C0D;color:#EFE6DA;font-family:${FONT_STACK};-webkit-text-size-adjust:100%;text-size-adjust:100%">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(preview)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#140C0D" style="width:100%;background-color:#140C0D">
      <tr>
        <td class="email-shell" align="center" style="padding:34px 20px 40px">
          <!--[if mso]><table role="presentation" width="580" align="center" cellspacing="0" cellpadding="0" border="0"><tr><td><![endif]-->
          <div style="max-width:580px;margin:0 auto">

            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%">
              <tr>
                <td width="30" style="padding:0 10px 20px 2px" valign="middle">
                  <img src="${escapeHtml(markUrl)}" width="30" height="30" alt="" style="display:block;width:30px;height:30px;border:0;border-radius:9px">
                </td>
                <td valign="middle" style="padding:0 0 20px;font-family:${FONT_STACK};font-size:21px;line-height:30px;font-weight:800;letter-spacing:-.3px;color:#EFE6DA">Truc<span style="color:#C9A24B">azo</span></td>
              </tr>
            </table>

            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#241517" style="width:100%;background-color:#241517;border:1px solid #3E2429;border-top:3px solid #C9A24B;border-radius:20px;box-shadow:0 18px 40px rgba(0,0,0,.45)">
              <tr>
                <td class="email-card" style="padding:36px 38px 34px">
                  <h1 class="email-title" style="margin:0;font-family:${FONT_STACK};color:#EFE6DA;font-size:32px;line-height:1.15;letter-spacing:-.6px;font-weight:800">${escapeHtml(title)}</h1>
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0 22px">
                    <tr><td width="36" height="3" bgcolor="#C9A24B" style="width:36px;height:3px;line-height:3px;font-size:0;background-color:#C9A24B;border-radius:2px">&nbsp;</td></tr>
                  </table>
                  <div class="email-copy" style="font-family:${FONT_STACK};color:#CDB9B5;font-size:16.5px;line-height:1.65">${body}</div>
                  <table class="email-button" role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:28px">
                    <tr>
                      <td bgcolor="#C9A24B" align="center" style="background-color:#C9A24B;border-radius:12px;mso-padding-alt:16px 30px">
                        <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:16px 30px;font-family:${FONT_STACK};color:#1F1011;text-decoration:none;font-size:16px;line-height:1.2;font-weight:800">${escapeHtml(cta)}&nbsp;&nbsp;&rarr;</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%">
              <tr>
                <td align="center" style="padding:24px 12px 14px;font-family:${FONT_STACK};color:#7C6460;font-size:11px;line-height:1.4;letter-spacing:1.2px;text-transform:uppercase;font-weight:700">Truco argentino online</td>
              </tr>
              <tr>
                <td class="email-footer" align="center" style="padding:0 12px;font-family:${FONT_STACK};color:#9A827E;font-size:12px;line-height:1.7">
                  Te llega porque tenés una cuenta en Trucazo.<br>
                  <a href="${escapeHtml(preferencesUrl)}" style="color:#C9A24B;text-decoration:underline">Elegir qué emails recibir o darme de baja</a>
                </td>
              </tr>
            </table>

          </div>
          <!--[if mso]></td></tr></table><![endif]-->
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
