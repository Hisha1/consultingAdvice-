import { json } from "./session.js";

const CATEGORIES = [
  "Interview Prep Advice", "Office Selection", "Application",
  "Consulting Advice", "Interesting Case", "Miscellaneous",
];
const MAX_WORDS = 250;

function supabase(env, path, init = {}) {
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) {
    throw new Error("SUPABASE_URL and SUPABASE_KEY must be set in Cloudflare.");
  }
  return fetch(env.SUPABASE_URL.replace(/\/+$/, "") + "/rest/v1/" + path, {
    ...init,
    headers: { apikey: env.SUPABASE_KEY, "Content-Type": "application/json", ...init.headers },
  });
}

async function failure(res, what) {
  console.error(`Supabase ${what} failed`, res.status, await res.text());
  return json({ error: `Could not ${what} (database error ${res.status}).` }, 502);
}

export async function listTips(env) {
  try {
    const res = await supabase(env, "tips?select=*&order=created_at.desc");
    if (!res.ok) return failure(res, "load tips");
    return json(await res.json());
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

const clean = (v) => (typeof v === "string" ? v.trim() : "");

export async function addTip(request, env) {
  let input;
  try { input = await request.json(); } catch { return json({ error: "Invalid request." }, 400); }

  const tip = {
    title: clean(input.title),
    category: clean(input.category),
    contributor: clean(input.contributor) || null,
    source: clean(input.source) || null,
    body: clean(input.body),
  };
  const words = (tip.body.match(/\S+/g) || []).length;

  if (!tip.title || tip.title.length > 100) return json({ error: "Title must be 1–100 characters." }, 400);
  if (!CATEGORIES.includes(tip.category)) return json({ error: "Please choose a valid category." }, 400);
  if (tip.contributor && tip.contributor.length > 60) return json({ error: "Contributor name is too long." }, 400);
  if (tip.source && tip.source.length > 120) return json({ error: "Source is too long." }, 400);
  if (!words) return json({ error: "Please write your tip." }, 400);
  if (words > MAX_WORDS) return json({ error: `Tips can be at most ${MAX_WORDS} words.` }, 400);

  try {
    const res = await supabase(env, "tips", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(tip),
    });
    if (!res.ok) return failure(res, "save your tip");
    const [saved] = await res.json();
    return json(saved, 201);
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
