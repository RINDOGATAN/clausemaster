import { NextResponse } from "next/server";

export async function GET() {
  // Redirect to settings page after completing Stripe onboarding
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3002";
  return NextResponse.redirect(`${baseUrl}/settings?stripe=connected`);
}
