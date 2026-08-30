'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import type { ReengagementCampaign, ReengagementKind } from '@/lib/email/candidates'

export type AdminCampaign = ReengagementCampaign & {
  sent: number
  failed: number
  skipped: number
}

type EditableCampaign = Omit<AdminCampaign, 'id' | 'created_at' | 'updated_at' | 'sent' | 'failed' | 'skipped'>

const EMPTY: EditableCampaign = {
  name: '',
  audience: 'never_played',
  delay_days: 2,
  subject: '',
  preview: '',
  heading: '',
  body: '',
  cta_label: 'Volver a jugar',
  cta_path: '/lobby',
  is_active: false,
}

export default function EmailCampaigns({ initialCampaigns }: { initialCampaigns: AdminCampaign[] }) {
  const [campaigns, setCampaigns] = useState(initialCampaigns)
  const [selectedId, setSelectedId] = useState<string | null>(initialCampaigns[0]?.id ?? null)
  const selected = campaigns.find(campaign => campaign.id === selectedId) ?? null
  const [draft, setDraft] = useState<EditableCampaign>(() => selected ? editable(selected) : EMPTY)
  const [creating, setCreating] = useState(initialCampaigns.length === 0)
  const [busy, setBusy] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [testSentTo, setTestSentTo] = useState('')

  const preview = {
    subject: personalize(draft.subject || 'Asunto del correo'),
    preview: personalize(draft.preview || 'Texto breve que se ve antes de abrirlo'),
    heading: personalize(draft.heading || 'Título del correo'),
    body: personalize(draft.body || 'Acá vas a ver el contenido del mensaje.'),
    cta: personalize(draft.cta_label || 'Volver a jugar'),
  }

  function selectCampaign(campaign: AdminCampaign) {
    setSelectedId(campaign.id)
    setDraft(editable(campaign))
    setCreating(false)
    setError('')
    setSaved(false)
    setTestSentTo('')
  }

  function newCampaign() {
    setSelectedId(null)
    setDraft({ ...EMPTY })
    setCreating(true)
    setError('')
    setSaved(false)
    setTestSentTo('')
  }

  async function save() {
    setBusy(true)
    setError('')
    setSaved(false)
    try {
      const response = await fetch('/api/admin/email-campaigns', {
        method: creating ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creating ? draft : { id: selectedId, ...draft }),
      })
      const result = await response.json() as { campaign?: AdminCampaign; error?: string }
      if (!response.ok || !result.campaign) throw new Error(result.error ?? 'No se pudo guardar.')

      const next = creating
        ? [...campaigns, result.campaign]
        : campaigns.map(campaign => campaign.id === result.campaign!.id
          ? {
            ...result.campaign!,
            sent: campaign.sent,
            failed: campaign.failed,
            skipped: campaign.skipped,
          }
          : campaign)
      setCampaigns(next.sort((a, b) => a.delay_days - b.delay_days))
      setSelectedId(result.campaign.id)
      setDraft(editable(result.campaign))
      setCreating(false)
      setSaved(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar.')
    } finally {
      setBusy(false)
    }
  }

  async function toggle(campaign: AdminCampaign) {
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/admin/email-campaigns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editable(campaign), id: campaign.id, is_active: !campaign.is_active }),
      })
      const result = await response.json() as { campaign?: AdminCampaign; error?: string }
      if (!response.ok || !result.campaign) throw new Error(result.error ?? 'No se pudo cambiar el estado.')

      const updated = {
        ...result.campaign,
        sent: campaign.sent,
        failed: campaign.failed,
        skipped: campaign.skipped,
      }
      setCampaigns(current => current.map(item => item.id === campaign.id ? updated : item))
      if (selectedId === campaign.id) setDraft(editable(updated))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cambiar el estado.')
    } finally {
      setBusy(false)
    }
  }

  async function sendTest() {
    setTesting(true)
    setError('')
    setTestSentTo('')
    try {
      const response = await fetch('/api/admin/email-campaigns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const result = await response.json() as { ok?: boolean; to?: string; error?: string }
      if (!response.ok || !result.ok || !result.to) {
        throw new Error(result.error ?? 'No se pudo enviar la prueba.')
      }
      setTestSentTo(result.to)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo enviar la prueba.')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(260px,0.72fr)_minmax(0,1.4fr)]">
      <aside className="rounded-2xl border border-line bg-surface p-4 shadow-card">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-cream">Campañas</h2>
            <p className="text-xs text-muted">{campaigns.length} creadas</p>
          </div>
          <Button size="sm" onClick={newCampaign}>Nueva</Button>
        </div>

        <div className="flex flex-col gap-2">
          {campaigns.length === 0 && (
            <p className="rounded-xl border border-dashed border-line p-4 text-sm text-muted">
              Todavía no hay campañas. Creá la primera desde este panel.
            </p>
          )}
          {campaigns.map(campaign => (
            <div
              key={campaign.id}
              className={`rounded-xl border p-3 transition-colors ${
                selectedId === campaign.id && !creating
                  ? 'border-gold bg-gold-soft/20'
                  : 'border-line bg-surface2 hover:border-gold/60'
              }`}
            >
              <button type="button" onClick={() => selectCampaign(campaign)} className="block w-full text-left">
                <span className="flex items-start justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-cream">{campaign.name}</span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {audienceLabel(campaign.audience)} · a los {campaign.delay_days} {campaign.delay_days === 1 ? 'día' : 'días'}
                    </span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    campaign.is_active ? 'bg-positive/15 text-positive' : 'bg-base text-subtle'
                  }`}>
                    {campaign.is_active ? 'Activa' : 'Pausada'}
                  </span>
                </span>
              </button>
              <span className="mt-3 flex items-center justify-between gap-3 text-[11px] text-subtle">
                <span>
                  {campaign.sent} enviados
                  {campaign.skipped > 0 ? ` · ${campaign.skipped} omitidos` : ''}
                  {campaign.failed > 0 ? ` · ${campaign.failed} fallidos` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => void toggle(campaign)}
                  disabled={busy}
                  className="font-semibold text-gold hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {campaign.is_active ? 'Pausar' : 'Activar'}
                </button>
              </span>
            </div>
          ))}
        </div>
      </aside>

      <section className="min-w-0 rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
        <div className="mb-5">
          <h2 className="font-display text-xl font-bold text-cream">
            {creating ? 'Nueva campaña' : 'Editar campaña'}
          </h2>
          <p className="text-xs text-muted">
            Podés escribir <code className="text-gold">{'{{usuario}}'}</code> para poner el nombre del jugador.
          </p>
        </div>

        {error && <p role="alert" className="mb-4 rounded-xl border border-negative/40 bg-negative/10 p-3 text-sm text-cream">{error}</p>}
        {saved && <p className="mb-4 rounded-xl border border-positive/40 bg-positive/10 p-3 text-sm text-cream">Campaña guardada.</p>}
        {testSentTo && (
          <p className="mb-4 rounded-xl border border-positive/40 bg-positive/10 p-3 text-sm text-cream">
            Prueba enviada a {testSentTo}. No cuenta en las estadísticas ni alcanza a otros usuarios.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Nombre interno"
            value={draft.name}
            maxLength={80}
            placeholder="Ej.: Recordatorio a los 2 días"
            onChange={event => update('name', event.target.value)}
          />
          <label className="flex flex-col gap-1.5 text-sm font-medium text-muted">
            Público
            <select
              value={draft.audience}
              onChange={event => update('audience', event.target.value as ReengagementKind)}
              className="w-full rounded-xl border border-line bg-base px-4 py-3 text-cream focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/25"
            >
              <option value="never_played">Se registró pero nunca jugó</option>
              <option value="inactive">Jugó y después dejó de jugar</option>
            </select>
          </label>
          <Input
            label="Enviar después de cuántos días"
            type="number"
            min={1}
            max={365}
            value={draft.delay_days}
            onChange={event => update('delay_days', Number(event.target.value))}
          />
          <Input
            label="Asunto"
            value={draft.subject}
            maxLength={180}
            placeholder="La mesa te está esperando"
            onChange={event => update('subject', event.target.value)}
          />
          <div className="sm:col-span-2">
            <Input
              label="Texto de vista previa"
              value={draft.preview}
              maxLength={200}
              placeholder="Lo que se ve junto al asunto antes de abrir el mail"
              onChange={event => update('preview', event.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              label="Título dentro del mail"
              value={draft.heading}
              maxLength={180}
              placeholder="Hay una mesa esperándote"
              onChange={event => update('heading', event.target.value)}
            />
          </div>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-muted sm:col-span-2">
            Contenido
            <textarea
              rows={6}
              value={draft.body}
              maxLength={4000}
              placeholder="Escribí el mensaje que va a recibir el jugador…"
              onChange={event => update('body', event.target.value)}
              className="w-full resize-y rounded-xl border border-line bg-base px-4 py-3 text-cream placeholder:text-subtle focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/25"
            />
          </label>
          <Input
            label="Texto del botón"
            value={draft.cta_label}
            maxLength={80}
            placeholder="Volver a jugar"
            onChange={event => update('cta_label', event.target.value)}
          />
          <Input
            label="Destino del botón"
            value={draft.cta_path}
            maxLength={500}
            placeholder="/lobby"
            onChange={event => update('cta_path', event.target.value)}
          />
        </div>

        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface2 p-4">
          <input
            type="checkbox"
            checked={draft.is_active}
            onChange={event => update('is_active', event.target.checked)}
            className="mt-1 h-4 w-4 accent-gold"
          />
          <span>
            <span className="block font-semibold text-cream">Campaña activa</span>
            <span className="block text-sm text-muted">Si la dejás pausada, se guarda pero no se envía.</span>
          </span>
        </label>

        <div className="mt-6 border-t border-line pt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-subtle">Vista previa</p>
          <div className="overflow-hidden rounded-2xl border border-line bg-[#1A0F10] p-4 sm:p-7">
            <p className="mb-1 break-words text-sm font-bold text-cream">{preview.subject}</p>
            <p className="mb-5 break-words text-xs text-subtle">{preview.preview}</p>
            <div className="rounded-2xl border border-[#5a4741] bg-[#251719] p-5 sm:p-7">
              <p className="mb-5 text-xl font-extrabold text-gold">TRUCAZO</p>
              <h3 className="break-words font-display text-2xl font-bold text-cream">{preview.heading}</h3>
              <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-cream/85">Hola, Santi.{`\n\n`}{preview.body}</p>
              <span className="mt-6 inline-block rounded-xl bg-gold px-4 py-3 text-sm font-extrabold text-ink">{preview.cta}</span>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-subtle">El enlace para cambiar preferencias o darse de baja se agrega automáticamente.</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          {creating && campaigns.length > 0 && (
            <Button variant="ghost" onClick={() => selectCampaign(campaigns[0])}>Cancelar</Button>
          )}
          <Button variant="secondary" onClick={() => void sendTest()} disabled={busy || testing}>
            {testing ? 'Enviando prueba…' : 'Enviar prueba'}
          </Button>
          <Button onClick={() => void save()} disabled={busy || testing}>
            {busy ? 'Guardando…' : creating ? 'Crear campaña' : 'Guardar cambios'}
          </Button>
        </div>
      </section>
    </div>
  )

  function update<K extends keyof EditableCampaign>(key: K, value: EditableCampaign[K]) {
    setDraft(current => ({ ...current, [key]: value }))
    setSaved(false)
    setTestSentTo('')
  }
}

function editable(campaign: AdminCampaign): EditableCampaign {
  return {
    name: campaign.name,
    audience: campaign.audience,
    delay_days: campaign.delay_days,
    subject: campaign.subject,
    preview: campaign.preview,
    heading: campaign.heading,
    body: campaign.body,
    cta_label: campaign.cta_label,
    cta_path: campaign.cta_path,
    is_active: campaign.is_active,
  }
}

function audienceLabel(audience: ReengagementKind) {
  return audience === 'never_played' ? 'Nunca jugó' : 'Dejó de jugar'
}

function personalize(value: string) {
  return value.replaceAll('{{usuario}}', 'Santi')
}
