# Poranna prasa AI – nawigacja, archiwum i karta firmy (krótki projekt)

Data: 2026-11-20. Status: do akceptacji właściciela. Makiety: pokazane w rozmowie 2026-11-20 (wariant A wybrany).

**Po co.** Właścicielowi nie podoba się wygląd (nie układ) trzech miejsc:
- górny pasek „Dzisiejsze wydanie · Archiwum”;
- pasek w czytniku „← pierwsza strona · data”;
- archiwum (podkreślone niebieskie linki);
- systemowy przycisk „Zamknij” na dole karty firmy, widoczny dopiero po przewinięciu.

**Cele:**
- **Pierwsza strona (wariant A).** Osobny pasek znika. Pod tytułem „Poranna prasa AI” są drobne kapitaliki „Wydanie · Archiwum”, z cienką linią w kolorze akcentu pod aktywną pozycją. Pod nimi linia „piątek, 20 listopada 2026 · 7 tematów · ok. 14 min” między dwiema cienkimi kreskami. Archiwum ma ten sam nagłówek z aktywnym „Archiwum”.
- **Czytnik.** Pasek ma po lewej „‹ 20 lis” (link do pierwszej strony tego wydania), po prawej „n / N”. Pod paskiem jest cienka linia postępu (n/N szerokości), aktualizowana przy przewracaniu stron.
- **Archiwum:**
  - bez podkreśleń;
  - kategorie jako pigułki przewijane w bok, aktywna wypełniona;
  - wydania pogrupowane po miesiącach (np. „LISTOPAD 2026”);
  - wiersz wydania: po lewej duży numer dnia i skrót dnia tygodnia, obok tytuł czołówki szeryfem i „ok. N min” (oraz „Tydzień w AI” / „Miesiąc w AI” przy dodatkach).
- **Karta firmy:**
  - na telefonie wysuwa się od dołu jako arkusz z zaokrąglonymi górnymi rogami, na komputerze zostaje oknem na środku;
  - u góry zdjęcie (jeśli jest) i nazwa;
  - okrągły „×” w prawym górnym rogu, zawsze widoczny podczas przewijania;
  - zamyka ją też stuknięcie w tło i klawisz Esc;
  - przycisk „Zamknij” na dole znika.
- **Usunięcie testowego wydania z 2026-11-18 („Firma X…”)** z `site/data` i z `index.json`.

**Nie-cele:**
- gest przeciągania karty w dół;
- zmiana treści, kolorów strony i układu czytnika poza paskiem;
- liczba tematów w archiwum, bo `index.json` jej nie ma, a dodanie wymaga zmiany etapu `publish`.

**Anty-cele:** biblioteki JS, nowe kolory spoza palety `styles.css`, utrata dostępności (linki i przyciski muszą zostać prawdziwymi `<a>`/`<button>` z etykietami).

**Podejścia** (wybór właściciela):
- **A: nawigacja w nagłówku gazety (wybrany).** Najmniej elementów, wygląd prasy.
- B: cienka listwa jak w gazecie.
- C: przełącznik w stylu aplikacji.

Karta jako arkusz od dołu oraz archiwum z dniami i pigułkami to moje propozycje z makiety, bez zgłoszonych uwag.

**Jak (decyzje projektu):**
- **Pasek i nagłówek:** `<nav class="topbar">` znika z `index.html`. Nawigację renderuje `front.js` (nagłówek wydania) i `renderArchive` (ten sam nagłówek z aktywnym archiwum).
- **Tytuł i nawigacja w czytniku:** `body.reading` nie potrzebuje już ukrywać paska. Krótka data w czytniku korzysta z tej samej tabeli skrótów co `tabTitle`, np. „20 lis”.
- **Karta firmy:**
  - `<dialog>` zostaje i dostaje przycisk „×” z `aria-label="Zamknij"` u góry treści;
  - pozycjonowanie arkusza robi CSS dla szerokości do 600 px;
  - zamykanie stuknięciem w tło: klik na sam `dialog` poza treścią.
- **Testowe wydanie:** usunięcie to commit danych na `main`, wypchnięcie za zgodą właściciela. `publish` przy kolejnym wydaniu czyta `index.json` z repo, więc wpis nie wróci.

**Zostaje budującemu:** dokładne odstępy, rozmiary i animacja wysuwania (krótka, wyłączona przy `prefers-reduced-motion`).

**Sprawdzenie:**
- testy renderera dla wszystkich elementów z „Cele”: nagłówek i nawigacja z aktywną pozycją, pasek czytnika z „n / N”, archiwum z miesiącami, dniami i pigułkami, przycisk „×” w karcie, escapowanie;
- podgląd przy 375 px i na komputerze;
- na koniec strona na żywo po wypchnięciu.
