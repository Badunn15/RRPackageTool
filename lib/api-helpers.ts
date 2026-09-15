import { NextResponse } from "next/server";
import { auth } from "./auth";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Every route requires an authenticated session; returns the signed-in user's email. */
export async function requireUser(): Promise<string> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) throw new ApiError(401, "Not signed in.");
  return email;
}

export function jsonError(err: unknown) {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error(err);
  return NextResponse.json({ error: "Internal server error." }, { status: 500 });
}
