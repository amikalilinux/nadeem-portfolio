import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export async function GET() {
  const contentPath = path.join(process.cwd(), "src", "data", "content.json");
  const content = await readFile(contentPath, "utf8");

  return new NextResponse(content, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
