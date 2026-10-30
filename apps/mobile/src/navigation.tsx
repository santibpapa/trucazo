import type { AnchorHTMLAttributes, ImgHTMLAttributes } from 'react'
import { Browser } from '@capacitor/browser'

export function navigate(path: string) { window.location.hash = '#' + path }
const router = { push: navigate, replace: (path: string) => window.location.replace('#' + path),
  refresh: () => window.dispatchEvent(new Event('mobile:refresh')), back: () => window.history.back() }
export function useRouter() { return router }
export function usePathname() { return window.location.hash.slice(1) || '/login' }
export function useSearchParams() { return new URLSearchParams(usePathname().split('?')[1]) }
export function Link({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const path = href === '/' ? '/inicio' : href === '/register' ? '/lobby' : href
  return <a {...props} href={path.startsWith('/') ? '#' + path : path} />
}
export function Image({ fill, priority, sizes, ...props }: ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; priority?: boolean }) {
  return <img {...props} sizes={sizes} loading={priority ? 'eager' : 'lazy'} style={{ ...props.style,
    ...(fill ? { position: 'absolute', inset: 0, width: '100%', height: '100%' } : {}) }} />
}

// Incluye los enlaces HTML de los artículos compartidos, además de next/link.
document.addEventListener('click', event => {
  const anchor = (event.target as Element).closest('a')
  if (!anchor || event.defaultPrevented) return
  const href = anchor.getAttribute('href') || ''
  if (href.startsWith('?')) { event.preventDefault(); navigate((window.location.hash.slice(1) || '/lobby').split('?')[0] + href) }
  else if (href.startsWith('/') && !href.startsWith('//')) { event.preventDefault(); navigate(href === '/' ? '/inicio' : href) }
  else if (/^https?:\/\//.test(href)) { event.preventDefault(); void Browser.open({ url: href }) }
})
