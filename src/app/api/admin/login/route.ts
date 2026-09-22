import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

const adminEmail = "asha03400932@gmail.com";
const adminPasswordHash = "d2be53689200688c3dea2fb5918ad01cae9c5a4d9ebab2d2b0545b5ac66df58c";
const sessionValue = "nadeem-admin-session";

function matchesPassword(password: string) {
  const received = createHash("sha256").update(password).digest("hex");
  return timingSafeEqual(Buffer.from(received), Buffer.from(adminPasswordHash));
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ authenticated: request.cookies.get("nadeem_admin")?.value === sessionValue });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (email !== adminEmail || !matchesPassword(password)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const response = NextResponse.json({ authenticated: true });
  response.cookies.set("nadeem_admin", sessionValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
    path: "/",
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.delete("nadeem_admin");
  return response;
}
