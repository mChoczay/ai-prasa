# Poranna prasa AI – rankingi według obszarów i archiwum bez filtrów (projekt)

Data: 2026-11-20. Status: do akceptacji właściciela. Makiety pokazane w rozmowie 2026-11-20; właściciel wybrał wariant C („przełącznik obszarów”) i zaakceptował archiwum bez filtrów.

## Po co

Sekcja „Rankingi · co się zmieniło” na pierwszej stronie zajmuje ok. 1050 px z 4800 px strony (więcej niż rynek, plotki i „Poznaj” razem).

Wydanie z 2026-11-20 ma w niej:
- trzy zdania podsumowania;
- listę 10 ruchów, wszystkich z Hugging Face trending, z czego 8 z opisem „brak jednoznacznej przyczyny”;
- długie techniczne nazwy modeli.

Właściciel uważa ją za nieestetyczną i sztucznie wydłużającą stronę. Chce zamiast tego wiedzieć, **który model jest najlepszy w danym obszarze** (programowanie, pisanie / copywriting itd.).

Filtry kategorii w archiwum („wszystkie, modele, giełda…”) nic nie dają. Prawie każde wydanie ma kilka kategorii, więc filtr niczego nie odsiewa.

## Cele

**1. Sekcja „Rankingi” na pierwszej stronie (wariant C).**
- Nagłówek „Rankingi”, pod nim rząd pigułek-przycisków z obszarami, przewijany w bok jak dawne pigułki archiwum.
- Pod pigułkami jest pierwsza piątka modeli w wybranym obszarze. Każdy wiersz ma numer, nazwę modelu szeryfem i firmę drobnym szarym tekstem.
- Zmianę od poprzedniego pomiaru pokazuje mała strzałka (▲2 / ▼1) albo „nowy”.
  - Gdy zmienił się lider obszaru, przy pierwszym miejscu jest dopisek „nowy lider”.
  - Pierwszy dzień bez poprzedniego pomiaru nie pokazuje strzałek ani dopisków.
- Stuknięcie w pigułkę przełącza listę bez przeładowania strony.
  - Wybór zapamiętuje się na urządzeniu.
  - Bez zapamiętanego wyboru pokazuje się „Programowanie”.
- Pod listą jest zwijane „pełne rankingi” z tym, co jest dziś: trzy zdania notatek redakcji oraz tabele LMArena (ogólny), Artificial Analysis i Hugging Face trending.
- Listy ruchów („co się zmieniło”) nie ma już na pierwszej stronie, ani dla nowych, ani dla starych wydań.

**2. Obszary, w tej kolejności.** Etykieta jest po polsku, źródło to zbiór `lmarena-ai/leaderboard-dataset` (konfiguracja / kategoria):

| Etykieta | Źródło |
|---|---|
| Programowanie | `webdev` / `overall` |
| Agenci | `agent` / `overall` |
| Pisanie | `text` / `creative_writing` |
| Po polsku | `text` / `polish` |
| Matematyka | `text` / `math` |
| Obrazy | `text_to_image` / `overall` |

Lista obszarów to moja propozycja z makiety, właściciel jej nie zakwestionował.

„Pisanie” (creative writing) najbliżej odpowiada copywritingowi. Osobnej kategorii „copywriting” w LMArena nie ma.

**3. Dane w pipeline (`PPAI · numbers`).**
- Dla każdego obszaru jedno zapytanie HTTP do datasets-server Hugging Face, tak jak dziś dla LMArena. Jest bezpłatne i bez klucza.
- Warianty modelu („(High)”, „(Max)”) łączą się jak dziś (`collapseVariants`).
- Do wydania trafia pierwsza dziesiątka obszaru (strona pokazuje pięć).
- Zmiany liczone są względem ostatniego zapisanego pomiaru tego obszaru, tak samo jak dla obecnych tablic.
- Pomiary obszarów zapisują się w tej samej tabeli `leaderboard_snapshots` co dziś, z własną nazwą tablicy (np. `area_webdev`). Zapisuje się pierwsza dwudziestka, żeby „nowy” znaczyło model spoza poprzedniej dwudziestki, a nie wejście z 11. miejsca.
- Strzałka pojawia się przy każdej zmianie o co najmniej jedno miejsce. To inaczej niż w obecnych tablicach, gdzie próg wynosi 2.
- Wynik trafia do wydania jako `rankings.areas`: lista obszarów w ustalonej kolejności, każdy z kluczem, etykietą, pierwszą dziesiątką (miejsce, model, firma, zmiana) i znacznikiem zmiany lidera.
- `rankings.areas` dokleja się przy składaniu wydania, tak jak dziś tablice `lmarena`/`aa`/`hf_trending`. Nie trafia do `schemas/edition.schema.json`, który jest też schematem odpowiedzi Claude. Inaczej Claude dostałby polecenie, żeby je pisał.
- Obszar, którego nie udało się pobrać, jest pomijany na stronie. Jego klucz trafia do listy braków w wyniku `numbers`, żeby było go widać w wykonaniu n8n. Gdy nie uda się pobrać żadnego, `rankings.areas` jest puste i strona zachowuje się jak dla starego wydania.
- Identyfikatory źródeł sprawdziłem na żywo 2026-11-20. Wszystkie sześć zwraca dane: `webdev`, `agent`, `text_to_image` (kategoria `overall`) oraz `text` z kategoriami `creative_writing`, `polish`, `math`.

**4. Archiwum.**
- Pigułki kategorii znikają. Zostaje nagłówek z nawigacją i lista dni pogrupowana po miesiącach.
- Stare linki `#/archiwum?kat=…` otwierają po prostu całe archiwum.

## Nie-cele

- Rankingi obszarów nie trafiają do redakcji (Claude):
  - nie są w prompcie;
  - nie generują ruchów w `big_moves` / `ranking_moves`;
  - nie wpływają na „Sprawdzamy” ani na wybór kart profili.

  Koszt Claude się nie zmienia.
- Bez zmian w mailu porannym, czytniku i dodatkach tygodniowych/miesięcznych.
- Bez obszarów spoza LMArena (np. testów Artificial Analysis dla kodu, płatne API).
- Bez wyszukiwarki w archiwum.

## Anty-cele

- Biblioteki JS.
- Nowe kolory spoza palety `styles.css`.
- Inline style w znacznikach (CSP).
- Pigułki, które nie są prawdziwymi przyciskami z widocznym stanem dla czytników ekranu.
- Więcej niż kilka dodatkowych sekund biegu `numbers` (limit 180 s na etap).
- Dodatkowe uruchomienia n8n: obszary pobiera ten sam etap.

## Ograniczenia

- Obecne zasady projektu: zero zależności, nic globalnie, commity od właściciela, push na `main` tylko za zgodą (publikuje stronę).
- Kod do węzłów n8n przez `scripts/inline-lib.mjs`.
- W sandboxie n8n nie ma `URL` ani `URLSearchParams`.
- Ranking LMArena to głosy ludzi porównujących dwie odpowiedzi, a nie wyniki testów. „Po polsku” ma mniej głosów (ok. 250–400 na model), więc jest mniej pewny. Strona nie musi tego pokazywać.
- Stare wydania (bez `rankings.areas` albo z pustą listą) muszą się dalej wyświetlać. Wtedy nie ma pigułek, notatki redakcji są widoczne nad zwiniętym „pełne rankingi”, a lista ruchów znika.

## Podejścia (wybór właściciela)

- **A: „Kto najlepszy w czym”.** Lider i wicelider każdego obszaru w jednej tabelce, ok. 300 px. Wszystko widać od razu, ale tylko dwa miejsca na obszar.
- **B: Podium w każdym obszarze.** Pierwsza trójka sześciu obszarów w siatce, ok. 380 px. Najpełniejszy, ale najdłuższy.
- **C: Przełącznik obszarów (wybrany).** Pigułki z obszarami i pierwsza piątka jednego obszaru, ok. 220 px. Najkrótszy i najładniejszy wg właściciela; inne obszary wymagają stuknięcia.

## Decyzje podjęte w rozmowie

- Wariant C.
- Archiwum bez filtrów kategorii.
- Obszary podzielone według zastosowania (właściciel: „coding, copywriting itp.”).

## Moje decyzje (do sprawdzenia przy czytaniu)

- Lista i kolejność obszarów z tabeli wyżej. „Programowanie” wg WebDev, bo mierzy budowanie prawdziwych aplikacji, a nie odpowiedzi na pytania o kod.
- Domyślny obszar „Programowanie”, wybór zapamiętany na urządzeniu.
- Pięć pozycji na stronie, dziesięć w danych.
- Notatki redakcji i trzy tabele przeniesione pod „pełne rankingi”.
- Lista ruchów usunięta z pierwszej strony, również dla starych wydań.
- Strzałki od zmiany o jedno miejsce, pomiary obszarów zapisywane w pierwszej dwudziestce.
- `rankings.areas` poza schematem odpowiedzi Claude.
- W starych wydaniach notatki zostają widoczne nad „pełne rankingi”.

## Zostawione budowniczemu

- Dokładne zapytania do datasets-server (`/filter` z `where` i `orderby` albo `/rows`), o ile zwracają pierwszą dziesiątkę danego obszaru po złączeniu wariantów.
- Nazwy pól i kształt `rankings.areas` w schemacie wydania, o ile mieszczą treść z punktu 3.
- Klucz zapamiętanego wyboru w `localStorage` (w stylu `ppai.*`).
- Wygląd pigułek i strzałek w obrębie palety; mają pasować do makiety C.
- Czy kod pomocniczy funkcji `rankingChanges` usunąć, jeśli nic go już nie używa.
