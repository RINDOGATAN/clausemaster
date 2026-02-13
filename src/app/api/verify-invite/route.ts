import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET() {
  const required = !!process.env.INVITE_CODE;
  return NextResponse.json({ required });
}

export async function POST(request: Request) {
  const inviteCode = process.env.INVITE_CODE;

  // If no invite code is configured, access is open
  if (!inviteCode) {
    return NextResponse.json({ valid: true });
  }

  const body = await request.json();
  const code = String(body.code ?? "");

  // Constant-time comparison to prevent timing attacks
  const codeBuffer = Buffer.from(code);
  const expectedBuffer = Buffer.from(inviteCode);

  const valid =
    codeBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(codeBuffer, expectedBuffer);

  return NextResponse.json({ valid });
}
