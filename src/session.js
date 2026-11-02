// Signed session cookie: "<expiry-ms>.<base64url HMAC-SHA256>".
// The HMAC key is the SITE_PASSWORD secret, so changing the password
// in Cloudflare logs everyone out.

export const COOKIE_NAME = "cag_session";
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const enc = new TextEncoder();

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
}

function toB64url(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function equalBytes(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// Constant-time password comparison (compares HMACs so lengths always match).
export async function passwordMatches(input, password) {
  const nonce = crypto.getRandomValues(new Uint8Array(16)).join(",");
  const [a, b] = await Promise.all([hmac(nonce, String(input)), hmac(nonce, password)]);
  return equalBytes(a, b);
}

export async function createSessionCookie(env) {
  const exp = Date.now() + SESSION_MS;
  const sig = toB64url(await hmac(env.SITE_PASSWORD, "session:" + exp));
  return `${COOKIE_NAME}=${exp}.${sig}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_MS / 1000}`;
}

export async function hasValidSession(request, env) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=(\\d+)\\.([A-Za-z0-9_-]+)`));
  if (!match) return false;
  const [, exp, sig] = match;
  if (Number(exp) < Date.now()) return false;
  const expected = toB64url(await hmac(env.SITE_PASSWORD, "session:" + exp));
  return equalBytes(enc.encode(sig), enc.encode(expected));
}

export function json(body, status = 200, headers = {}) {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });
}
