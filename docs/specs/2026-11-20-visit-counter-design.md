# Poranna prasa AI – licznik odwiedzin (krótki projekt)

Data: 2026-11-20. Status: zaakceptowany przez właściciela w rozmowie (podał kod strony GoatCounter po pytaniu o akceptację).

**Po co.** Właściciel udostępnił stronę znajomym i z ciekawości chce wiedzieć, czy ktoś z niej korzysta. Interesuje go liczba odwiedzin dziennie, tygodniowo i miesięcznie. Nie chce identyfikować osób, a czas na stronie przestał być potrzebny („tylko ilość wejść”).

**Cele:**
- **Liczenie.**
  - Każde otwarcie strony wysyła jedno zliczenie do GoatCounter: `https://api-prasa.goatcounter.com/count`, parametr `p=/` i losowy `rnd`.
  - Zliczenie idzie raz na załadowanie strony; przejścia między widokami (hash) się nie liczą.
  - Urządzenie z włączonymi ocenami (zapisana konfiguracja `ppai.feedback`) nie jest liczone.
- **Mail.**
  - W poniedziałki poranny mail ma sekcję „Kto czytał” z odwiedzającymi za miniony tydzień (pon–nd, czas Europe/Warsaw) i odwiedzającymi każdego dnia.
  - 1. dnia miesiąca dochodzi linijka za cały poprzedni miesiąc. Jeśli 1. wypada w poniedziałek, mail ma obie części.
  - Dane pochodzą z `GET https://api-prasa.goatcounter.com/api/v0/stats/total?start=…&end=…`: `total` za okres oraz `stats[].day` / `stats[].daily` na dzień.
  - Nagłówek `Authorization: Bearer <klucz>` pochodzi z poświadczenia n8n.
  - Gdy API nie odpowie lub odpowie błędem, mail wychodzi bez tej sekcji.

**Nie-cele:**
- czas spędzony na stronie;
- statystyki per artykuł albo per wydanie;
- osobny widok statystyk na stronie (wystarczy mail i panel GoatCounter);
- liczba wejść osobno od odwiedzających (API jej nie podaje).

**Anty-cele:**
- skrypt GoatCounter (`count.js`) albo jakikolwiek obcy skrypt na stronie;
- adres n8n w publicznym repo lub kodzie strony;
- klucz API w repo;
- nowe uruchomienia n8n albo wywołania Claude z powodu odwiedzin;
- zmiana CSP (`img-src … https:` już pozwala na zliczenie przez obrazek);
- błąd licznika zatrzymujący stronę albo poranny mail.

**Ograniczenia:**
- Obecne zasady projektu:
  - zero zależności, nic globalnie;
  - commity od właściciela;
  - push na `main` tylko za zgodą (publikuje stronę);
  - w sandboksie n8n nie ma `URL` ani `URLSearchParams`;
  - każdy etap mieści się w 180 s.
- Limit API GoatCounter to 4 zapytania na sekundę. Mail robi najwyżej dwa zapytania na dzień, i to tylko w poniedziałki i 1. dnia miesiąca.
- Kod strony `api-prasa` nie jest tajny; i tak jest w adresie zliczeń.

**Podejścia (wybór właściciela):**
- **GoatCounter przez obrazek-licznik (wybrany).** Działa bez obcego skryptu i bez adresu n8n, nie zużywa uruchomień n8n.
- Webhook statystyk w n8n (sygnał na wizytę). Odrzucony: wymaga publicznego adresu instancji n8n, a każda wizyta to uruchomienie.
- Umami Cloud. Odrzucony: obcy skrypt na stronie.

**Decyzje z rozmowy:**
- podsumowanie w mailu wystarczy;
- sygnał przy wejściu, bez czasu;
- GoatCounter;
- własne urządzenie się nie liczy.

**Moje decyzje:**
- Jedno zliczenie na załadowanie strony, ścieżka `/`, bez tytułu i referera.
- Tydzień liczony od poniedziałku do niedzieli w czasie Europe/Warsaw. Zapytania używają godzin w UTC, zaokrąglonych do pełnej godziny, jak wymaga API.
- Sekcja „Kto czytał” jest na końcu maila, przed stopką z linkiem do ocen.

**Zostawione budowniczemu:**
- dokładna funkcja dat (zakresy tygodnia i miesiąca);
- miejsce wywołania w `app.js`;
- węzeł HTTP w `PPAI · publish` (warunek „poniedziałek lub 1.”, `onError` = kontynuuj);
- kształt HTML sekcji w stylu obecnego maila.
