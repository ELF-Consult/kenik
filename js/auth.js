/* Kenik - auth.js
   Aanmelden en sessies. Twee soorten gebruikers:
   - ouders: echt account (e-mail + inloglink). Een ouder kan een toestel als gezinstoestel markeren: dan toont het alle kinderen.
   - kinderen: geen account. Een kind komt binnen via een gezinstoestel, of via een code/QR die de ouder toont; het toestel onthoudt het kind.
   De "backend" is uitwisselbaar: OK.backend is lokaal (nagebootst, in deze browser) of Supabase (js/backend-supabase.js, zie README-deploy.md).
   De sessie van dit toestel staat los van de gezinsdata: { type: "parent"|"family"|"child", email?, child?, device? } */
(function (OK) {
  "use strict";
  const SKEY = "kenik_session";
  let session = null;
  OK.session = () => session;
  OK.setSession = s => { session = s; try { if (s) localStorage.setItem(SKEY, JSON.stringify(s)); else localStorage.removeItem(SKEY); } catch (e) { } };
  OK.loadSession = () => { try { session = JSON.parse(localStorage.getItem(SKEY) || "null"); } catch (e) { session = null; } return session; };
  OK.isParentSession = () => !!session && (session.type === "parent" || session.type === "family");
  OK.isChildSession = () => !!session && session.type === "child";

  const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // geen 0/O/1/I
  const rnd = n => Array.from({ length: n }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
  OK.makeChildCode = child => `${child.name.replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase() || "KID"}-${rnd(4)}`;
  OK.deviceLabel = () => { const ua = navigator.userAgent; const os = /iPad/.test(ua) ? "iPad" : /iPhone/.test(ua) ? "iPhone" : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : "toestel"; const br = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : ""; return `${os}${br ? " · " + br : ""}`; };

  /* ---------- lokale backend: bootst de server na in deze browser ---------- */
  /* Gezinsdata staan in de gewone state; codes, toestellen en leden ook, zodat de flows te testen zijn.
     In de echte backend zijn dit tabellen met toegangsregels (zie supabase/schema.sql). */
  const local = {
    mode: "local",
    async signInParent(email) {
      const S = OK.state(); S.family = S.family || { id: OK.uid(), name: "", members: [], invites: [] };
      if (!S.family.members.some(m => m.email === email)) S.family.members.push({ email, role: S.family.members.length ? "parent" : "owner", joined: OK.nowISO() });
      S.family.invites = (S.family.invites || []).filter(i => i.email !== email); OK.save();
      return { ok: true, email, note: "In de echte versie krijg je nu een inloglink per e-mail. Hier ben je meteen binnen." };
    },
    async signOut() { OK.setSession(null); },
    async createChildCode(childId) {
      const S = OK.state(); S.childCodes = (S.childCodes || []).filter(c => c.child !== childId && new Date(c.expires) > new Date());
      const child = OK.childById(childId); const code = OK.makeChildCode(child); const expires = new Date(Date.now() + 15 * 60000).toISOString();
      S.childCodes.push({ code, child: childId, expires }); OK.save(); return { code, expires };
    },
    async childLogin(codeRaw) {
      const code = String(codeRaw || "").trim().toUpperCase().replace(/\s/g, ""); const S = OK.state();
      const c = (S.childCodes || []).find(x => x.code === code);
      if (!c) return { error: "Die code klopt niet. Vraag papa of mama om een nieuwe." };
      if (new Date(c.expires) < new Date()) return { error: "Die code is verlopen (15 minuten). Vraag een nieuwe." };
      const device = { id: OK.uid(), child: c.child, label: OK.deviceLabel(), created: OK.nowISO(), lastSeen: OK.nowISO() };
      S.devices = (S.devices || []); S.devices.push(device); S.childCodes = S.childCodes.filter(x => x !== c); OK.save();
      return { child: c.child, device: device.id };
    },
    async listDevices(childId) { return (OK.state().devices || []).filter(d => d.child === childId); },
    async revokeDevice(id) { const S = OK.state(); S.devices = (S.devices || []).filter(d => d.id !== id); OK.save(); if (session && session.device === id) OK.setSession(null); },
    async members() { const f = OK.state().family || { members: [], invites: [] }; return { members: f.members || [], invites: f.invites || [] }; },
    async inviteParent(email) { const S = OK.state(); S.family = S.family || { id: OK.uid(), members: [], invites: [] }; if (S.family.members.some(m => m.email === email)) return { error: "Die ouder zit al in het gezin." }; if (!S.family.invites.some(i => i.email === email)) S.family.invites.push({ email, sent: OK.nowISO() }); OK.save(); return { ok: true, note: "In de echte versie krijgt deze persoon een e-mail met een link. Zodra die inlogt, ziet hij of zij hetzelfde gezin." }; },
    async removeMember(email) { const S = OK.state(); if (!S.family) return; S.family.members = S.family.members.filter(m => m.email !== email); S.family.invites = (S.family.invites || []).filter(i => i.email !== email); OK.save(); },
    deviceValid(deviceId) { return (OK.state().devices || []).some(d => d.id === deviceId); },
    touchDevice(deviceId) { const d = (OK.state().devices || []).find(x => x.id === deviceId); if (d) { d.lastSeen = OK.nowISO(); OK.save(); } }
  };
  OK.backend = window.OK_BACKEND || local;
  OK.localBackend = local;
})(window.OK);
