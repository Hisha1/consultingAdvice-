// Runs before every /api/* request: blocks everything except login
// unless the visitor has a valid session cookie.
import { hasValidSession, json } from "../../lib/session.js";

export async function onRequest({ request, env, next }) {
  if (!env.SITE_PASSWORD) {
    return json({ error: "The site password hasn't been set up in Cloudflare yet." }, 500);
  }
  const { pathname } = new URL(request.url);
  if (pathname === "/api/login") return next();
  if (!(await hasValidSession(request, env))) return json({ error: "Please enter the password." }, 401);
  return next();
}
