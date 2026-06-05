import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/session";

const publicRoutes = ["/login"];
const adminRoutes = ["/admin"];

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublicRoute = publicRoutes.includes(path);

  const cookie = request.cookies.get("session")?.value;
  const session = await decrypt(cookie);

  if (!session && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }

  if (session && path === "/login") {
    return NextResponse.redirect(new URL("/projetos", request.nextUrl));
  }

  if (adminRoutes.some((r) => path.startsWith(r)) && session?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/projetos", request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
