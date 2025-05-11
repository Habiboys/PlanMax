import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

  // Define public paths that don't require authentication
  const publicPaths = [
    "/",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/api/auth",
    "/_next",
    "/favicon.ico",
    "/images",
    "/styles"
  ]

  // Define protected paths that require authentication
  const protectedPaths = [
    "/dashboard",
    "/dashboard/[projectId]",
    "/settings",
    "/profile",
    "/ai-project",
    "/dashboard/teams",
    "/dashboard/points"
  ]

  // Check if the current path is public
  const isPublicPath = publicPaths.some((path) => {
    const pathRegex = new RegExp(`^${path.replace(/\[.*?\]/g, "[^/]+")}($|/)`)
    return pathRegex.test(request.nextUrl.pathname)
  })

  // Check if the current path is protected
  const isProtectedPath = protectedPaths.some((path) => {
    const pathRegex = new RegExp(`^${path.replace(/\[.*?\]/g, "[^/]+")}($|/)`)
    return pathRegex.test(request.nextUrl.pathname)
  })

  // If the path is protected and the user is not authenticated, redirect to login
  if (isProtectedPath && !token) {
    const url = new URL("/login", request.url)
    url.searchParams.set("callbackUrl", encodeURI(request.url))
    return NextResponse.redirect(url)
  }

  // If the user is authenticated and trying to access login/register, redirect to dashboard
  if (token && (request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
}
