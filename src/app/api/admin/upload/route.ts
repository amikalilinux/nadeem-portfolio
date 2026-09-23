import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email?.toLowerCase() !== "asha03400932@gmail.com") {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const kind = formData.get("kind") === "cv" ? "cv" : "image";
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Choose a file first." }, { status: 400 });
  if (kind === "image" && (!imageTypes.has(file.type) || file.size > MAX_IMAGE_SIZE)) {
    return NextResponse.json({ error: "Images must be JPG, PNG, WebP, or GIF files under 5 MB." }, { status: 400 });
  }
  if (kind === "cv" && (file.type !== "application/pdf" || file.size > MAX_DOCUMENT_SIZE)) {
    return NextResponse.json({ error: "The CV must be a PDF file under 10 MB." }, { status: 400 });
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || (kind === "cv" ? "pdf" : "jpg");
  const path = `${kind}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("portfolio-media").upload(path, file, { contentType: file.type, upsert: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data } = supabase.storage.from("portfolio-media").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
