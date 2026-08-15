import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/site'

export const SITE_NAME = 'Trucazo'
export const EDITOR_NAME = 'Equipo de Trucazo'
export const CONTENT_UPDATED_AT = '2026-08-15'

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
      ...(type === 'article'
        ? {
            publishedTime: CONTENT_UPDATED_AT,
            modifiedTime: CONTENT_UPDATED_AT,
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
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    description,
    url: `${SITE_URL}${path}`,
    mainEntityOfPage: `${SITE_URL}${path}`,
    inLanguage: 'es-AR',
    datePublished: CONTENT_UPDATED_AT,
    dateModified: CONTENT_UPDATED_AT,
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
