import { NextResponse } from "next/server";

export async function GET() {
  // Redirect to publisher setup wizard when Stripe link expires — user can retry
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3002";
  return NextResponse.redirect(`${baseUrl}/publisher-setup?stripe=refresh`);
}
