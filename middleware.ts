export { auth as middleware } from "@/lib/auth";

export const config = {
  // Protect everything except sign-in, the NextAuth API routes, and static assets.
  matcher: ["/((?!api/auth|sign-in|_next/static|_next/image|favicon.ico).*)"],
};
