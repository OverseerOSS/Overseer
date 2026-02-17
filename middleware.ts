import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt } from "@/lib/session";

export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (process.env.DEMO === "true") {
    return NextResponse.next();
  }
  
  // Define public paths that do not require authentication
  const isPublicPath = 
    path === "/login" || 
    path === "/setup" || 
    path.startsWith("/status") || 
    path.startsWith("/public");
    
  // Decrypt the session from the cookie
  const cookie = req.cookies.get("session")?.value;
  const session = await decrypt(cookie);

  // 1. If user is NOT authenticated and tries to access a PROTECTED route
  if (!session?.userId && !isPublicPath) {
    const loginUrl = new URL("/login", req.nextUrl);
    // Optional: Add ?next=path to redirect back after login
    // loginUrl.searchParams.set("from", path);
    return NextResponse.redirect(loginUrl);
  }

  // 2. If user IS authenticated and tries to access Guest-Only routes (login, setup)
  if (session?.userId && (path === "/login" || path === "/setup")) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
}

// Routes Middleware should not run on
export const config = {
  // Exclude api, static files, images
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$|.*\\.ico$).*)"],
};
