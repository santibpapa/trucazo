import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/site'
import { updatedFor } from '@/lib/routes'

export const SITE_NAME = 'Trucazo'
export const EDITOR_NAME = 'Equipo de Trucazo'

/**
 * Fecha de la página que se está armando. Cada página tiene la suya en
 * PUBLIC_ROUTES; si el camino no está en esa lista (la 404, por ejemplo),
 * no hay fecha que mostrar.
 */
export function contentUpdatedAt(path: string): string | null {
  return updatedFor(path)
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/**
 * '2026-09-14' → '14 de septiembre de 2026'. Se parte la cadena a mano en vez
 * de usar Date: 'new Date("2026-09-14")' es medianoche UTC y en Argentina
 * caería el día anterior.
 */
export function formatUpdated(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${Number(day)} de ${MESES[Number(month) - 1]} de ${year}`
}

type PublicMetadataInput = {
  title: string
  description: string
  path: string
  type?: 'website' | 'article'
}

function ogImageUrl(title: string, description: string) {
  const params = new URLSearchParams({
    title,
    subtitle: description,
  })
  return `${SITE_URL}/og?${params.toString()}`
}

export function createPublicMetadata({
  title,
  description,
  path,
  type = 'article',
}: PublicMetadataInput): Metadata {
  const url = `${SITE_URL}${path}`
  const image = ogImageUrl(title, description)
  const updated = contentUpdatedAt(path)

  return {
    title,
    description,
    alternates: { canonical: path },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    openGraph: {
      type,
      locale: 'es_AR',
      siteName: SITE_NAME,
      url,
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
      ...(type === 'article' && updated
        ? {
            publishedTime: updated,
            modifiedTime: updated,
            authors: [EDITOR_NAME],
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}

export function createBreadcrumbJsonLd(name: string, path: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
      {
        '@type': 'ListItem',
        position: 2,
        name,
        item: `${SITE_URL}${path}`,
      },
    ],
  }
}

export function createArticleJsonLd({
  headline,
  description,
  path,
}: {
  headline: string
  description: string
  path: string
}) {
  const updated = contentUpdatedAt(path)

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    description,
    url: `${SITE_URL}${path}`,
    mainEntityOfPage: `${SITE_URL}${path}`,
    inLanguage: 'es-AR',
    ...(updated ? { datePublished: updated, dateModified: updated } : {}),
    author: {
      '@type': 'Organization',
      name: EDITOR_NAME,
      url: `${SITE_URL}/acerca-de-trucazo`,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/icon-512.png`,
      },
    },
    image: ogImageUrl(headline, description),
  }
}

export const noIndexFollowMetadata: Metadata = {
  robots: {
    index: false,
    follow: true,
    googleBot: { index: false, follow: true },
  },
}

export const privateMetadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
}
