import { passwordMatches, createSessionCookie, json } from "../../lib/session.js";

export async function onRequestPost({ request, env }) {
  let password = "";
  try { ({ password = "" } = await request.json()); } catch { /* treat as empty */ }

  if (!(await passwordMatches(password, env.SITE_PASSWORD))) {
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return json({ error: "Incorrect password." }, 401);
  }
  return json(null, 204, { "Set-Cookie": await createSessionCookie(env) });
}
