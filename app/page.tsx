import { auth, signOut } from "@/lib/auth";
import Calculator from "@/components/Calculator";

export default async function HomePage() {
  const session = await auth();

  return (
    <Calculator
      userEmail={session?.user?.email ?? ""}
      signOutAction={async () => {
        "use server";
        await signOut({ redirectTo: "/sign-in" });
      }}
    />
  );
}
