/* Kenik - ai.js
   Eén ingang voor alles wat Claude doet voor ouders (foto's van handboeken lezen, leesteksten schrijven).
   Twee wegen, zelfde interface:
     1. de Kenik-server (edge function "ai" bij Supabase) met de API-sleutel van Kenik en een maandlimiet per gezin;
     2. als de pagina in claude.ai open staat zonder server: de ingebouwde koppeling van de artifact (window.claude).
   OK.ai.available() -> { json(prompt, {images, signal}), maxImages, via } of null, met OK.ai.reason als uitleg. */
(function (OK) {
  "use strict";
  let promise = null;
  OK.ai = { reason: "" };

  /* foto verkleinen naar max 1600 px en als JPEG coderen: sneller, goedkoper en ruim voldoende om tekst te lezen */
  async function toJpeg(file, max) {
    const bmp = await createImageBitmap(file).catch(() => null);
    if (!bmp) throw { code: "image_rejected" };
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
    const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(bmp, 0, 0, w, h);
    const url = c.toDataURL("image/jpeg", 0.85);
    return { media_type: "image/jpeg", data: url.slice(url.indexOf(",") + 1) };
  }

  function serverFn() {
    const b = OK.backend; if (!b || b.mode !== "supabase" || !b.accessToken || !b.functionUrl) return null;
    return {
      via: "server", maxImages: 6,
      async json(prompt, opts) {
        opts = opts || {}; const token = await b.accessToken(); if (!token) throw { code: "not_signed_in" };
        const images = []; for (const f of (opts.images || []).slice(0, 6)) images.push(await toJpeg(f, 1600));
        const r = await fetch(b.functionUrl("ai"), { method: "POST", signal: opts.signal, headers: { "content-type": "application/json", authorization: "Bearer " + token }, body: JSON.stringify({ prompt, images, max_tokens: opts.maxTokens || 4000 }) });
        let d = null; try { d = await r.json(); } catch (e) { }
        if (!r.ok) throw { code: r.status === 429 ? "quota" : r.status === 401 ? "not_signed_in" : "server", message: d && d.error || ("Fout " + r.status) };
        OK.ai.used = d.used; OK.ai.limit = d.limit;
        return d.json;
      }
    };
  }

  async function claudeFn() {
    if (!window.claude || !window.claude.use) return null;
    const fn = await window.claude.use("sample"); if (!fn) return null;
    const lim = await fn.limits().catch(() => null); if (!lim || !lim.images) return null;
    return { via: "claude", maxImages: lim.images.maxCount, json: (prompt, opts) => fn.json(prompt, Object.assign({ cache: false }, opts || {})) };
  }

  OK.ai.available = function () {
    if (promise) return promise;
    promise = (async () => {
      try {
        const s = serverFn(); if (s) return s;
        const c = await claudeFn(); if (c) return c;
        OK.ai.reason = OK.backend && OK.backend.mode === "supabase" ? "Log in als ouder om foto's te laten lezen." : "Foto's inlezen werkt enkel op kenik.be met een ouderaccount, of in de Claude-versie van de app.";
        return null;
      } catch (e) { OK.ai.reason = "Verbinding mislukt (" + (e && e.message || "onbekend") + ")."; return null; }
    })();
    return promise;
  };
  OK.ai.reset = () => { promise = null; };
  OK.ai.errorText = function (e, fallback) {
    const c = e && e.code;
    if (c === "cancelled" || (e && e.name === "AbortError")) return "Gestopt.";
    if (c === "quota") return e.message;
    if (c === "not_signed_in") return "Je bent niet (meer) ingelogd als ouder. Log opnieuw in.";
    if (c === "not_granted") return "Je gaf de pagina geen toegang tot Claude.";
    if (c === "rate_limited") return "Even te veel gevraagd. Probeer het over een paar minuten opnieuw.";
    if (c === "image_rejected") return "Die foto kon niet gelezen worden. Probeer een JPG of PNG.";
    if (c === "invalid_json") return "Het antwoord was niet bruikbaar. Probeer het nog eens, liefst met een scherpere foto.";
    if (c === "server") return e.message || fallback;
    return fallback || ("Er liep iets mis" + (e && e.message ? ": " + e.message : "."));
  };
})(window.OK);
