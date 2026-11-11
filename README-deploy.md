# Kenik online zetten

Twee delen: de site (statische bestanden) en de backend (Supabase: inloggen, database, kindcodes).
Zonder backend werkt de site ook: alles blijft dan in de browser van het toestel.

## 1. De site (Cloudflare Pages, sinds 11 nov 2026)

1. Code staat op GitHub: `ELF-Consult/kenik`. Takken: `main` = productie (kenik.be), elke andere tak krijgt gratis een
   voorvertoning op `https://<tak>.kenik-52f.pages.dev`. Werk op een tak, voeg pas samen naar `main` na "zet maar live".
2. Cloudflare Pages, project `kenik` (account ELF Consult): build command leeg, output `/`. Elke push bouwt automatisch.
   Productie-adres zonder domein: https://kenik-52f.pages.dev. `_headers` zorgt dat een nieuwe versie meteen zichtbaar is.
3. Domein **kenik.be**: nameservers bij Combell staan op Cloudflare (`irma`/`trey.ns.cloudflare.com`); de DNS-zone zit dus
   bij Cloudflare. Pages > Custom domains: `kenik.be` en `www.kenik.be` (CNAME naar kenik-52f.pages.dev, geproxied).
   Redirect rule "www naar kenik.be" (301, query string behouden). De Combell-mailrecords (MX, SRV, SPF, DMARC,
   autoconfig/autodiscover/mail) staan in de zone op "DNS only" en moeten zo blijven.
4. Test: open https://kenik.be, kies "Ik ben ouder". Zonder config.js logt dit lokaal in (nagebootste backend).

Netlify (de eerste hosting) is verwijderd op 11 nov 2026.

## 2. De backend (Supabase)

Project: **kenik** in organisatie ELF Consult, regio Frankfurt, ref `ynkcucbfojnzqwgxisgo`.
Al gedaan (8 nov 2026): project aangemaakt, schema + rol `child` uitgevoerd als migratie `kenik_schema`,
edge function `child-login` gedeployed (verify_jwt uit), `config.js` met URL en anon key staat in de repo.

Nog handmatig in het dashboard (supabase.com/dashboard/project/ynkcucbfojnzqwgxisgo):
1. **Edge Functions > child-login > Secrets** (of Project Settings > Edge Functions): voeg `JWT_SECRET` toe met de
   waarde van **Project Settings > API > JWT Settings > JWT Secret**. Zonder dit antwoordt de functie "Server niet klaar".
2. **Authentication > Sign In / Providers > Email**: aan, "Confirm email" mag uit, wachtwoord niet nodig (we gebruiken enkel magic links).
3. **Authentication > URL Configuration**: Site URL = `https://kenik.be`, Redirect URLs = `https://kenik.be/**`, `https://www.kenik.be/**`,
   `https://kenik-52f.pages.dev/**` en `https://*.kenik-52f.pages.dev/**` (voorvertoningen per tak).
4. Optioneel: **Authentication > Emails**: de magic-link-mail in het Nederlands zetten (onderwerp "Inloggen bij Kenik").

Mail: de ingebouwde mailer van Supabase is beperkt tot 2 mails per uur en enkel bedoeld om te testen. Daarom Resend
(gratis tot 3000 mails/maand): domein kenik.be bij Resend (DKIM TXT `resend._domainkey`, CNAME `rsend` en `send`, allemaal
"DNS only" in Cloudflare), API key met "Sending access", en in Supabase > Authentication > SMTP Settings: host
`smtp.resend.com`, poort `465`, gebruiker `resend`, wachtwoord = de API key, afzender `inloggen@kenik.be`, naam `Kenik`.

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

## 7. Foto met je gsm

Wie aan de laptop zit, klikt in de wizard (stap "foto") op "Neem de foto met je gsm". De laptop maakt via
`create_photo_session(prompt)` een token (tabel `photo_sessions`, 15 minuten geldig) en toont een QR-code naar
`https://kenik.be/foto.html#TOKEN`. De gsm fotografeert (camera-opname, verkleind tot JPEG) en stuurt de foto's met het token
naar de edge function `ai`; die zet het resultaat in `photo_sessions.result`. De laptop vraagt elke 2,5 s de status op en
vult de wizard in zodra de status `done` is. Een token werkt voor één lijst.
