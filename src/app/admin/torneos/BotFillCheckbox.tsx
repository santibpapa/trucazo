// Marca de torneos 1v1 que se completan con bots a la hora de inicio.
export default function BotFillCheckbox({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface2 p-4">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={event => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 accent-gold"
      />
      <span>
        <span className="block font-semibold text-cream">Completar con bots</span>
        <span className="block text-sm text-muted">
          Si a la hora de inicio faltan jugadores, se suman bots de máxima dificultad y el torneo arranca solo. Para los jugadores son rivales comunes.
        </span>
      </span>
    </label>
  )
}
