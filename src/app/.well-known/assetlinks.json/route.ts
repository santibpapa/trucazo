import { NextResponse } from 'next/server'
import { androidAssetLinks } from '@/lib/android-probe'
import config from '../../../../android/twa-manifest.json'

export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json(androidAssetLinks(config.packageId, process.env.ANDROID_SHA256_FINGERPRINTS), {
    headers: { 'Cache-Control': 'public, max-age=300', 'X-Robots-Tag': 'noindex' },
  })
}
