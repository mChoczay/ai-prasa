# Poranna prasa AI – nowy wygląd strony (pierwsza strona + czytnik, obrazki)

Data: 2026-11-19. Status: do akceptacji właściciela (po przeglądzie budującego).
Makiety: `.superpowers/brainstorm/1083-1795125238/content/layout-b-images.html` (wariant B z obrazkami, zaakceptowany).

## 1. Po co

Właściciel czyta wydanie rano, głównie na telefonie, czasem na komputerze. Pierwsze prawdziwe wydanie (2026-11-19) pokazało, że strona zniechęca do czytania:

- powitanie i leady to duże bloki pogrubionej kursywy;
- część pod giełdą to dwie ściany tekstu: ok. 150 słów komentarza i 6 akapitów „Dlaczego?” w wąskiej kolumnie, czasem z surowymi identyfikatorami („crwv”);
- rankingi to listy 1–10 bez informacji („treść dla treści”);
- całość ma 19 minut czytania przy celu ok. 15.

Cel: strona, którą chce się otworzyć przy kawie. Najpierw szybki przegląd, potem wygodne czytanie tematów jeden po drugim, „jak gazeta, którą się przewraca”.

## 2. Cele, nie-cele, anty-cele

**Cele**
- Pierwsza strona do przewijania: czołówka z dużym zdjęciem, pozostałe tematy jako lista (miniatura, kategoria, tytuł, 1–2 zdania), rynek w kafelkach, rankingi w zdaniach, Poznaj, plotki, dodatki tygodniowe/miesięczne.
- Czytnik: stuknięcie tematu otwiera go jako stronę. Między tematami przewraca się palcem w bok, a na komputerze strzałkami lub klawiaturą.
- Obrazki przy tematach: miniatura z artykułu źródłowego (`og:image`), a gdy jej brak lub się nie wczyta, zdjęcie lub logo z Wikimedia Commons z karty spółki lub modelu.
- Krótszy tekst tam, gdzie to wygląd wymusza: powitanie, leady, „Dlaczego?” w jednej linii, jedno zdanie nastroju rynku, jedno zdanie na ranking. Wydanie ma się czytać w ok. 15 minut.

**Nie-cele**
- Przewracanie całego wydania jako gazety (wariant A) i rozkładówka dwóch stron na komputerze.
- Generowanie obrazków przez AI lub płatne banki zdjęć.
- Zmiany w archiwum poza dopasowaniem wyglądu.
- Wideo, audio, TikTok (odłożone w osobnej specyfikacji).

**Anty-cele (porażka, nawet jeśli „działa”)**
- Kopiowanie zdjęć wydawców do repozytorium. Obrazki są tylko linkowane, jak podgląd linku.
- Biblioteki JS, frameworki, krok budowania, śledzenie czytelnika.
- Rozbicie starszych wydań: pliki z 2026-11-18 i 2026-11-19 nie mają nowych pól i muszą się nadal wyświetlać.
- Wydanie dłuższe niż dziś.
- Gest przewracania, który psuje przewijanie w pionie długiego tematu.

## 3. Ograniczenia

- Strona statyczna na GitHub Pages: `site/index.html`, `styles.css`, `js/app.js`, `js/render.js` (ES modules, bez zależności). Dane w `site/data/*.json` dopisuje n8n (`PPAI · publish`).
- CSP w `index.html`: dziś `img-src 'self' data:`. Trzeba dopuścić obrazki z zewnątrz (`img-src 'self' data: https:`). `script-src 'self'` zostaje, więc obsługa błędu obrazka musi być w JS (listener), nie w atrybucie `onerror`.
- `referrer` zostaje `no-referrer`. Wydawcy widzą IP czytelnika przy ładowaniu obrazka (jak przy każdym podglądzie linku); to akceptowalne.
- Cały tekst z danych przechodzi przez `escapeHtml`. Adresy obrazków tylko `https:`.
- Pipeline n8n: limit 180 s na wykonanie. Zmiany dokładają tylko obróbkę danych, bez nowych wywołań Claude'a. Dochodzi jedno zapytanie do Wikipedii na kartę (najwyżej 10 dziennie).
- Testy: `node --test` bez zależności. Węzły n8n testowane jak dotąd (`tests/helpers/code-node.js`, bez `URL`/`structuredClone`).
- Budżet Claude'a: koszt bez zmian (ok. $0,18/wydanie). Krótsze teksty mogą go nawet obniżyć.

## 4. Rozważone podejścia

**Układ (wybrał właściciel: B)**
- A. Całe wydanie jak gazeta: okładka, strona na temat, na końcu strony Rynek, Rankingi i Poznaj, wszystko przewracane. Najbliżej pomysłu z gazetą, ale bez szybkiego przeglądu rynku i rankingów bez kartkowania.
- **B. Pierwsza strona + czytnik:** przegląd przewijany w pionie, tematy czytane w trybie stron. Daje przegląd w 30 sekund i wygodne czytanie. Kosztem są dwa tryby w kodzie.
- C. Ta sama długa strona, tylko ładniej. Najtańsze, ale nie rozwiązuje problemu „nie chce się czytać”.

**Obrazki (wybrał właściciel: 1 z awaryjnym 2)**
1. **`og:image` z artykułu źródłowego:** zero kosztu, zawsze na temat. To szara strefa praw autorskich (łagodzona tym, że pokazujemy to jak podgląd linku z podpisem i linkiem do źródła), a część serwisów blokuje hotlinking.
2. **Wikimedia Commons z karty spółki lub modelu:** wolne licencje, wymaga podpisu autora i licencji. Mniej „na temat”, bo pokazuje kto, a nie co.
3. Darmowe stocki (Pexels/Unsplash): legalne, ale generyczne i wymagają klucza API. Odrzucone.

## 5. Jak ma działać (decyzje właściciela i projektu)

### 5.1 Pierwsza strona (`#/` i `#/RRRR-MM-DD`)
Kolejność od góry, jedna kolumna na telefonie:
1. Winieta: tytuł, data, liczba tematów, minuty czytania, „spokojny dzień”.
2. Powitanie: 1–2 zdania zwykłą czcionką (koniec z pogrubioną kursywą).
3. Czołówka: zdjęcie na całą szerokość (proporcje ok. 16:9, przycięte `object-fit: cover`), kategoria, tytuł, lead.
4. Pozostałe tematy jako lista: miniatura (ok. 72×58 px) po lewej, kategoria, tytuł, lead. Temat bez obrazka ma sam tekst, bez pustej ramki.
5. Rynek: nagłówek z datą ostatniego zamknięcia, jedno zdanie nastroju i do 4 kafelków największych ruchów. Kafelek zawiera nazwę spółki (nie ticker małymi literami), zmianę z kolorem, okres (1d/7d), znacznik fakt/hipoteza/brak i „dlaczego” w jednej linii. Stuknięcie kafelka rozwija pełne „Dlaczego?” ze źródłami. Pod kafelkami link „cały koszyk”, który rozwija pełną tabelę i dłuższy komentarz rynkowy, zwinięte domyślnie (`<details>`). Zastrzeżenie „To nie jest porada inwestycyjna.” zostaje widoczne w tej sekcji.
6. „Sprawdzamy” (follow-ups), jeśli są: krótka lista.
7. Rankingi „co się zmieniło”: dla każdej z trzech tablic jedno zdanie od modelu plus wyróżnione zmiany z danych (nowość w top 20, awans lub spadek o ≥ 2 pozycje), z pozycjami od–do. Gdy tablica nie ma danych: „dane niedostępne”. Pełne listy top 10 zwinięte pod „pełne rankingi”.
8. Plotki i przecieki: tytuły z rozwijaną treścią.
9. Poznaj: okrągła miniatura, nazwa, jedna linia; stuknięcie otwiera kartę (istniejący `<dialog>`).
10. Dodatki „Tydzień w AI” / „Miesiąc w AI”, jeśli są: karta z tytułem i pierwszym zdaniem, stuknięcie otwiera dodatek w czytniku jako stronę.
11. Zakończenie (1–2 zdania) i stopka ze źródłami danych (jak dziś).

Na komputerze (od ok. 900 px) ten sam porządek w dwóch kolumnach: tematy po lewej, rynek, rankingi i Poznaj po prawej.

### 5.2 Czytnik (`#/RRRR-MM-DD/n`, n = 1 to czołówka)
- Wszystkie tematy dnia (czołówka + tematy, potem dodatki tygodniowy i miesięczny, jeśli są) jako strony w poziomym kontenerze z przewijaniem przyciąganym do stron (`scroll-snap-type: x mandatory`). Każda strona przewija się w pionie niezależnie.
- Strona tematu: zdjęcie na całą szerokość z podpisem źródła („fot. CNBC” albo autor i licencja z Commons, z linkiem), kategoria, status, licznik „2 / 7”, tytuł, lead, treść z inicjałem, „Dla Ciebie”, „Może dotyczyć” (karty), zastrzeżenie, źródła.
- Na dole strony pasek z tytułami poprzedniego i następnego tematu (przyciski). Na komputerze dodatkowo strzałki po bokach i klawisze ←/→. Na komputerze strona ma ograniczoną szerokość (ok. 680 px), bez rozkładówki.
- Zmiana strony aktualizuje adres (`history.replaceState`), więc link i odświeżenie otwierają tę samą stronę. Przycisk „wróć do pierwszej strony” w nagłówku czytnika.
- `prefers-reduced-motion`: bez płynnej animacji przewijania.

### 5.3 Obrazki – skąd i jak
- **Z artykułu:** etap `select` (węzeł „Build articles”) wyciąga z HTML artykułu `og:image`, a w drugiej kolejności `twitter:image`. Adres musi być bezwzględny `https:` (względne rozwiązuje się względem adresu artykułu). Artykuł dostaje `image: { url, credit }`, gdzie `credit` to nazwa serwisu z artykułu.
- **Przypisanie do tematu:** w `front` („Assemble edition”) temat dostaje obrazek artykułu, na którym się opiera (dopasowanie po adresach źródeł tematu). Dopasowanie: pierwsze źródło tematu, które ma obrazek.
- **Awaryjnie z Wikipedii:** etap `profiles` przy tworzeniu karty pobiera główny obrazek strony Wikipedii (`pageimages`). Przyjmuje go tylko, gdy plik jest na Wikimedia Commons (adres `upload.wikimedia.org/wikipedia/commons/…`), bo pliki lokalne enwiki to często logotypy na zasadzie fair use. Do tego pobiera autora i licencję (`imageinfo` + `extmetadata`). Karta ma pola `image_url` i `image_credit` (nowe kolumny w `entity_profiles` i pola w `profiles.json`). W `finishEdition` temat bez obrazka z artykułu dostaje obrazek pierwszej encji z „Może dotyczyć”, która go ma. Ten sam obrazek jest w „Poznaj”.
- **Na stronie:** `loading="lazy"`, `decoding="async"`, stałe proporcje (bez skakania układu). Gdy obrazek z artykułu się nie wczyta, JS podmienia go na obrazek awaryjny tematu (jeśli jest), a w ostatecznym razie ukrywa miejsce na obrazek. Do tego temat ma w danych oba adresy: `image` i `image_fallback`.

### 5.4 Zmiany w tym, co pisze model (prompty `write.md`, `period.md`; schemat `edition.schema.json`)
- `greeting`: 1–2 zdania (dziś 3–4).
- `lede`: najwyżej 2 krótkie zdania (ok. 35 słów); na pierwszej stronie to tekst pod tytułem.
- Długości: czołówka 400–550 słów (dziś 500–700), pozostałe tematy 200–300 (dziś 250–400). Cel wydania ok. 15 minut.
- `market.mood`: nowe pole, jedno zdanie o nastroju rynku. `market.commentary` zostaje (pełny akapit w „cały koszyk”).
- `big_moves[].why_short`: nowe pole, najwyżej ok. 12 słów, do kafelka. `why` zostaje jako rozwinięcie.
- `rankings.notes`: nowe pole, po jednym zdaniu na tablicę (`[{board, text}]`), tylko z dostarczonych danych. `rankings.commentary` zostaje dla starszego kodu, ale nie jest już pokazywane na pierwszej stronie.
- Wszystkie nowe pola idą do części modelu „front” (`PPAI · front`). Schemat rośnie o kilka pól, koszt praktycznie bez zmian.

- **„Dlaczego?” przy ruchach w rankingach** (decyzja projektu): model nadal pisze `big_moves` także dla ruchów w rankingach (`board` = lmarena/aa/hf_trending). Na stronie trafiają one do sekcji rankingów, przy wyróżnionej zmianie tej tablicy: `why_short` w linii, a pełne `why` po stuknięciu. Kafelki rynku pokazują tylko `board = market`.
- **Dodatki tygodniowy i miesięczny** (decyzja projektu): `period.md` zostaje bez zmian długości. Dodatek to osobna, opcjonalna strona w czytniku. Winieta pokazuje czas wydania i osobno czas dodatku („ok. 15 min + dodatek 6 min”), żeby niedzielny dodatek nie psuł wrażenia „15 minut”.

### 5.5 Zgodność ze starszymi wydaniami
Renderer działa na plikach bez nowych pól:
- brak `mood` → pierwsze zdanie `market.commentary`;
- brak `why_short` → pierwsze zdanie `why`;
- brak `rankings.notes` → `rankings.commentary` jako jedno zdanie pod listami;
- brak obrazków → układ bez miniatur.

Starsze pliki w `site/data` nie są przepisywane.

### 5.6 Wdrożenie (decyzje projektu)
- **Codzienny bieg nie jest jeszcze włączony** (harmonogram `PPAI · daily` nieaktywny), więc workflowy n8n można zmieniać bez flag i bez pauzy. Kolejność wdrożenia: najpierw strona (renderer działa na starych i nowych danych), potem zmiany w n8n, potem jeden pełny przebieg.
- **Obrazki dla istniejących kart:** jednorazowe uzupełnienie wszystkich kart w `entity_profiles` (dziś 10) o `image_url`/`image_credit`. Tylko zapytania do Wikipedii/Commons, bez Claude'a, poza codziennym biegiem i bez limitu 10 dziennie. Odświeżanie i nowe karty pobierają obrazek przy tworzeniu.
- **Dane do testów zgodności:** prawdziwe wydanie z 2026-11-19 jest tylko na gałęzi `main` w repozytorium strony (opublikowane przez n8n). Budujący pobiera je z `origin/main` do `tests/fixtures/` razem z przykładowym 2026-11-18 z `site/data`.

## 6. Co zostaje budującemu
- Dokładne kolory, odstępy, typografia i ciemny motyw w duchu dzisiejszego `styles.css` i makiety.
- Struktura modułów JS (np. osobny `reader.js`) i podział testów.
- Jak dokładnie wyciągać `og:image` z HTML (regex na `<meta>`, kolejność atrybutów `property`/`content`) i jak ustalić autora/licencję z `extmetadata` (bez HTML w podpisie, przez `escapeHtml`).
- Sposób rozwijania kafelków i list (`<details>` albo przyciski) – byle bez bibliotek i działało bez JS tam, gdzie to proste.
- Liczba kafelków przy mniej niż 4 dużych ruchach (pokazać tyle, ile jest; przy zerze – samo zdanie nastroju i link do tabeli).
- Przeniesienie zmian do wdrożonych workflowów n8n tak jak dotąd (szkielet, potem kod węzłów) i jeden pełny przebieg testowy na koniec (ok. $0,18, mieści się w zatwierdzonych testach).

## 7. Jak sprawdzimy, że działa
- Testy renderera: pierwsza strona i czytnik z nowym wydaniem testowym oraz z oboma starszymi plikami (bez błędów, bez pustych ramek obrazków, wszystko escapowane, tylko `https:` w `src`).
- Testy węzłów n8n: wyciąganie `og:image` (względne i bezwzględne adresy, brak meta), przypisanie obrazka do tematu, odrzucenie obrazków spoza Commons, awaryjny obrazek z karty.
- Podgląd lokalny (`scripts/serve.mjs`) na szerokości telefonu (375 px) i komputera: przewracanie palcem/strzałkami, adres strony w czytniku, brak przesunięć przy ładowaniu obrazków, ciemny motyw.
- Jedno pełne wydanie z pipeline'u na żywej stronie, obejrzane przez właściciela na telefonie przed włączeniem codziennego biegu.
