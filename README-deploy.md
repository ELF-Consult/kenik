# Kenik online zetten

Twee delen: de site (statische bestanden) en de backend (Supabase: inloggen, database, kindcodes).
Zonder backend werkt de site ook: alles blijft dan in de browser van het toestel.

## 1. De site

1. Zet deze map op GitHub (repository "kenik").
2. Netlify of Cloudflare Pages: "nieuw project uit Git", map = deze map, geen build-stap, publish directory = `/`.
3. Koppel **kenik.be** in Netlify: Site configuration > Domain management > Add a domain > kenik.be. Netlify toont dan welke DNS-records je bij je registrar zet:
   - `kenik.be` (apex): A-record naar het IP dat Netlify geeft (of ALIAS/ANAME als je registrar dat kan);
   - `www.kenik.be`: CNAME naar `<jouw-site>.netlify.app`.
   Alternatief: zet de nameservers van kenik.be op die van Netlify DNS, dan regelt Netlify alles zelf. HTTPS (Let's Encrypt) komt automatisch zodra de DNS klopt, reken op 10 minuten tot enkele uren.
   Gebruik daarna overal `https://kenik.be` als Site URL (ook in Supabase, zie 2.4).
4. Test: open de site, kies "Ik ben ouder". Zonder config.js logt dit lokaal in (nagebootste backend).

## 2. De backend (Supabase)

1. Maak een gratis project op supabase.com, regio **Frankfurt** (eu-central-1). Noteer: Project URL, anon key, JWT secret (Settings > API).
2. SQL-editor: plak en voer `supabase/schema.sql` uit.
3. Extra SQL, eenmalig (de rol voor kindtokens):
   ```sql
   create role child nologin;
   grant child to authenticator;
   grant usage on schema public to child;
   grant select on all tables in schema public to child;
   grant insert on reward_requests to child;
   grant insert, update on child_progress to child;
   grant execute on function complete_task(uuid, text, text) to child;
   ```
4. Authentication > Providers: alleen **Email** aan, met "Magic link" (geen wachtwoord). Authentication > URL configuration: Site URL = je domein; Redirect URLs = je domein.
5. Edge function: installeer de Supabase CLI, dan
   ```
   supabase login
   supabase link --project-ref <ref>
   supabase secrets set JWT_SECRET=<jwt secret uit Settings > API>
   supabase functions deploy child-login --no-verify-jwt
   ```
6. Maak in de hoofdmap `config.js`:
   ```js
   window.KENIK_CONFIG = { supabaseUrl: "https://<ref>.supabase.co", supabaseAnonKey: "<anon key>" };
   ```
   Zet het bestand mee op de site. De anon key mag publiek zijn; de toegangsregels (RLS) in de database bewaken de data.

## 3. Controleren (in deze volgorde)

1. Ouder: e-mail ingeven, link in de mail klikken, vraag "gezinstoestel?" verschijnt. Kind toevoegen, lijst maken. Controleer in Supabase (Table editor) dat `children` en `family_docs` gevuld zijn.
2. Tweede browser (of privévenster): "Ik ben een kind", code van het ouderpaneel typen. Oefenen. Controleer dat `child_progress` bijgewerkt wordt en dat het kind in dat venster geen ouderpaneel kan openen.
3. Ouderpaneel > Kinderen > Ander toestel > Afmelden: het kindvenster valt bij de volgende vernieuwing terug op het startscherm.
4. Gezin > Uitnodigen met een tweede e-mailadres; met dat adres inloggen in een privévenster: zelfde kinderen zichtbaar.

Dit is geschreven zonder toegang tot een echt project. Verwacht kleine bijsturingen bij de eerste test; de plekken om te kijken zijn
`js/backend-supabase.js` (client), `supabase/functions/child-login/index.ts` (kindtokens) en de RLS-policies in `supabase/schema.sql`.

## 4. Nog te doen voor een publieke versie

- Privacyverklaring en gebruiksvoorwaarden (korte, leesbare tekst), link in de voettekst.
- Export en verwijdering van alle gezinsdata op verzoek (knop in Instellingen; verwijderen van het gezin wist via `on delete cascade` alles).
- De Claude-functies (foto's lezen, leesteksten) via een eigen serverfunctie met een Anthropic API-sleutel en een limiet per gezin.
- Installeerbare webapp (manifest + service worker) zodat ze op het beginscherm van een tablet kan.
