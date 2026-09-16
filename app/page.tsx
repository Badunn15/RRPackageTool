import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import Calculator from "@/components/Calculator";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/sign-in");

  return (
    <Calculator
      userEmail={session.user.email}
      signOutAction={async () => {
        "use server";
        await signOut({ redirectTo: "/sign-in" });
      }}
    />
  );
}
