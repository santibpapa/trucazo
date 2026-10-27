import { useEffect, useState } from 'react'

export default function ThirdPartyNotices() {
  const [text, setText] = useState('Cargando licencias…')
  useEffect(() => {
    void fetch('/third-party-notices.txt').then(response => {
      if (!response.ok) throw new Error()
      return response.text()
    }).then(setText).catch(() => setText('No pudimos abrir las licencias. Volvé a abrir esta pantalla.'))
  }, [])
  return <main className="mx-auto flex max-w-2xl flex-col gap-4 p-5"><h1 className="font-display text-2xl font-bold">Licencias de componentes</h1><pre className="whitespace-pre-wrap break-words font-sans text-sm text-muted">{text}</pre></main>
}
