import { cn } from './cn'

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: 'div' | 'section' | 'article'
}

/** Panel blanco sobre fondo beige: sombra sutil + borde fino. La superficie base del diseño. */
export default function Panel({ as: Tag = 'div', className, ...props }: PanelProps) {
  return (
    <Tag
      className={cn(
        'bg-surface border border-line rounded-2xl shadow-card',
        className,
      )}
      {...props}
    />
  )
}
