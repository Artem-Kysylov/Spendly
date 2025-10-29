import createMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export default function middleware(req: NextRequest): NextResponse {
  console.log('Middleware running for path:', req.nextUrl.pathname);
  const response = intlMiddleware(req);
  console.log('Middleware response status:', response.status);
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};
