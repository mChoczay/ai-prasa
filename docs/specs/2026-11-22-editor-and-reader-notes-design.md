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

- Wejście modelu: każdy tekst z `idx`, tytułem, leadem, treścią i „Dla Ciebie”; dodatki z tytułem, treścią i wnioskami; uwagi czytelnika.
- Wyjście: `{ stories: [{ idx, lede, body, for_you }], supplements: [{ kind, title, body, takeaways }] }`.
- Model: Sonnet 5.5, effort medium. Koszt ok. $0,08 dziennie (≈ $2,4 miesięcznie; razem ok. $10 z $15).
- **Bezpieczniki** (na każdy tekst osobno; jeśli nie przejdzie, zostaje wersja oryginalna):
  - treść niepusta, długość 40–115% oryginału w słowach;
  - każda liczba w nowym tekście występuje w oryginale (tytuł, lead, treść, „Dla Ciebie”; dla dodatku także tabela i wnioski) — redaktor nie może dopisać liczb;
  - dodatek: ten sam rodzaj (`weekly`/`monthly`), dokładnie tyle samo wniosków.
- Błąd wywołania, brak kredytów → pauza jak w innych etapach; każdy inny błąd → wydanie idzie dalej bez redakcji.
- Po redakcji przeliczane są minuty czytania.

## Strona

- Śródtytuły: akapit dodatku zaczynający się od `## ` to `<h3>`.
- Tabela „Kto prowadzi”: obszar w pierwszej kolumnie, w drugiej lider pogrubiony, a pod nim notatka.
