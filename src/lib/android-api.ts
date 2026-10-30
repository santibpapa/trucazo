import { NextResponse } from 'next/server'

export function androidOriginAllowed(request: Request) {
  const origin = request.headers.get('origin')
  return !origin || origin === 'https://localhost' || origin === new URL(request.url).origin
    || (process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))
}

export function androidResponse(request: Request, body: unknown, status = 200) {
  const headers: Record<string, string> = { 'Cache-Control': 'no-store', Vary: 'Origin' }
  const origin = request.headers.get('origin')
  if (origin && androidOriginAllowed(request)) headers['Access-Control-Allow-Origin'] = origin
  return NextResponse.json(body, { status, headers })
}

export function androidOptions(request: Request) {
  if (!androidOriginAllowed(request)) return androidResponse(request, { error: 'Origen no permitido.' }, 403)
  const response = new NextResponse(null, { status: 204 })
  const origin = request.headers.get('origin')
  if (origin) response.headers.set('Access-Control-Allow-Origin', origin)
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  response.headers.set('Vary', 'Origin')
  return response
}

export async function withAndroidCors(request: Request, handler: () => Promise<Response>) {
  if (!androidOriginAllowed(request)) return androidResponse(request, { error: 'Origen no permitido.' }, 403)
  const response = await handler()
  const origin = request.headers.get('origin')
  if (origin) response.headers.set('Access-Control-Allow-Origin', origin)
  response.headers.set('Vary', 'Origin')
  response.headers.set('Cache-Control', 'no-store')
  return response
}
