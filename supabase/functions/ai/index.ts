// Kenik - edge function ai
// Leest foto's van handboekpagina's uit en maakt leesteksten via de Claude-API, voor ingelogde ouders.
// Beveiliging: de gebruiker moet een geldige Supabase-sessie hebben (Authorization: Bearer <access token>) en ouder zijn
// van een gezin; per gezin geldt een maandlimiet (AI_LIMIT, standaard 40 aanvragen).
//
// Secrets: ANTHROPIC_API_KEY (verplicht), optioneel AI_MODEL (standaard claude-sonnet-5-5), AI_LIMIT.
// SUPABASE_URL, SUPABASE_ANON_KEY en SUPABASE_SERVICE_ROLE_KEY zijn standaard aanwezig.
//
// POST { prompt: string, images?: [{ media_type: "image/jpeg", data: "<base64>" }], max_tokens?: number }
//   -> { json: <geparseerd antwoord>, used: n, limit: n }
// Deploy met verify_jwt = false: de functie controleert de sessie zelf (zo geven we een nette foutmelding).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const url = Deno.env.get("SUPABASE_URL")!;
const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const apiKey = Deno.env.get("ANTHROPIC_API_KEY") || "";
const model = Deno.env.get("AI_MODEL") || "claude-sonnet-5-5";
const limit = parseInt(Deno.env.get("AI_LIMIT") || "40", 10);
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  if (!apiKey) return json({ error: "De AI-functie is nog niet ingesteld (ANTHROPIC_API_KEY ontbreekt)." }, 500);

  // wie vraagt dit? enkel ouders met een geldige sessie
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Log eerst in als ouder." }, 401);
  const asUser = createClient(url, anon, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: u, error: ue } = await asUser.auth.getUser();
  if (ue || !u?.user) return json({ error: "Je sessie is verlopen. Log opnieuw in." }, 401);
  const { data: fam } = await asUser.from("family_members").select("family_id").limit(1);
  const familyId = fam?.[0]?.family_id;
  if (!familyId) return json({ error: "Geen gezin gevonden voor dit account." }, 403);

  let body: any; try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const prompt = String(body.prompt || "").slice(0, 8000);
  const images = Array.isArray(body.images) ? body.images.slice(0, 6) : [];
  if (!prompt) return json({ error: "Geen opdracht." }, 400);
  for (const im of images) {
    if (!/^image\/(jpeg|png|webp|gif)$/.test(String(im.media_type)) || typeof im.data !== "string" || im.data.length > 6_000_000) return json({ error: "Een foto is te groot of heeft een onbekend formaat." }, 400);
  }

  // limiet per gezin per maand
  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { data: take, error: te } = await admin.rpc("ai_take", { p_family: familyId, p_limit: limit });
  if (te) return json({ error: "Kon het gebruik niet registreren: " + te.message }, 500);
  if (!take?.ok) return json({ error: `De maandlimiet van ${take?.limit ?? limit} foto's en teksten is bereikt voor jullie gezin. Volgende maand kan het weer.`, used: take?.used, limit: take?.limit }, 429);

  // Claude aanroepen
  const content: any[] = images.map((im: any) => ({ type: "image", source: { type: "base64", media_type: im.media_type, data: im.data } }));
  content.push({ type: "text", text: prompt + "\n\nAntwoord uitsluitend met geldige JSON, zonder tekst ervoor of erna en zonder markdown." });
  let text = "";
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: Math.min(8000, Number(body.max_tokens) || 4000), messages: [{ role: "user", content }] })
    });
    const d = await r.json();
    if (!r.ok) return json({ error: "De AI gaf een fout: " + (d?.error?.message || r.status) }, 502);
    text = (d.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("");
  } catch (e) { return json({ error: "De AI is niet bereikbaar: " + (e as Error).message }, 502); }

  // JSON eruit halen, ook als er toch tekst rond staat
  let parsed: unknown = null;
  try { parsed = JSON.parse(text); } catch {
    const m = text.match(/[\[{][\s\S]*[\]}]/); if (m) { try { parsed = JSON.parse(m[0]); } catch { /* valt hieronder */ } }
  }
  if (parsed === null) return json({ error: "Het antwoord was niet leesbaar. Probeer een scherpere foto." }, 502);
  return json({ json: parsed, used: take.used, limit: take.limit });
});
