import { signIn } from "@/lib/auth";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy font-body">
      <div className="w-full max-w-sm rounded-lg border border-gold/30 bg-card p-8 text-center shadow-xl">
        <h1 className="font-display text-2xl text-cream">Package Cost Calculator</h1>
        <p className="mt-2 text-sm text-cream/70">Raynor Realty — internal tool</p>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="mt-6 w-full rounded-md bg-gold px-4 py-2 font-semibold text-navy transition hover:brightness-95"
          >
            Sign in with Google
          </button>
        </form>
        <p className="mt-4 text-xs text-cream/50">
          Restricted to @raynorrealtync.com accounts.
        </p>
      </div>
    </div>
  );
}
