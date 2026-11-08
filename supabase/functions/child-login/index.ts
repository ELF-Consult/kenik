// Kenik - edge function child-login
// Ruilt een kindcode (door een ouder gemaakt) in voor een kindtoken: een JWT met role "child" en claim child_id,
// plus een vernieuwingstoken dat het toestel bewaart. Ook: token vernieuwen en toestel afmelden.
//
// Deploy: supabase functions deploy child-login --no-verify-jwt
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (standaard aanwezig), JWT_SECRET (= JWT secret van het project, Settings > API)
//
// POST { action: "login", code: "LIV-4K7P", label: "iPad · Safari" }
//   -> { access_token, refresh_token, child_id, family_id, device_id, expires_in }
// POST { action: "refresh", refresh_token }
//   -> { access_token, expires_in }
// POST { action: "logout", refresh_token }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const url = Deno.env.get("SUPABASE_URL")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const jwtSecret = Deno.env.get("JWT_SECRET")!;
const ACCESS_TTL = 60 * 60 * 12;          // 12 uur
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };

const sha256 = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))).map(b => b.toString(16).padStart(2, "0")).join("");
const randomToken = () => { const a = new Uint8Array(32); crypto.getRandomValues(a); return Array.from(a).map(b => b.toString(16).padStart(2, "0")).join(""); };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });

async function signChildToken(childId: string, familyId: string, deviceId: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(jwtSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
  // role "child" moet in Postgres bestaan met dezelfde rechten als "authenticated": create role child; grant child to authenticator; grant usage/select/insert/update on tables (zie README)
  return await create({ alg: "HS256", typ: "JWT" }, { role: "child", aud: "authenticated", child_id: childId, family_id: familyId, device_id: deviceId, exp: getNumericDate(ACCESS_TTL) }, key);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const db = createClient(url, service, { auth: { persistSession: false } });
  let body: any; try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }

  if (body.action === "login") {
    const code = String(body.code || "").trim().toUpperCase().replace(/\s/g, "");
    const { data: row } = await db.from("child_codes").select("*").eq("code", code).maybeSingle();
    if (!row) return json({ error: "Die code klopt niet. Vraag papa of mama om een nieuwe." }, 404);
    if (new Date(row.expires_at) < new Date()) { await db.from("child_codes").delete().eq("code", code); return json({ error: "Die code is verlopen (15 minuten). Vraag een nieuwe." }, 410); }
    const refresh = randomToken();
    const { data: dev, error } = await db.from("child_devices").insert({ child_id: row.child_id, family_id: row.family_id, label: String(body.label || "toestel").slice(0, 80), token_hash: await sha256(refresh) }).select().single();
    if (error) return json({ error: "Kon het toestel niet registreren." }, 500);
    await db.from("child_codes").delete().eq("code", code);
    const access = await signChildToken(row.child_id, row.family_id, dev.id);
    return json({ access_token: access, refresh_token: refresh, child_id: row.child_id, family_id: row.family_id, device_id: dev.id, expires_in: ACCESS_TTL });
  }

  if (body.action === "refresh") {
    const hash = await sha256(String(body.refresh_token || ""));
    const { data: dev } = await db.from("child_devices").select("*").eq("token_hash", hash).is("revoked_at", null).maybeSingle();
    if (!dev) return json({ error: "revoked" }, 401);
    await db.from("child_devices").update({ last_seen: new Date().toISOString() }).eq("id", dev.id);
    return json({ access_token: await signChildToken(dev.child_id, dev.family_id, dev.id), expires_in: ACCESS_TTL });
  }

  if (body.action === "logout") {
    const hash = await sha256(String(body.refresh_token || ""));
    await db.from("child_devices").update({ revoked_at: new Date().toISOString() }).eq("token_hash", hash);
    return json({ ok: true });
  }
  return json({ error: "unknown action" }, 400);
});
