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

// Molde de todos los mails.
//
// Se escribe en CLARO y con colores poco saturados a propósito. Los Gmail de
// celular ignoran cualquier instrucción de modo oscuro y le dan vuelta los
// colores al mail por su cuenta (invierten el brillo y conservan el tono). Con
// tonos saturados eso dejaba el mail marrón barroso o rosa; con estos tonos, al
// darlos vuelta, queda un oscuro cálido prolijo.
//
// El oro es el caso especial: el #C9A24B de la marca, invertido, se hunde en un
// verde oliva sucio. El gold-700 (#A98532) es casi un punto fijo de esa cuenta:
// invertido queda #9B7724, o sea prácticamente el mismo oro. Por eso el botón y
// los detalles usan gold-700 y no el oro principal.
//
// Los clientes que sí respetan el modo oscuro de verdad (Mail de iPhone,
// Outlook) reciben la versión vino y oro del sitio por la media query de abajo.
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
        .email-shell { padding: 20px 14px 28px !important; }
        .email-pad { padding: 30px 24px 28px !important; }
        .email-title { font-size: 28px !important; }
        .email-copy { font-size: 16px !important; }
        .email-button a { display: block !important; }
      }
      @media (prefers-color-scheme: dark) {
        body, .email-bg { background-color: #140C0D !important; }
        .email-card { background-color: #241517 !important; border-color: #3E2429 !important; border-top-color: #C9A24B !important; }
        .email-title, .email-word { color: #EFE6DA !important; }
        .email-copy { color: #CDB9B5 !important; }
        .email-eyebrow { color: #7C6460 !important; }
        .email-footer { color: #9A827E !important; }
        .email-footer a { color: #C9A24B !important; }
        .email-button td { background-color: #C9A24B !important; }
      }
      [data-ogsc] .email-bg { background-color: #140C0D !important; }
      [data-ogsc] .email-card { background-color: #241517 !important; border-color: #3E2429 !important; border-top-color: #C9A24B !important; }
      [data-ogsc] .email-title, [data-ogsc] .email-word { color: #EFE6DA !important; }
      [data-ogsc] .email-copy { color: #CDB9B5 !important; }
      [data-ogsc] .email-footer { color: #9A827E !important; }
      [data-ogsc] .email-footer a { color: #C9A24B !important; }
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:#F2EEEA;color:#1C1817;font-family:${FONT_STACK};-webkit-text-size-adjust:100%;text-size-adjust:100%">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(preview)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
    <table class="email-bg" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#F2EEEA" style="width:100%;background-color:#F2EEEA">
      <tr>
        <td class="email-shell" align="center" style="padding:34px 20px 40px">
          <!--[if mso]><table role="presentation" width="580" align="center" cellspacing="0" cellpadding="0" border="0"><tr><td><![endif]-->
          <div style="max-width:580px;margin:0 auto">

            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%">
              <tr>
                <td class="email-word" valign="middle" style="padding:0 0 18px 2px;font-family:${FONT_STACK};font-size:22px;line-height:26px;font-weight:800;letter-spacing:-.3px;color:#1C1817">Truc<span style="color:#A98532">azo</span></td>
                <td class="email-eyebrow" valign="middle" align="right" style="padding:0 2px 18px 0;font-family:${FONT_STACK};color:#8A8280;font-size:11px;line-height:26px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">Truco argentino online</td>
              </tr>
            </table>

            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#FFFFFF" class="email-card" style="width:100%;background-color:#FFFFFF;border:1px solid #E4DCD5;border-top:3px solid #A98532;border-radius:20px">
              <tr>
                <td class="email-pad" style="padding:36px 38px 34px">
                  <h1 class="email-title" style="margin:0;font-family:${FONT_STACK};color:#1C1817;font-size:32px;line-height:1.15;letter-spacing:-.6px;font-weight:800">${escapeHtml(title)}</h1>
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0 22px">
                    <tr><td width="36" height="3" bgcolor="#A98532" style="width:36px;height:3px;line-height:3px;font-size:0;background-color:#A98532;border-radius:2px">&nbsp;</td></tr>
                  </table>
                  <div class="email-copy" style="font-family:${FONT_STACK};color:#56504D;font-size:16.5px;line-height:1.65">${body}</div>
                  <table class="email-button" role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:28px">
                    <tr>
                      <td bgcolor="#A98532" align="center" style="background-color:#A98532;border-radius:12px;mso-padding-alt:16px 30px">
                        <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:16px 30px;font-family:${FONT_STACK};color:#1F1011;text-decoration:none;font-size:17px;line-height:1.2;font-weight:800">${escapeHtml(cta)}&nbsp;&nbsp;&rarr;</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%">
              <tr>
                <td class="email-footer" align="center" style="padding:24px 12px 0;font-family:${FONT_STACK};color:#77706E;font-size:12px;line-height:1.8">
                  Te llega porque tenés una cuenta en Trucazo.<br>
                  <a href="${escapeHtml(preferencesUrl)}" style="color:#8A6A1E;text-decoration:underline">Elegir qué emails recibir o darme de baja</a>
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
