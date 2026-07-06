import { NextRequest, NextResponse } from "next/server";

export default async function middleware(request: NextRequest) {
  const isAuthPage = request.nextUrl.pathname.startsWith("/auth");
  const isDashboardPage = request.nextUrl.pathname.startsWith("/dashboard");
  const isPortfolioPage = request.nextUrl.pathname.startsWith("/portfolio");

  if (!isAuthPage && !isDashboardPage && !isPortfolioPage) {
    return NextResponse.next();
  }

  try {
    const { auth } = await import("@/auth");
    const session = await auth();

    if (isDashboardPage || isPortfolioPage) {
      if (!session) {
        return NextResponse.redirect(new URL("/auth/signin", request.url));
      }
    }

    if (isAuthPage && session) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  } catch {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/portfolio/:path*", "/auth/:path*"],
};
