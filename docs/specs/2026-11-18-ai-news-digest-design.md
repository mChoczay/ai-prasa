# Poranna prasa AI – projekt pipeline'u w n8n (v1)

Data: 2026-11-18 · Status: szkic do akceptacji
Zastępuje na razie: `2026-11-18-ai-news-tiktok-design.md` (wideo + TikTok – odłożone na później).

## 1. Po co to jest

Newsy ze świata AI (modele, giełda, inwestycje, rankingi, przecieki) pojawiają się szybciej, niż da się je śledzić. Właściciel – developer AI – chce rano, do kawy, przez ok. **15 minut** przeczytać swoją „gazetę”: co się wydarzyło, kiedy był zajęty pracą, i jak to się składa w szerszy obraz, żeby „świat mu nie odjechał”.

Ton: **osobisty asystent, który opowiada, co się działo** – jak dziennik / poranna prasa. Lekkostrawnie, ale na poziomie developera (konkrety: ceny API, okna kontekstu, licencje, benchmarki, co to zmienia w praktyce).

Forma: statyczny dashboard-gazeta na GitHub Pages + krótki poranny mail z linkiem. Monetyzacja (newsletter ze sponsorem, wideo/TikTok) poza v1.

## 2. Cele

- **Jedno wydanie dziennie**, rano. Gotowe przed ok. 06:30 (Europe/Warsaw; godzina konfigurowalna).
- **5–7 pełnych tematów** dziennie (nie jednozdaniowych), z ostatnich ~24 h; czas czytania całego wydania ok. 15 min (ok. 2500–3500 słów).
- Stałe rubryki: rynek (ok. 20 spółek), rankingi (LMArena, Artificial Analysis, Hugging Face), plotki i przecieki.
- **Big picture:** wydanie niedzielne zawiera „Tydzień w AI”, wydanie z 1. dnia miesiąca – „Miesiąc w AI”.
- Każda informacja ma źródło; jasno widać, co jest faktem, a co plotką/opinią.
- Archiwum wydań, czytelne na telefonie.
- Koszt Claude'a ok. **$8–10/mies.**, twardy limit w pipelinie **$15/mies.** Reszta: $0 ponad obecny plan n8n Cloud.
- **Nigdy nie wejść „na minus”** – po wyczerpaniu budżetu lub kredytów pipeline staje i powiadamia mailem.

## 3. Poza zakresem (non-goals)

- Kilka wydań dziennie (świadomie: jedno poranne).
- Wideo, audio, TikTok (odłożone).
- Telegram i WhatsApp (WhatsApp może wrócić później – CallMeBot albo oficjalne API Meta).
- Logowanie / prywatny dostęp (strona publiczna – wymóg darmowego GitHub Pages).
- Interaktywne „dopytywanie” Claude'a z poziomu dashboardu, wyszukiwarka, komentarze, statystyki.
- Płatne źródła: API X/Twittera, paywalle (Bloomberg, The Information) – korzystamy z tego, co z nich cytują inni.
- Porady inwestycyjne i prognozy kierunku kursów. Rynek to orientacja w branży, nie rekomendacje.

## 4. Anty-cele (porażka, nawet jeśli technicznie działa)

- Plotka podana jako fakt; liczba (kurs, wycena, wynik w rankingu) bez źródła albo przekręcona.
- Zmyślona przyczyna ruchu na giełdzie/w rankingu podana jako pewna.
- Suchy agregator linków albo „korporacyjny raport” zamiast przyjemnej lektury do kawy.
- Wydanie, którego nie da się przeczytać w ~15 min (za długie) albo które nic nie wyjaśnia (za płytkie).
- Rachunek większy, niż właściciel się spodziewał – auto-doładowanie, pętla ponowień, niekontrolowane zużycie.
- Ten sam temat kilka dni z rzędu bez nowej informacji.
- Pipeline cicho przestaje działać i właściciel się o tym nie dowiaduje.

## 5. Ograniczenia i fakty

- **n8n Cloud**, instancja właściciela (adres poza repozytorium, bo repo jest publiczne), obecnie pusta. Plan (limit wykonań) nieznany – v1 to ok. 30–60 wykonań/mies.
- Istniejący credential: Anthropic (klucz API). Kredyty bramki n8n obejmują m.in. Brave Search i Firecrawl (pula nieznana – patrz sekcja 11).
- **Claude a subskrypcja:** n8n używa klucza API z Console (platform.claude.com), nie limitu subskrypcji claude.ai. Kredyty API są przedpłacone: po wyczerpaniu API odrzuca zapytania („credit balance is too low”); na minus wejść się nie da, chyba że włączone jest auto-reload. Plany Max/Ultra/Team zawierają miesięczne kredyty API do odebrania w claude.ai → Billing.
- **GitHub Pages** na darmowym koncie wymaga publicznego repozytorium → strona i dane publiczne (akceptowalne: to podsumowania publicznych newsów).
- **Mail:** Gmail właściciela, podłączony w n8n przez OAuth.
- **Źródła rankingów i kursów:** przed budową sprawdzić warunki korzystania. Artificial Analysis ma API (darmowy klucz); Hugging Face ma publiczne API (trending modeli); LMArena – oficjalne dane/eksport, jeśli dostępne, inaczej scraping strony. Kursy: darmowe źródło dziennych notowań (np. Stooq, Alpha Vantage free tier) – wybór budującego.

## 6. Podejścia rozważane

**Forma dostarczenia**

| Opcja | Za | Przeciw | Decyzja |
|---|---|---|---|
| Dashboard serwowany przez n8n (webhook) | dynamiczny | każde wejście = wykonanie n8n | odrzucone |
| **Statyczna „gazeta” na GitHub Pages + mail** | $0, czytanie nie zużywa n8n, archiwum za darmo | strona publiczna | **wybrane** |
| Sam newsletter mailowy | $0 | brak archiwum i paneli | częściowo – mail to zajawka |
| Telegram / WhatsApp | push | Telegram niechciany; WhatsApp później | odrzucone w v1 |

**Model Claude'a**

| Opcja | Szac. koszt/mies. | Decyzja |
|---|---|---|
| Opus 5.5 do wszystkiego | ~$20+ | odrzucone – „armata na muchę” |
| **Haiku 5.5 (odsiew) + Sonnet 5.5 (wybór, weryfikacja, pisanie)** | ~$8–10 | **wybrane** |
| Sam Haiku 5.5 | ~$1 | odrzucone – słabszy w ocenie wiarygodności i w stylu |

## 7. Wydanie – struktura i ton

Narrator: osobisty asystent właściciela. Pisze w 2. osobie, ciepło i rzeczowo, jak w dobrym felietonie prasowym; bez wykrzykników i clickbaitu. Krótkie wyjaśnienia tam, gdzie developer może nie znać kontekstu (np. kim jest mniejszy gracz), bez tłumaczenia podstaw.

**Wydanie dzienne:**
1. **Powitanie** (3–4 zdania) – „Dzień dobry. Kiedy pracowałeś, …” – najważniejsza myśl dnia w pigułce.
2. **Czołówka** – najważniejszy temat, ok. 500–700 słów: co się stało, kontekst, co to zmienia dla developera.
3. **4–6 tematów** po ok. 250–400 słów; każdy: kategoria, status (potwierdzone / plotka / opinia), tytuł, lead, tekst, „co to znaczy dla Ciebie”, źródła oraz **„Może dotyczyć”** – odznaki spółek z koszyka i modeli z rankingów, na które news może wpłynąć (np. `NVDA`, `Model X · LMArena`). Odznaka nie przewiduje kierunku (wzrost/spadek) – patrz 7a.
4. **Rynek** – tabela ok. 20 spółek (kurs zamknięcia, zmiana d/d, 7 dni, 30 dni) + akapit „co ruszało rynkiem” powiązany z newsami (inwestycje, rundy finansowania, wyceny laboratoriów). **Duże ruchy** (domyślnie |zmiana d/d| ≥ 3% albo |7 dni| ≥ 8%) dostają linijkę **„Dlaczego?”** według reguły z 7a. Stopka „To nie jest porada inwestycyjna”.
5. **Rankingi** – ruchy w LMArena i Artificial Analysis (nowe wejścia, awanse/spadki o ≥2 pozycje w top 20) + trending na Hugging Face + 2–3 zdania komentarza. Każdy taki ruch dostaje linijkę **„Dlaczego?”** (np. nowa wersja modelu, nowy konkurent wyżej, zmiana metodologii rankingu).
6. **Plotki i przecieki** – krótka rubryka, zawsze oznaczona; może być pusta.
7. **Poznaj** – codziennie 1 spółka i 1 model (ok. 80–120 słów każde): kto to jest, co robi/czym jest, dlaczego ma znaczenie, ciekawostka. Najpierw te, które pojawiły się w dzisiejszym wydaniu, potem rotacja po koszyku i rankingach.
8. **Na koniec** – 1–2 zdania: na co warto zerkać w najbliższych dniach.

**Wizytówki (słownik).** Każda spółka z koszyka i każdy model/organizacja z rankingów ma wizytówkę (`entity_profiles`): 2–4 zdania „kto, co, dlaczego”, właściciel/twórca, kluczowe produkty, data aktualizacji. Na stronie nazwy spółek i modeli w tekście, tabelach i odznakach są klikalne i pokazują wizytówkę. Wizytówka powstaje raz, gdy byt pojawia się po raz pierwszy, i jest odświeżana co ~90 dni albo gdy news opisuje istotną zmianę (przejęcie, zmiana CEO, nowa generacja modelu).

### 7a. Reguły dla „Dlaczego?” i „Może dotyczyć” (ocena pomysłów właściciela)

- **„Dlaczego?” przy ruchach** – wartościowe i tanie (dane już są, Sonnet tylko łączy je z newsami). Ryzyko: fałszywa przyczynowość – kursy często ruszają się bez jednego powodu. Reguła: przyczyna podana jako fakt **tylko gdy źródło wprost łączy ruch z wydarzeniem** (np. „akcje spadły po publikacji wyników”). W przeciwnym razie: „brak jednoznacznej przyczyny” + ewentualny kontekst oznaczony jako *hipoteza*. Ruchy całego rynku (np. cały Nasdaq −2%) opisywane jako ruch rynku, nie spółki.
- **„Może dotyczyć” zamiast prognozy kierunku** – przewidywanie „wzrośnie/spadnie” przez LLM jest mało wiarygodne i przy akcjach zbliża się do porady inwestycyjnej. Dlatego odznaka wskazuje tylko *kogo* news dotyczy. W zamian **„Sprawdzamy”**: gdy w ciągu 1–5 dni spółka lub model z odznaką zrobi duży ruch, wydanie przypomina, z jakim newsem był powiązany. To daje właścicielowi wyczucie związków bez udawanej prognozy.
- **„Poznaj” + wizytówki** – najwyższa wartość dla właściciela (większości spółek i modeli nie zna), koszt jednorazowy (~$0,01 za wizytówkę). Ryzyko: nieaktualne fakty → data aktualizacji na wizytówce i odświeżanie jak wyżej.

**Niedziela – „Tydzień w AI”** (dodatkowo, ok. 800–1200 słów): kto prowadzi w wyścigu i w czym, kto kogo finansuje, trendy w rankingach i na giełdzie w tygodniu, 3 rzeczy, które warto zapamiętać.
**1. dzień miesiąca – „Miesiąc w AI”** (ok. 1200–1500 słów): większe trendy, mapa graczy, co się zmieniło w porównaniu z poprzednim miesiącem.
Podsumowania tygodniowe i miesięczne powstają z już zapisanych danych (`topics_history`, migawki rankingów i kursów), bez nowego researchu – są tanie.

**Koszyk giełdowy (ok. 20, edytowalny w tabeli):** NVIDIA, Microsoft, Alphabet, Meta, Amazon, Apple, TSMC, AMD, Broadcom, Oracle, Palantir, CoreWeave, Arm, ASML, Super Micro, Tesla, Intel, Samsung, SK hynix, Micron (ostateczna lista do korekty przez właściciela).

## 8. Przepływ (workflow „Poranna prasa AI”)

Harmonogram: codziennie 05:30 (Europe/Warsaw), mail po zakończeniu (cel: przed 06:30).

0. **Bramka bezpieczeństwa** – `pipeline_state`: jeśli `paused = true` albo wydatki w miesiącu ≥ budżet → koniec bez płatnych wywołań. Wstrzymanie z powodu budżetu zeruje się 1. dnia miesiąca; wstrzymanie z powodu braku kredytów wymaga ręcznego odblokowania.
1. **Dane liczbowe (bez LLM)** – dzienne notowania koszyka → `market_snapshots`; migawki LMArena, Artificial Analysis, HF trending → `leaderboard_snapshots`; wyliczenie zmian względem poprzednich dni.
2. **Zbieranie kandydatów** – RSS oficjalnych blogów (OpenAI, Anthropic, Google/DeepMind, Meta AI, Mistral, xAI, NVIDIA, Hugging Face, Microsoft), sekcje AI/tech w mediach (Reuters, The Verge, TechCrunch, Ars Technica), Hacker News (front page), Reddit RSS (r/LocalLLaMA, r/singularity, r/MachineLearning) – głównie dla przecieków; Brave Search maks. 2 zapytania. Cel: 80–200 nagłówków.
3. **Odsiew (Haiku 5.5)** – duplikaty, śmieci, kategoria (`modele` / `gielda` / `inwestycje` / `rankingi` / `narzedzia` / `regulacje` / `przecieki` / `inne`), ocena ważności. Wynik: ~15 kandydatów.
4. **Odfiltrowanie powtórek** – porównanie z `topics_history` (7 dni); powtórka tylko jako „aktualizacja” z nową informacją.
5. **Wybór 5–7 tematów + przecieków (Sonnet 5.5)** – ważność dla developera, świeżość, różnorodność kategorii; wskazanie czołówki.
6. **Weryfikacja** – pobranie treści 2–3 źródeł na temat (HTTP Request + ekstrakcja tekstu; Firecrawl tylko jako zapas). Fakty z przypisanym źródłem. Statusy:
   - `potwierdzone` – źródło pierwotne albo ≥2 niezależne wiarygodne media;
   - `plotka` – przeciek; wchodzi, gdy podają go ≥2 wiarygodne źródła albo osoba z listy `trusted_leakers`;
   - `opinia` – komentarz/analiza.
   Liczby tylko ze źródła albo z danych z kroku 1.
7. **Pisanie wydania (Sonnet 5.5)** – według sekcji 7 i 7a, structured output JSON (sekcja 9). Wejście obejmuje duże ruchy z kroku 1 i odznaki „Może dotyczyć” z ostatnich 5 dni (do „Dlaczego?” i „Sprawdzamy”). W niedzielę / 1. dnia miesiąca dodatkowe wywołanie na „Tydzień w AI” / „Miesiąc w AI”.
7b. **Wizytówki (Haiku 5.5 lub Sonnet 5.5)** – dla bytów bez wizytówki albo z wizytówką starszą niż 90 dni: wygenerowanie/odświeżenie na podstawie oficjalnej strony/Wikipedii i dzisiejszych źródeł → `entity_profiles` → `data/profiles.json`. Limit: maks. 10 nowych wizytówek dziennie (pierwszy tydzień zapełnia słownik stopniowo).
8. **Publikacja** – węzeł GitHub zapisuje `data/YYYY-MM-DD.json` i aktualizuje `data/index.json`; GitHub Pages przebudowuje stronę.
9. **Mail (Gmail)** – temat: „Poranna prasa AI: <tytuł czołówki>”; treść: powitanie asystenta, lista tytułów, przycisk „Czytaj wydanie”.
10. **Księgowanie kosztów** – po każdym wywołaniu Claude'a `usage` → $ wg cennika → `cost_ledger`; to samo dla Brave/Firecrawl (licznik wywołań).
11. **Obsługa błędów** – Error Workflow n8n → mail „Poranna prasa AI: błąd w kroku X”. Brak kredytów / billing (HTTP 400 „credit balance is too low” albo 402 `billing_error`) → bez ponowień, `paused = true`, mail z instrukcją. Błędy przejściowe (429, 5xx) → maks. 2 ponowienia. Awaria jednego źródła danych (np. rankingu) nie zatrzymuje wydania – rubryka dostaje dopisek „dane niedostępne”. Spokojny dzień → mniej tematów, bez dopychania na siłę.

## 9. Dane

**Tabele n8n (Data Tables):**
- `pipeline_state` – `paused`, `paused_reason` (`budget` / `credits` / `auth` / `manual`; `auth` = wygasły lub nieważny klucz API – właściciel ustawia kluczom 7-dniowy czas życia), `monthly_budget_usd` (15), `monthly_search_limit`, `updated_at`.
- `cost_ledger` – `date`, `run_id`, `service` (`claude` / `brave` / `firecrawl`), `model`, `input_tokens`, `output_tokens`, `calls`, `cost_usd`.
- `topics_history` – `date`, `title`, `summary`, `category`, `status`, `source_urls`.
- `market_watchlist` – `ticker`, `name`, `active` (edytowalny koszyk).
- `market_snapshots` – `date`, `ticker`, `close`, `change_1d`, `change_7d`, `change_30d`.
- `leaderboard_snapshots` – `date`, `board` (`lmarena` / `aa` / `hf_trending`), `rank`, `model`, `org`, `score`.
- `trusted_leakers` – `name`, `platform`, `note`, `active` (start: lista od budującego; edytuje właściciel).
- `entity_profiles` – `id`, `type` (`company` / `model` / `org`), `name`, `aliases`, `ticker`, `summary`, `owner`, `key_products`, `why_it_matters`, `updated_at`, `source_urls`.
- `impact_tags` – `date`, `story_title`, `entity_id` (do „Sprawdzamy”).

**Plik wydania `data/YYYY-MM-DD.json`:**
```json
{
  "date": "2026-11-19",
  "edition": "daily",
  "generated_at": "2026-11-19T05:52:00+01:00",
  "greeting": "…",
  "lead_story": { "title": "…", "category": "modele", "status": "potwierdzone", "lede": "…", "body": "…", "for_you": "…", "sources": [{"name": "…", "url": "https://…", "primary": true}] },
  "stories": [ { "…": "jak lead_story" } ],
  "market": { "commentary": "…", "rows": [{"ticker": "NVDA", "name": "NVIDIA", "close": 0, "change_1d": 0, "change_7d": 0, "change_30d": 0}] },
  "rankings": { "commentary": "…", "lmarena": [], "aa": [], "hf_trending": [] },
  "rumors": [ { "title": "…", "body": "…", "sources": [] } ],
  "big_moves": [ { "entity_id": "nvda", "board": "market", "change": "-4.1%", "why": "…", "why_type": "fakt | hipoteza | brak", "sources": [] } ],
  "follow_ups": [ { "entity_id": "…", "move": "…", "related_story": "…", "story_date": "2026-11-17" } ],
  "spotlight": { "company_id": "…", "model_id": "…" },
  "closing": "…",
  "weekly": null,
  "monthly": null
}
```
Każda historia ma też `may_affect: ["nvda", "model-x"]` (identyfikatory z `entity_profiles`).
`data/index.json` – lista wydań (data, typ, tytuł czołówki). `data/profiles.json` – wszystkie wizytówki (słownik dla strony).

## 10. Dashboard – „gazeta”

Statyczna strona (HTML + CSS + mały JS, bez frameworka i bez kroku budowania), zrobiona raz; n8n dopisuje tylko pliki JSON.

- Charakter **porannej gazety**: winieta z tytułem i datą, typografia szeryfowa dla tekstu, wyraźna czołówka, kolumny na szerokim ekranie, jedna kolumna na telefonie.
- Odznaki kategorii i statusu (potwierdzone / plotka / opinia), szacowany czas czytania wydania.
- Rubryki „Rynek” (tabela + zielone/czerwone zmiany) i „Rankingi” (awanse/spadki strzałkami).
- Wydania tygodniowe/miesięczne jako wyróżniony dodatek.
- Archiwum: lista wydań, filtr po kategorii. Tryb jasny i ciemny.
- Makieta do akceptacji przez właściciela przed budową.

## 11. Zabezpieczenie kosztów

1. **Console Anthropic (właściciel):** wyłączyć auto-reload; osobny workspace i klucz dla n8n; limit wydatków workspace’u (np. $20).
2. **Pipeline:** bramka (krok 0) + księgowanie (krok 10); budżet $15/mies. w `pipeline_state`.
3. **Brak kredytów:** krok 11 – zatrzymanie, flaga, jeden mail, zero pętli.
4. **Kredyty bramki n8n (Brave, Firecrawl):** pula i zachowanie po wyczerpaniu nieznane – **pierwszy krok budowy to sprawdzenie w panelu n8n**. Do tego czasu: artykuły pobierane darmowym HTTP Request, Firecrawl tylko jako zapas, Brave maks. 2 zapytania dziennie, osobny licznik i limit. Jeśli po wyczerpaniu puli naliczane są dopłaty, limit zatrzymuje te węzły tak jak budżet Claude'a.

## 12. Koszty (szacunek)

| Pozycja | Koszt |
|---|---|
| Claude: Haiku 5.5 (odsiew) + Sonnet 5.5 (weryfikacja, ~3000 słów wydania) | ~$0,25–0,30/dzień → ~$8–10/mies. z dodatkami tygodniowymi i miesięcznymi |
| Notowania, rankingi, HF, RSS, Reddit | $0 (darmowe API/strony) |
| Brave Search, Firecrawl | kredyty n8n |
| GitHub Pages, Gmail | $0 |
| n8n Cloud | obecny plan właściciela |

## 13. Decyzje podjęte

Właściciel:
- Wideo i TikTok odłożone; jedno poranne wydanie dziennie, ok. 15 min czytania.
- 5–7 pełnych tematów; ton osobistego asystenta / porannej prasy; poziom developera, ale lekkostrawnie.
- Big picture: wydanie tygodniowe + miesięczne.
- Rynek: szerszy koszyk ok. 20 spółek + inwestycje i wyceny z newsów.
- Rankingi: LMArena, Artificial Analysis, Hugging Face (własne migawki).
- Przecieki z darmowych źródeł (Reddit, media) + edytowalna lista leakerów; „nie big deal”.
- Dashboard na GitHub Pages + mail; bez Telegrama; n8n Cloud.
- Wyjaśnianie dużych ruchów na giełdzie i w rankingach; oznaczanie newsów, które mogą wpłynąć na spółki/modele; rubryka „Poznaj” i wizytówki spółek/modeli.

Claude (do korekty przez właściciela):
- Haiku 5.5 + Sonnet 5.5; budżet $15/mies.; uruchomienie 05:30.
- Struktura wydania z sekcji 7; dane liczbowe zbierane bez LLM.
- Statusy wiarygodności i reguła przecieków; darmowe pobieranie zamiast Firecrawla.
- Statyczny szablon + pliki JSON dopisywane przez n8n.
- „Może dotyczyć” bez prognozy kierunku + „Sprawdzamy” po fakcie; reguła fakt/hipoteza/brak dla „Dlaczego?”; progi dużych ruchów (3% d/d, 8% w 7 dni, ≥2 pozycje w rankingu).

## 14. Zostawione budującemu

- Dokładna lista RSS, subredditów, zapytań; startowa lista `trusted_leakers`.
- Źródło notowań i sposób pobrania LMArena (po sprawdzeniu warunków korzystania).
- Prompty, schematy structured output, poziom `effort`.
- Wygląd strony i maila w ramach sekcji 10 (makieta do akceptacji).
- Nazwa gazety i repozytorium (propozycje do wyboru przez właściciela).
- Podział na pod-workflowy, nazwy węzłów.

## 15. Kroki po stronie właściciela

1. Console Anthropic: wyłączyć auto-reload, utworzyć workspace + klucz dla n8n, ustawić limit wydatków.
2. Konto GitHub (jeśli nie ma) podłączone w n8n.
3. Gmail podłączony w n8n (OAuth).
4. Przejrzeć koszyk giełdowy i startową listę leakerów.
