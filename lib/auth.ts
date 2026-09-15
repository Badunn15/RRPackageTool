import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const allowedDomain = process.env.AUTH_ALLOWED_DOMAIN;

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  pages: { signIn: "/sign-in" },
  callbacks: {
    async signIn({ profile }) {
      if (!allowedDomain) return true; // no domain configured — allow (dev/local)
      const email = profile?.email ?? "";
      const domain = email.split("@")[1]?.toLowerCase();
      return domain === allowedDomain.toLowerCase();
    },
    async session({ session }) {
      return session;
    },
  },
});
