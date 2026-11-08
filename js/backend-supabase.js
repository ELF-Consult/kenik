/* Kenik - backend-supabase.js
   Echte backend: ouders via Supabase Auth (e-maillink), kinderen via de edge function child-login, data in Postgres met RLS.
   Wordt alleen actief als config.js bestaat met window.KENIK_CONFIG = { supabaseUrl, supabaseAnonKey }.
   Laadvolgorde in index.html: supabase-js (cdnjs) -> config.js -> dit bestand -> auth.js.
   De app blijft "lokaal eerst": OK.state() is de waarheid op het toestel; deze laag haalt bij het starten alles op en
   duwt wijzigingen met een korte vertraging terug. Conflicten: laatste schrijver wint, per document.
   NIET getest tegen een echt project; zie README-deploy.md voor de stappen en wat te controleren. */
(function () {
  "use strict";
  const cfg = window.KENIK_CONFIG; if (!cfg || !cfg.supabaseUrl || !window.supabase) return;
  const OK = window.OK = window.OK || {};
  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  const FN = cfg.supabaseUrl.replace(/\/$/, "") + "/functions/v1/child-login";
  const KID_KEY = "kenik_child_refresh";
  let childAuth = null;      // { access_token, refresh_token, child_id, family_id, device_id, exp }
  let familyId = null, lastPushed = {}, pushTimer = null, pulling = false;

  /* client met kindtoken: zelfde database, andere identiteit */
  const childClient = () => window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { global: { headers: { Authorization: "Bearer " + childAuth.access_token } }, auth: { persistSession: false } });
  const db = () => childAuth ? childClient() : sb;
  const DOC_KEYS = ["lists", "texts", "verbs", "rewards", "tasks", "settings"];

  /* ---------- ophalen ---------- */
  async function pull() {
    if (pulling) return; pulling = true;
    try {
      const S = OK.state(); const c = db();
      if (!familyId) { if (childAuth) familyId = childAuth.family_id; else { const { data: m } = await sb.from("family_members").select("family_id").limit(1); familyId = m && m[0] ? m[0].family_id : null; } }
      if (!familyId) return;
      const [{ data: fam }, { data: kids }, { data: prog }, { data: docs }, { data: reqs }] = await Promise.all([
        c.from("families").select("*").eq("id", familyId).maybeSingle(), c.from("children").select("*").eq("family_id", familyId),
        c.from("child_progress").select("*").eq("family_id", familyId), c.from("family_docs").select("*").eq("family_id", familyId), c.from("reward_requests").select("*").eq("family_id", familyId)]);
      if (fam) { S.settings.region = fam.region || S.settings.region; S.settings.lang = fam.lang || S.settings.lang; }
      (docs || []).forEach(d => { if (d.key === "settings") Object.assign(S.settings, d.data || {}); else S[d.key] = d.data || []; });
      if (kids) {
        const byId = {}; (prog || []).forEach(p => byId[p.child_id] = p);
        S.children = kids.map(k => { const p = byId[k.id] || {}; return { id: k.id, name: k.name, grade: k.grade, theme: k.theme, modules: k.modules || {}, points: p.points || 0, streak: p.streak || 0, best: p.best || 0, garden: p.garden || { flowers: 0, collected: [], parties: 0 }, created: k.created_at }; });
        S.stats = {}; S.sessions = []; S.log = [];
        (prog || []).forEach(p => { S.stats[p.child_id] = p.stats || {}; S.sessions = S.sessions.concat(p.sessions || []); S.log = S.log.concat(p.log || []); });
        S.sessions.sort((a, b) => b.d.localeCompare(a.d)); S.log.sort((a, b) => b.d.localeCompare(a.d));
      }
      if (reqs) S.requests = reqs.map(r => ({ id: r.id, child: r.child_id, reward: r.reward, cost: r.cost, d: r.created_at, status: r.status })).sort((a, b) => b.d.localeCompare(a.d));
      S.family = S.family || {}; S.family.id = familyId;
      lastPushed = snapshot(); OK.save(true);
      if (OK.onRemoteChange) OK.onRemoteChange();
    } catch (e) { console.warn("pull", e); } finally { pulling = false; }
  }
  const snapshot = () => { const S = OK.state(); const o = {}; DOC_KEYS.forEach(k => o[k] = JSON.stringify(k === "settings" ? S.settings : S[k] || [])); S.children.forEach(c => { o["child:" + c.id] = JSON.stringify([c.name, c.grade, c.theme, c.modules]); o["prog:" + c.id] = JSON.stringify([c.points, c.streak, c.best, c.garden, S.stats[c.id] || {}]); }); o.sessions = String((S.sessions || []).length); o.requests = JSON.stringify(S.requests || []); return o; };

  /* ---------- terugschrijven ---------- */
  function schedulePush() { clearTimeout(pushTimer); pushTimer = setTimeout(push, 1500); }
  async function push() {
    if (!familyId) return; const S = OK.state(); const now = snapshot(); const c = db();
    try {
      if (!childAuth) {
        for (const k of DOC_KEYS) if (now[k] !== lastPushed[k]) await c.from("family_docs").upsert({ family_id: familyId, key: k, data: k === "settings" ? S.settings : S[k] || [], updated_at: new Date().toISOString() });
        if (now.settings !== lastPushed.settings) await c.from("families").update({ region: S.settings.region, lang: S.settings.lang }).eq("id", familyId);
        for (const ch of S.children) {
          if (now["child:" + ch.id] !== lastPushed["child:" + ch.id]) await c.from("children").upsert({ id: ch.id, family_id: familyId, name: ch.name, grade: ch.grade, theme: ch.theme, modules: ch.modules });
          if (now["prog:" + ch.id] !== lastPushed["prog:" + ch.id] || now.sessions !== lastPushed.sessions) await c.from("child_progress").upsert(progressRow(ch));
        }
        // verwijderde kinderen
        const ids = S.children.map(x => x.id); const { data: remote } = await c.from("children").select("id").eq("family_id", familyId);
        for (const r of remote || []) if (!ids.includes(r.id)) await c.from("children").delete().eq("id", r.id);
        // aanvragen: status door ouder
        for (const q of S.requests || []) if (q.status !== "open") await c.from("reward_requests").update({ status: q.status, decided_at: new Date().toISOString() }).eq("id", q.id);
      } else {
        const ch = S.children.find(x => x.id === childAuth.child_id); if (!ch) return;
        if (now["prog:" + ch.id] !== lastPushed["prog:" + ch.id] || now.sessions !== lastPushed.sessions) await c.from("child_progress").upsert(progressRow(ch));
        for (const q of S.requests || []) if (q.status === "open" && !q.synced) { const { data } = await c.from("reward_requests").insert({ family_id: familyId, child_id: ch.id, reward: q.reward, cost: q.cost }).select().single(); if (data) { q.id = data.id; q.synced = true; } }
        for (const t of S.tasks || []) if (t.status === "done" && t.doneBy === ch.id && !t.synced) { await c.rpc("complete_task", { p_family: familyId, p_task: t.id, p_score: t.score || "" }); t.synced = true; }
      }
      lastPushed = now;
    } catch (e) { console.warn("push", e); schedulePush(); }
  }
  const progressRow = ch => { const S = OK.state(); return { child_id: ch.id, family_id: familyId, points: ch.points, streak: ch.streak, best: ch.best, garden: ch.garden, stats: S.stats[ch.id] || {}, sessions: (S.sessions || []).filter(s => s.child === ch.id).slice(0, 200), log: (S.log || []).filter(l => l.child === ch.id).slice(0, 500), updated_at: new Date().toISOString() }; };

  /* OK.save wordt door de app aangeroepen bij elke wijziging; wij haken erop in */
  const origSave = () => { const f = OK.save; return f; };
  document.addEventListener("DOMContentLoaded", () => {
    const base = OK.save; OK.save = function (fromPull) { base(); if (!fromPull) schedulePush(); };
    let authedOnce = false;
    sb.auth.onAuthStateChange(async (ev, session) => { if (session && !childAuth) { await ensureFamily(); if (authedOnce && ev === "TOKEN_REFRESHED") return; authedOnce = true; await pull(); if (OK.onParentAuthed) OK.onParentAuthed(session.user.email); } });
    document.addEventListener("visibilitychange", () => { if (!document.hidden) pull(); });
    setInterval(pull, 60000);
    try { const saved = JSON.parse(localStorage.getItem(KID_KEY) || "null"); if (saved) refreshChild(saved); } catch (e) { }
  });
  /* één keer per sessie: onAuthStateChange vuurt bij het inloggen meerdere keren (INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED),
     dus zonder deze vergrendeling zou er twee keer een gezin aangemaakt worden */
  let familyPromise = null;
  function ensureFamily() {
    if (familyId) return Promise.resolve(familyId);
    if (!familyPromise) familyPromise = (async () => {
      await sb.rpc("accept_invites");
      const { data: m } = await sb.from("family_members").select("family_id").order("joined_at").limit(1);
      if (m && m.length) familyId = m[0].family_id; else { const { data } = await sb.rpc("create_family", { p_name: null }); familyId = data; }
      return familyId;
    })().finally(() => { familyPromise = null; });
    return familyPromise;
  }
  async function refreshChild(saved) {
    const r = await fetch(FN, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "refresh", refresh_token: saved.refresh_token }) });
    if (!r.ok) { localStorage.removeItem(KID_KEY); childAuth = null; OK.setSession && OK.setSession(null); return false; }
    const d = await r.json(); childAuth = Object.assign({}, saved, { access_token: d.access_token }); familyId = childAuth.family_id; await pull(); setTimeout(() => refreshChild(saved), (d.expires_in - 300) * 1000); return true;
  }

  /* ---------- de interface die auth.js verwacht ---------- */
  window.OK_BACKEND = {
    mode: "supabase",
    async isAdmin() { if (childAuth) return false; const { data } = await sb.rpc("is_admin"); return !!data; },
    async adminStats() { const { data, error } = await sb.rpc("admin_stats"); return error ? { error: error.message } : data; },
    /* alles van het eigen gezin wissen; RLS laat enkel het eigen gezin toe. Kinderen verwijderen neemt voortgang, codes, toestellen en aanvragen mee (cascade). */
    async wipeFamily() {
      if (childAuth || !familyId) return { error: "Enkel een ouder kan dit." };
      const e1 = (await sb.from("children").delete().eq("family_id", familyId)).error;
      const e2 = (await sb.from("family_docs").delete().eq("family_id", familyId)).error;
      const e3 = (await sb.from("family_invites").delete().eq("family_id", familyId)).error;
      if (e1 || e2 || e3) return { error: "Wissen op de server mislukte: " + (e1 || e2 || e3).message };
      lastPushed = {}; return { ok: true };
    },
    async signInParent(email) { const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } }); return error ? { error: error.message } : { ok: true, pending: true, note: "We hebben je een inloglink gemaild. Klik erop op dit toestel; daarna kom je hier terug." }; },
    async signOut() { if (childAuth) { try { await fetch(FN, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "logout", refresh_token: childAuth.refresh_token }) }); } catch (e) { } localStorage.removeItem(KID_KEY); childAuth = null; } else await sb.auth.signOut(); familyId = null; },
    async createChildCode(childId) { await sb.rpc("purge_codes"); const child = OK.childById(childId); const code = OK.makeChildCode(child); const expires = new Date(Date.now() + 15 * 60000).toISOString(); const { error } = await sb.from("child_codes").insert({ code, child_id: childId, family_id: familyId, expires_at: expires }); if (error) return this.createChildCode(childId); return { code, expires }; },
    async childLogin(code) { const r = await fetch(FN, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "login", code, label: OK.deviceLabel() }) }); const d = await r.json(); if (!r.ok) return { error: d.error || "Dat lukte niet." }; childAuth = d; familyId = d.family_id; try { localStorage.setItem(KID_KEY, JSON.stringify(d)); } catch (e) { } await pull(); return { child: d.child_id, device: d.device_id }; },
    async listDevices(childId) { const { data } = await sb.from("child_devices").select("*").eq("child_id", childId).is("revoked_at", null); return (data || []).map(d => ({ id: d.id, child: d.child_id, label: d.label, created: d.created_at, lastSeen: d.last_seen })); },
    async revokeDevice(id) { await sb.from("child_devices").update({ revoked_at: new Date().toISOString() }).eq("id", id); },
    async members() { const { data: m } = await sb.from("family_members").select("user_id, role, joined_at").eq("family_id", familyId); const { data: inv } = await sb.from("family_invites").select("email, created_at").eq("family_id", familyId).is("accepted_at", null); const me = (await sb.auth.getUser()).data.user; return { members: (m || []).map(x => ({ email: x.user_id === (me && me.id) ? me.email : "ouder " + x.user_id.slice(0, 6), role: x.role, joined: x.joined_at })), invites: (inv || []).map(i => ({ email: i.email, sent: i.created_at })) }; },
    async inviteParent(email) { const { error } = await sb.from("family_invites").insert({ family_id: familyId, email, invited_by: (await sb.auth.getUser()).data.user.id }); if (error) return { error: "Uitnodigen mislukte: " + error.message }; try { await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } }); } catch (e) { } return { ok: true, note: "Uitnodiging verstuurd. Zodra deze ouder inlogt met dat e-mailadres, hoort hij of zij bij het gezin." }; },
    async removeMember(email) { await sb.from("family_invites").delete().eq("family_id", familyId).eq("email", email); },
    deviceValid() { return true; },     // de server beslist bij het vernieuwen van het token
    touchDevice() { }
  };
})();
