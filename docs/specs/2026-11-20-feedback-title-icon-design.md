# Poranna prasa AI – tytuł karty, ikona, oceny i uwagi do artykułów

Data: 2026-11-20. Status: do akceptacji właściciela (po przeglądzie budującego).
Makiety: pokazane w rozmowie 2026-11-20 (tytuł karty, ikona A/B/C, koniec artykułu z oceną i polem na uwagi).

## 1. Po co

Strona z nowym wyglądem działa na żywo od 2026-11-20, a codzienny bieg czeka na włączenie. Właściciel chce przed włączeniem domknąć trzy rzeczy:

- **Tytuł karty** pokazuje dziś tytuł czołówki, ucięty na telefonie („Genie 4: Google otwiera interaktywne świ…”). Nie widać, że to gazeta ani z którego dnia.
- **Ikony** nie ma wcale. Karta i zakładka mają pusty kwadrat.
- **Oceny i uwagi.** „To moja prasa, a nie chce mi się wracać z każdą pierdołą”. Właściciel chce przy czytaniu ocenić artykuł subiektywnie i dopisać uwagę. Gazeta ma się do tego dostosować sama, bez rozmowy z Claude'em za każdym razem. Uwagi o wyglądzie i błędach mają czekać na liście, którą Claude przerabia na poprawki przy następnej sesji („prasa i lista”). Ocena ma być mało widoczna, jako dodatek do czytania, a nie jego część.

## 2. Cele, nie-cele, anty-cele

**Cele**
- Tytuł karty: pierwsza strona „Prasa AI · czw 19 lis”, czytnik „2/7 · <tytuł tematu>”, archiwum „Archiwum · Prasa AI”.
- Ikona A (inicjał „P” w kolorach strony): jako SVG dla przeglądarek i PNG 180×180 dla ekranu głównego iPhone'a.
- Pod każdym tematem w czytniku (czołówka i tematy, strony 1…n): trzy przyciski „więcej takich / w sam raz / mniej takich” i link „dodaj uwagę”, który rozwija pole tekstowe.
- Oceny i uwagi trafiają do tabeli w n8n. Etap wyboru tematów i etap pisania dostają ich skrót w prompcie.
- Uwagi niezwiązane z treścią (wygląd, błędy, pomysły na funkcje) zostają w tej samej tabeli jako lista dla Claude'a.

**Nie-cele**
- Oceny na pierwszej stronie, w plotkach, rankingach, rynku, „Poznaj” i dodatkach tygodniowych/miesięcznych.
- Statystyki ocen na stronie i wykresy.
- Automatyczne zmiany kodu lub wyglądu na podstawie uwag. To robi Claude w sesji, gdy właściciel o to poprosi.
- Konta, logowanie, wielu czytelników.

**Anty-cele (porażka, nawet jeśli „działa”)**
- Adres instancji n8n, adres e-mail właściciela albo klucz w plikach repozytorium (repo i strona są publiczne).
- Przyciski ocen widoczne dla obcych odwiedzających albo możliwość zapisania oceny bez klucza.
- Ocena, która rzuca się w oczy: kolorowe przyciski, gwiazdki, wyskakujące okna, prośby o ocenę.
- Uwaga, która znika bez śladu przy błędzie sieci.
- Wyraźny wzrost kosztu Claude'a (budżet $15/mies., bez doładowań) albo pętla, w której redakcja pisze o samych ocenach.
- Biblioteki JS, krok budowania, śledzenie czytelnika.

## 3. Ograniczenia

- Strona statyczna na GitHub Pages (`site/`, moduły ES bez zależności). CSP w `site/index.html`: dziś `connect-src 'self'`.
- Repozytorium publiczne (`mChoczay/ai-prasa`). Sekrety tylko w n8n (tabele, poświadczenia), nigdy w plikach.
- n8n Cloud: workflowy w `n8n/workflows/*.workflow.js`, kod węzłów z `n8n/lib/*.js` przez `scripts/inline-lib.mjs`. W sandboksie Code brak `URL`, `URLSearchParams`, `structuredClone`. Limit 180 s na wykonanie. Każde wywołanie webhooka to jedno wykonanie w limicie planu.
- Wybór tematów: `PPAI · select` (Sonnet, prompt `prompts/select.md`, treść użytkownika z `selectPrompt()` w `n8n/lib/select.js`). Pisanie: `PPAI · write` (Sonnet, `prompts/write.md`, `storiesPrompt()` w `n8n/lib/write.js`). Ładunek sztafety buduje `PPAI · daily` („Build relay payload”).
- Ustawienia w tabeli `pipeline_state` (id `g73ONaCkopLd0kpN`, wiersz `id = 1`: `notify_email`, `site_url`). Poranny mail buduje `renderEmailHtml(edition, siteUrl)` w `n8n/lib/email.js`.
- Narzędzia tylko z `.tools/`, nic globalnie, zero zależności npm.

## 4. Rozważone podejścia

**Jak ocena dociera ze strony do redakcji**
- **Prywatny webhook n8n, włączany linkiem z maila (wybrane).** Adres i klucz poznaje tylko przeglądarka właściciela, z linku w porannym mailu. Publiczny kod nie zna ani jednego, ani drugiego. Bez klucza przycisków nie widać, a webhook odrzuca zapis.
- **Zgłoszenia na GitHubie (Issues).** Odrzucone: uwagi byłyby publiczne, wymagają zalogowania i kilku kliknięć na każdą.
- **Link `mailto:`.** Odrzucone: adres e-mail w publicznym kodzie i aplikacja pocztowa przy każdej uwadze.

**Skala oceny**
- **Trzy przyciski „więcej takich / w sam raz / mniej takich” (wybrane).** Mówią redakcji wprost, co zmienić.
- Gwiazdki 1–5 albo kciuki: odrzucone, bo trzeba je tłumaczyć na decyzję, a gwiazdki są bardziej widoczne.

**Co dzieje się z ocenami (decyzja właściciela: „prasa i lista”)**
- **Prasa i lista (wybrane).** Redakcja dostaje oceny i uwagi o treści, a uwagi o wyglądzie i błędach czekają na Claude'a.
- Tylko prasa: odrzucone przez właściciela, bo uwagi o wyglądzie przepadałyby.

## 5. Jak ma działać

### 5.1 Tytuł karty i ikona (decyzje projektu)
- `document.title`:
  - pierwsza strona: `Prasa AI · czw 19 lis` (skrót dnia tygodnia i miesiąca po polsku, bez roku);
  - czytnik: `n/N · <tytuł tematu>`, aktualizowany przy przewracaniu stron;
  - archiwum: `Archiwum · Prasa AI`;
  - błąd albo brak wydania: `Poranna prasa AI`.
- Statyczny `<title>` w `index.html` zostaje: `Poranna prasa AI`.
- Ikona A: ciemny kwadrat z zaokrąglonymi rogami (`#1f1d1a`), jasne szeryfowe „P” (`#faf8f3`), dobrze widoczne w jasnym i ciemnym motywie.
  - `site/icon.svg`: „P” jako ścieżka (`<path>`), nie tekst, żeby nie zależało od czcionek.
  - `site/apple-touch-icon.png`: 180×180.
  - W `index.html`: `<link rel="icon" href="icon.svg" type="image/svg+xml">` oraz `<link rel="apple-touch-icon" href="apple-touch-icon.png">`.

### 5.2 Włączenie ocen na urządzeniu
- Poranny mail dostaje w stopce mały szary link „Włącz oceny na tym urządzeniu”. Prowadzi do `<site_url>#/oceny?u=<adres webhooka>&k=<klucz>`; oba parametry są zakodowane procentowo.
- Część po `#` nie trafia na serwer GitHuba, a `referrer` jest wyłączony (`no-referrer`).
- Strona po wejściu na `#/oceny?...`:
  - zapisuje `u` i `k` w `localStorage` (klucz `ppai.feedback`), ale tylko gdy `u` zaczyna się od `https://`;
  - podmienia adres na `#/` (`history.replaceState`), żeby klucz nie został w historii ani na pasku adresu;
  - pokazuje na pierwszej stronie jednorazowy komunikat „Oceny włączone na tym urządzeniu”.
- Wejście na `#/oceny` bez parametrów albo z `off=1` usuwa zapis z `localStorage` („Oceny wyłączone na tym urządzeniu”).
- Bez zapisu w `localStorage` czytnik nie renderuje żadnego elementu ocen.
- Adres webhooka i klucz są w `pipeline_state`, w nowych kolumnach `feedback_url` i `feedback_key`. Klucz: co najmniej 32 losowe znaki, wygenerowane lokalnie i wpisane do tabeli przez MCP. Gdy któraś kolumna jest pusta, mail nie ma linku.
- Zmiana klucza w tabeli unieważnia stare urządzenia: webhook odrzuca stary klucz, a strona po odrzuceniu pokazuje „Oceny wyłączone, włącz je linkiem z maila” i czyści zapis.

### 5.3 Wygląd w czytniku
- Ocena stoi na dole strony tematu, pod źródłami i zastrzeżeniem, nad nawigacją stron. Oddziela ją cienka linia.
- Wiersz z ocenami: szary napis „Jak dla Ciebie?” i trzy małe przyciski z obwódką, w kolorze `--ink-soft`. Wybrany przycisk dostaje obwódkę i tekst w kolorze `--accent`, bez wypełnienia. Ponowne stuknięcie wybranego przycisku kasuje ocenę.
- Pod spodem kropkowany link „dodaj uwagę” (`--ink-soft`, 12–13 px). Rozwija:
  - pole tekstowe (3 wiersze, limit 1000 znaków, podpowiedź „np. za dużo o giełdzie, a za mało o tym, jak tego użyć”);
  - przycisk „Zapisz” i szary dopisek „trafi do jutrzejszego wydania”.
- Po zapisie uwagi pole się zwija, a link zmienia się na „uwaga zapisana · dodaj kolejną”. Wcześniejsze uwagi nie są pokazywane na stronie.
- Stan oceny (który przycisk wybrany) pamięta `localStorage`, osobno dla każdego `data + n`, więc po powrocie do tematu widać wybór.
- Klawisze strzałek i gesty przewracania stron nie działają, gdy fokus jest w polu tekstowym.
- Błąd sieci albo odpowiedź inna niż `ok`: komunikat „Nie zapisano, spróbuj jeszcze raz” przy przycisku. Tekst uwagi zostaje w polu, a wybór oceny wraca do poprzedniego.

### 5.4 Webhook `PPAI · oceny` (nowy workflow)
- Węzeł Webhook: `POST`, ścieżka losowa (nie mówiąca, do czego służy), odpowiedź z węzła „Respond to Webhook”, CORS ograniczony do `https://mchoczay.github.io`.
- Ścieżka webhooka może być w pliku workflowu w repo (decyzja projektu po przeglądzie): bez adresu instancji nic nie daje, a zapis i tak chroni klucz. W repo nie ma tylko adresu instancji i klucza.
- Liczba wykonań: strona wysyła ocenę dopiero po 2 s bez kolejnej zmiany (szybkie przeklikanie = jedno wywołanie), a uwagę po „Zapisz”. Przy kilku ocenach dziennie to ok. 100–300 wykonań miesięcznie. Limitu planu n8n nie znamy (jak w specyfikacji z 2026-11-18), więc budujący sprawdza go na stronie konta n8n przed wdrożeniem i zgłasza, jeśli to więcej niż 10% limitu.
- Strona wysyła `fetch` z `Content-Type: text/plain` (bez zapytania wstępnego CORS), a w treści JSON:
  - `k`: klucz;
  - `date`: `RRRR-MM-DD`;
  - `n`: numer strony w czytniku;
  - `title`: tytuł tematu;
  - `category`;
  - `rating`: `more` | `ok` | `less` | `''`, gdzie `''` kasuje ocenę;
  - albo `note`.
- Walidacja w węźle Code (logika w `n8n/lib/feedback.js`, testowana lokalnie):
  - klucz zgodny z `pipeline_state.feedback_key` (porównanie stałoczasowe nie jest wymagane);
  - `date` w formacie;
  - `n` od 1 do 20;
  - `rating` z listy albo niepusta `note` (do 1000 znaków po przycięciu);
  - `title` do 300 znaków, `category` do 40;
  - zbędne pola są ignorowane.
- Złe dane → odpowiedź 400 (`{ok:false}`), zły klucz → 401. Bez rzucania błędu, żeby nie uruchamiać maila o błędzie z `PPAI · errors`.
- Zapis: nowy wiersz w nowej tabeli `reader_feedback`, tylko dopisywanie, bez nadpisywania:
  - kolumny: `date`, `n`, `title`, `category`, `rating`, `note`, `handled` (domyślnie puste);
  - czas zapisu daje tabela (`createdAt`).
- Workflow musi być opublikowany (aktywny), żeby adres produkcyjny działał. Nie wywołuje Claude'a.

### 5.5 Skrót ocen dla redakcji
- Nowa funkcja `feedbackDigest(rows, today)` w `n8n/lib/feedback.js` zwraca krótki tekst po angielsku (prompty są po angielsku), maks. ok. 400 słów:
  - **Oceny z ostatnich 30 dni:** dla każdego tematu liczy się ostatnia ocena (najnowszy wiersz z `rating` dla danej pary `date + n`; pusty `rating` kasuje ocenę). Wynik: podsumowanie wg kategorii (ile „więcej”, ile „mniej”) i do 10 najnowszych przykładów „więcej takich: <tytuł> (<kategoria>)” / „mniej takich: …”.
  - **Uwagi z ostatnich 30 dni:** do 10 najnowszych, każda przycięta do 300 znaków, z datą i tytułem tematu.
  - Brak wierszy → pusty tekst, a prompt nie dostaje sekcji.
- `PPAI · daily` czyta `reader_feedback` raz („Read feedback”, `alwaysOutputData`). „Build relay payload” dodaje do ładunku pole `feedback` (gotowy tekst skrótu). Błąd odczytu nie zatrzymuje wydania: wtedy `feedback` jest puste.
- `selectPrompt()`, `storiesPrompt()` i `frontPrompt()` dostają opcjonalny parametr `feedback` i dopisują go jako sekcję „Reader feedback” na końcu treści użytkownika. `frontPrompt()` jest potrzebny, bo czołówkę (ocenianą jak inne tematy) pisze `PPAI · front` z tym samym promptem systemowym `write.md` (decyzja projektu po przeglądzie). Pole `feedback` jedzie w ładunku sztafety przez `select` → `write` → `front`.
- W `prompts/select.md` i `prompts/write.md` dochodzi krótka reguła:
  - to subiektywne preferencje jedynego czytelnika: mają przesuwać wybór i akcenty przy porównywalnej wadze tematów, ale nie wolno przez nie pominąć najważniejszej wiadomości dnia ani pisać o samych ocenach;
  - uwagi o wyglądzie strony, błędach i funkcjach należy pominąć;
  - reguła zaczyna się od „If the input has a Reader feedback section…”, więc bez tej sekcji nic nie zmienia.
- Koszt: do ok. 600 tokenów wejścia na każdy z trzech promptów Sonneta, czyli ok. $0,006 dziennie (~$0,18/mies.).

### 5.6 Lista dla Claude'a
- To ta sama tabela `reader_feedback`: wiersze z niepustą `note` i pustym `handled`.
- Na początku sesji, gdy właściciel poprosi („przejrzyj uwagi”), Claude czyta je przez MCP n8n. Uwagi o treści, które mają obowiązywać dłużej niż 30 dni, przenosi do promptów. Uwagi o wyglądzie i błędach zamienia w poprawki. Przerobione wiersze dostają w `handled` datę i krótki opis, co zrobiono.
- Nic się nie dzieje automatycznie poza tym. Przy czytaniu nie ma podziału na „treść” i „wygląd”: skrót dla redakcji bierze wszystkie uwagi, a redakcja sama pomija nie swoje.

### 5.7 Wdrożenie (decyzje projektu)
- Codzienny bieg jest nadal wyłączony, więc zmiany w n8n nie potrzebują flag.
- Kolejność:
  1. tabela `reader_feedback` i kolumny w `pipeline_state`;
  2. workflow `PPAI · oceny` (opublikowany), klucz i adres w `pipeline_state`;
  3. zmiany w `daily`, `select`, `write`, `front`, `publish` (mail);
  4. strona: ikona, tytuły, oceny, CSP.
- CSP: `connect-src 'self' https:`. Bez nazwy hosta n8n w pliku.
- Strona trafia na `main` dopiero za zgodą właściciela (wypchnięcie = publikacja).
- Sprawdzenie na koniec (decyzja projektu po przeglądzie: bez maila testowego, bo mail wychodzi tylko z `PPAI · publish` po commicie na `main`, a ponowna publikacja przepisałaby historię tematów):
  - stopkę maila sprawdzają testy `renderEmailHtml`; prawdziwy mail z linkiem przyjdzie z pierwszym codziennym wydaniem;
  - link włączający działa dopiero po wypchnięciu strony, więc po zgodzie właściciela na wypchnięcie Claude podaje mu link w rozmowie (prywatnie, nigdy w repo);
  - ocena i uwaga zapisane z telefonu właściciela;
  - wiersze widoczne w tabeli;
  - skrót widoczny w treści promptu w danych wykonania jednego biegu `select` z `stop_after: 'select'` (ok. $0,05, w ramach zatwierdzonych testów; dotąd wydano ok. $0,75 z $2).

## 6. Co zostaje budującemu
- Dokładne odstępy, rozmiary i stany przycisków w duchu `styles.css` i makiety.
- Rysunek „P” w SVG (np. z kształtu litery Georgia, przepisanego na ścieżkę) i sposób wygenerowania PNG bez instalowania czegokolwiek: `System.Drawing` w PowerShellu albo canvas w przeglądarce w aplikacji.
- Podział kodu strony (np. `site/js/feedback.js`) i testów.
- Format daty w tytule karty (`Intl.DateTimeFormat('pl-PL')` albo własna tabela skrótów), byle wynik był jak w 5.1.
- Dokładne brzmienie sekcji „Reader feedback” i reguł w promptach, w granicach 5.5.
- Ścieżka webhooka i sposób wygenerowania klucza (lokalnie, losowo, nie w repo).

## 7. Jak sprawdzimy, że działa
- **Testy `n8n/lib/feedback.js`:**
  - walidacja: dobry wpis; zły klucz; zła data; `n` poza zakresem; ocena spoza listy; za długa uwaga; pusta uwaga bez oceny; `''` jako kasowanie;
  - `feedbackDigest`: ostatnia ocena wygrywa, kasowanie, okno 30 dni, limity 10 i 300 znaków, pusty wynik bez wierszy.
- **Testy promptów:** sekcja „Reader feedback” jest tylko wtedy, gdy skrót niepusty; bez niej prompty są identyczne jak dziś.
- **Testy maila:** link włączający jest, gdy `feedback_url` i `feedback_key` są ustawione, nie ma go przy pustych, a parametry są zakodowane.
- **Testy strony:**
  - `parseRoute('#/oceny?u=…&k=…')`, wyłączanie i odrzucenie adresu nie-`https`;
  - czytnik bez zapisu nie ma elementów ocen, a z zapisem ma je na każdej stronie tematu i nigdzie indziej;
  - escapowanie;
  - tytuły kart dla wszystkich widoków.
- **Testy węzłów workflowów** (jak `tests/workflow-*.test.js`): walidacja w `PPAI · oceny`, pole `feedback` w ładunku `daily`.
- **Ręcznie przy 375 px:** ocena nie rzuca się w oczy, pole rozwija się bez skoku strony, strzałki nie przewracają stron podczas pisania, błąd sieci zostawia tekst.
- **Właściciel:** włącza oceny linkiem z maila na telefonie, ocenia jeden temat i dodaje uwagę; Claude potwierdza wiersze w tabeli.
