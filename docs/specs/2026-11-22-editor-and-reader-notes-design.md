# Redakcja i uwagi czytelnika z 22 listopada

Uwagi z tabeli `reader_feedback` (22 lis) i decyzje właściciela:

| Uwaga | Rozwiązanie |
|---|---|
| Okienko pojęć nie zamyka się po stuknięciu obok (telefon) | Okno na cały ekran z przyciemnionym tłem jako częścią samego okna; karta w środku (`.sheet`). Stuknięcie poza kartą zamyka. Nie polegamy na `::backdrop`, którego stuknięcia Safari na iOS potrafi zgubić. |
| Pole notatki „skacze lewo-prawo” | Czcionka pola 16 px (iOS przybliża pola mniejsze niż 16 px). |
| Tekst do wyjustowania | Akapity treści w czytniku: `text-align: justify` z polskim dzieleniem wyrazów. |
| „Masło maślane”, ściana tekstu w podsumowaniu tygodnia | **Etap redakcji**: osobny przebieg Sonneta w roli redaktora prowadzącego, który przepisuje leady, treści, „Dla Ciebie” i dodatki pod kątem czytelności. |
| „Nic nie rozumiem” (Ghostscript) | Profil czytelnika: zna programowanie i AI, nie zna bezpieczeństwa, sprzętu, finansów, prawa ani nauki. Takie pojęcia wyjaśniane w pół zdania przy pierwszym użyciu; słowniczek najpierw bierze pojęcia z tytułu. |
| Podsumowanie tygodnia, tabela „do dopracowania” | Krótszy dodatek (tydzień 450–650 słów, miesiąc 800–1000) w 3–4 częściach ze śródtytułami `## `; tabela do 6 wierszy, krótkie nazwy, lider w dwóch kolumnach; dodatek dostaje uwagi czytelnika. |

## Etap redakcji (`PPAI · redakcja`)

Sztafeta: front → [period] → **redakcja** → profiles → publish. Osobne wykonanie (180 s), +1 wykonanie dziennie.

Praca jest podzielona, żeby żadne wywołanie nie zbliżyło się do limitu 180 s (wydanie przekazywane jest „bez czekania”, więc przekroczony czas oznacza utracone wydanie):
- etap **redakcja** poprawia teksty dnia (leady, treści, „Dla Ciebie”);
- dodatki (tydzień, miesiąc) poprawia drugie wywołanie redaktora w etapie **period**, zaraz po ich napisaniu.

Próba na wydaniu z 22 lis (teksty + duży dodatek w jednym wywołaniu): 57 s, $0,11. Po podziale każde wywołanie ma mniej niż połowę tego.

- Wejście modelu: każdy tekst z `idx`, tytułem, leadem, treścią i „Dla Ciebie”; dodatki z tytułem, treścią i wnioskami; uwagi czytelnika.
- Wyjście: `{ stories: [{ idx, lede, body, for_you }], supplements: [{ kind, title, body, takeaways }] }`.
- Model: Sonnet 5.5, effort low. Koszt ok. $0,10 dziennie (≈ $3 miesięcznie; razem ok. $10,5 z $15).
- **Bezpieczniki** (na każdy tekst osobno, zawsze względem oryginału; jeśli nie przejdzie, zostaje wersja oryginalna):
  - treść niepusta, długość 40–125% oryginału w słowach (125%, bo objaśnienia pojęć dokładają kilka słów);
  - lead i „Dla Ciebie” najwyżej 1,5× oryginału albo 45 słów; puste „Dla Ciebie” zostaje puste;
  - każda liczba w nowym tekście występuje w oryginale razem z jednostką (mln/mld/bln/tys/%/USD/zł, także zapisane słownie: „17 milionów” = „17 mln”); „2 mln” → „2 mld” albo zgubiona jednostka to nowa liczba;
  - powtórzony `idx` albo rodzaj dodatku jest pomijany;
  - dodatek: ten sam rodzaj (`weekly`/`monthly`), tyle samo wniosków, nie mniej śródtytułów niż min(oryginał, 3).
- Czego bezpieczniki nie złapią: odwrócenia kierunku („spadek” → „wzrost”), przeniesienia liczby na inną firmę, liczb pisanych słowami. Tego pilnuje prompt redaktora; regex tego nie rozstrzygnie.
- Błąd wywołania, brak kredytów → pauza jak w innych etapach; każdy inny błąd → wydanie idzie dalej bez redakcji.
- Po redakcji przeliczane są minuty czytania.

## Strona

- Śródtytuły: akapit dodatku zaczynający się od `## ` to `<h3>`.
- Tabela „Kto prowadzi”: obszar w pierwszej kolumnie, w drugiej lider pogrubiony, a pod nim notatka.

## Po recenzji (22 lis)

Naprawione: podział redakcji (limit czasu), jednostki w bezpieczniku liczb, porównanie zawsze z oryginałem, powtórzone `idx`, limity leadu i „Dla Ciebie”, utrata śródtytułów, śródtytuł z tekstem w następnej linii, sprzeczność w edit.md (objaśnienie pojęcia ≠ nowy fakt), „najwyżej 550/300 słów” w write.md.

Odłożone (drobne):
- w froncie przełącznik ma wciąż `outputKey: 'profiles'` dla trasy `edit` (tylko etykieta), a komentarz `stop_after` w daily nie wymienia `edit`;
- brak testu, że wartości przełącznika frontu zgadzają się z `next` z „Assemble edition”;
- odrzucone poprawki redaktora (`edit_kept`) widać tylko w danych wykonania, nie w mailu ani w logu;
- `readingMinutes` liczy `##` jako słowo (kosmetyka).
