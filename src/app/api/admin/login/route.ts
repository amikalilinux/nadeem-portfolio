import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const ADMIN_EMAIL = "asha03400932@gmail.com";

export async function GET() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ configured: false, authenticated: false });

  const { data: { user } } = await supabase.auth.getUser();
  return NextResponse.json({ configured: true, authenticated: Boolean(user), email: user?.email ?? null });
}

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured. Add the public Supabase environment variables." }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (email !== ADMIN_EMAIL) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  return NextResponse.json({ authenticated: true });
}

export async function DELETE() {
  const supabase = await getSupabaseServerClient();
  if (supabase) await supabase.auth.signOut();
  return NextResponse.json({ authenticated: false });
}
