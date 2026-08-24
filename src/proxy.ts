import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth/session'

const PUBLIC_PATHS = ['/login', '/setup']

export function proxy(request: NextRequest) {
  // Les routes API font leur propre vérification (withAuth/withAdmin) et
  // renvoient un 401/403 JSON — pas de redirection HTML à leur imposer ici.
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const hasSession = !!request.cookies.get(SESSION_COOKIE)?.value
  const isPublicPath = PUBLIC_PATHS.some(p => request.nextUrl.pathname.startsWith(p))

  if (!hasSession && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  if (hasSession && isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
