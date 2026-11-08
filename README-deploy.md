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

Project: **kenik** in organisatie ELF Consult, regio Frankfurt, ref `ynkcucbfojnzqwgxisgo`.
Al gedaan (8 nov 2026): project aangemaakt, schema + rol `child` uitgevoerd als migratie `kenik_schema`,
edge function `child-login` gedeployed (verify_jwt uit), `config.js` met URL en anon key staat in de repo.

Nog handmatig in het dashboard (supabase.com/dashboard/project/ynkcucbfojnzqwgxisgo):
1. **Edge Functions > child-login > Secrets** (of Project Settings > Edge Functions): voeg `JWT_SECRET` toe met de
   waarde van **Project Settings > API > JWT Settings > JWT Secret**. Zonder dit antwoordt de functie "Server niet klaar".
2. **Authentication > Sign In / Providers > Email**: aan, "Confirm email" mag uit, wachtwoord niet nodig (we gebruiken enkel magic links).
3. **Authentication > URL Configuration**: Site URL = `https://kenik.be` (voorlopig het Netlify-adres), Redirect URLs = `https://kenik.be/**` en het Netlify-adres met `/**`.
4. Optioneel: **Authentication > Emails**: de magic-link-mail in het Nederlands zetten (onderwerp "Inloggen bij Kenik").

Later nodig: een eigen SMTP (bv. Resend, gratis tot 3000 mails/maand) want de ingebouwde mailer van Supabase is beperkt tot
een paar mails per uur en is enkel bedoeld om te testen. Authentication > SMTP Settings.

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

## 5. Beheerpagina

Het tabblad **Beheer** in het ouderpaneel toont geaggregeerde cijfers (gezinnen, kinderen, beurten per dag, vakken, ...). Toegang wordt in de database
geregeld: alleen gebruikers in de tabel `admins` krijgen iets terug van `admin_stats()`; alle anderen zien "Geen toegang".
Beheerder toevoegen (SQL-editor):
```sql
insert into admins(user_id) select id from auth.users where email = 'iemand@voorbeeld.be';
```
Het tabblad verschijnt enkel voor beheerders.

## 6. Foto's lezen en teksten schrijven (Claude-API)

Edge function `ai` (gedeployed, verify_jwt uit; controleert zelf de oudersessie). Per gezin maximaal `AI_LIMIT` aanvragen per
maand (standaard 40), bijgehouden in `ai_usage`. Secrets bij de edge functions:
- `ANTHROPIC_API_KEY`: sleutel van console.anthropic.com (verplicht; zonder sleutel meldt de app "nog niet ingesteld")
- `AI_MODEL` (optioneel, standaard `claude-sonnet-5-5`), `AI_LIMIT` (optioneel, standaard 40)
Kosten: ongeveer 1 tot 3 eurocent per handboekfoto, minder dan een cent per leestekst.
