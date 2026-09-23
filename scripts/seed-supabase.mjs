import fs from "node:fs/promises";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY before seeding.");
}

const content = JSON.parse(await fs.readFile(new URL("../src/data/content.json", import.meta.url), "utf8"));
const response = await fetch(`${url}/rest/v1/portfolio_content?on_conflict=slug`, {
  method: "POST",
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=representation",
  },
  body: JSON.stringify({ slug: "main", content }),
});

if (!response.ok) {
  throw new Error(`Supabase seed failed (${response.status}): ${await response.text()}`);
}

console.log("Uploaded portfolio content to Supabase.");
