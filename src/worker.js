// Cloudflare Worker: serves the static page from public/ and handles /api/*.
// Secrets (set in Cloudflare, never in code): SITE_PASSWORD, SUPABASE_KEY.
import { passwordMatches, createSessionCookie, hasValidSession, json } from "./session.js";
import { listTips, addTip } from "./tips.js";

async function login(request, env) {
  let password = "";
  try { ({ password = "" } = await request.json()); } catch { /* treat as empty */ }

  if (!(await passwordMatches(password, env.SITE_PASSWORD))) {
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return json({ error: "Incorrect password." }, 401);
  }
  return json(null, 204, { "Set-Cookie": await createSessionCookie(env) });
}

async function handleApi(request, env, path) {
  if (!env.SITE_PASSWORD) {
    return json({ error: "The site password hasn't been set up in Cloudflare yet." }, 500);
  }
  const route = `${request.method} ${path}`;

  if (route === "POST /api/login") return login(request, env);

  // Everything else requires a valid login cookie.
  if (!(await hasValidSession(request, env))) return json({ error: "Please enter the password." }, 401);

  switch (route) {
    case "GET /api/session": return json(null, 204);
    case "GET /api/tips": return listTips(env);
    case "POST /api/tips": return addTip(request, env);
    default: return json({ error: "Not found." }, 404);
  }
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith("/api/")) return handleApi(request, env, pathname);
    return env.ASSETS.fetch(request);
  },
};
