import { NextRequest, NextResponse } from "next/server";
import fallbackContent from "@/data/content.json";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function isContent(value: unknown): value is typeof fallbackContent {
  return Boolean(value && typeof value === "object" && "profile" in value && "about" in value);
}

function isMissingTableError(message: string) {
  return message.includes("portfolio_content") && (message.includes("schema cache") || message.includes("does not exist"));
}

export async function GET() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json(fallbackContent);

  const { data, error } = await supabase.from("portfolio_content").select("content").eq("slug", "main").maybeSingle();
  if (error && !isMissingTableError(error.message)) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(isContent(data?.content) ? data.content : fallbackContent);
}

export async function PUT(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!isContent(body)) return NextResponse.json({ error: "Content must include profile and about fields." }, { status: 400 });

  const { error } = await supabase.from("portfolio_content").upsert({ slug: "main", content: body, updated_by: user.id }, { onConflict: "slug" });
  if (error) {
    if (isMissingTableError(error.message)) {
      return NextResponse.json({ error: "Supabase database setup is incomplete. Run supabase/migrations/202609220001_portfolio.sql in the Supabase SQL Editor, then reload this dashboard." }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ saved: true, content: body });
}
