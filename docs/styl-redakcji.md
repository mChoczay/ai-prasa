# Styl redakcji Porannej prasy AI

Przewodnik dla etapu redakcji (i piszącego). Powstał 26 listopada 2026 z analizy ok. 22 artykułów z pięciu serwisów: Niebezpiecznik, Zaufana Trzecia Strona, Spider's Web, MIT Technology Review i blog Simona Willisona. Z każdego wzięliśmy to, w czym jest dobry, i świadomie odrzuciliśmy jego słabości. Ars Technica i The Verge blokują automatyczne czytanie, więc nie weszły do analizy.

Artykuły posłużyły tylko do analizy techniki. Nie przechowujemy ich ani nie cytujemy; przykłady poniżej są nasze.

## Czego się nauczyliśmy od kogo

| Serwis | Bierzemy | Odrzucamy |
|---|---|---|
| Zaufana Trzecia Strona | konkret w pierwszym zdaniu (kto, co, ile, kiedy); „czyli…” zaraz po trudnym słowie; zaznaczanie, czego nie dało się sprawdzić | długie zdania z kilkoma nawiasami, żargon bez wyjaśnienia |
| Niebezpiecznik | skutki praktyczne („co zrobić”); liczby podane wprost („22 z 26”); otwarte przyznanie, czego nie wiadomo | hiperbolę i sarkazm wobec ludzi |
| Spider's Web | lekkość z konkretów; tytuł „fakt + co z tego”; jedno wyraźne zdanie oceny | przymiotniki „przełomowy”, „wreszcie”; tytuł mocniejszy niż tekst; komunikat firmy bez dystansu |
| MIT Technology Review | porównanie liczby do znanej skali; źródło przy każdej liczbie; spokojny ton, krytyka przypisana rozmówcom | zbyt wiele liczb w jednym zdaniu |
| Simon Willison | najpierw stare podejście, potem nowe; krótkie akapity z jednozdaniową puentą; uczciwe „nie wiem” | gęsty żargon, nadmiar „ja” |

## Zasady

### Tytuł (etap pisania)
1. Fakt i jego skutek: kto zrobił co, a po kropce lub myślniku, co to zmienia. „Ghostscript załatany. Spreparowany PDF nie przejmie już serwera”.
2. Liczba w tytule tylko wtedy, gdy to ona jest wiadomością.
3. Tytuł nie obiecuje więcej, niż mówi tekst. Bez pytań, na które tekst nie odpowiada, i bez „szok”, „przełom”, „wreszcie”.

### Lead
4. Pierwsze zdanie to wiadomość z konkretem: kto, co, ile, kiedy. Kontekst dopiero w drugim. Lead ma najwyżej 30 słów, a pierwszy akapit tekstu też zaczyna się od tego, kto co zrobił, nie od definicji tematu.
5. Nie zaczynaj od przymiotnika oceniającego ani od tła („W świecie AI…”).

### Trudne słowa
6. Przy pierwszym użyciu terminu spoza programowania i AI dodaj pół zdania „czyli…”, opisując, **co się dzieje**, a nie definicję ze słownika.
7. Gdy pomaga, porównaj do czegoś znanego albo pokaż „najpierw było tak, teraz jest tak”.
8. Polskie określenie najpierw, angielskie w nawiasie, jeśli czytelnik może je spotkać w dokumentacji.

### Liczby
9. Każda liczba ma źródło w tym samym zdaniu („według firmy”, „jak podaje raport”).
10. Gdy liczba jest abstrakcyjna, porównaj ją do znanej skali („dwa razy tyle, ile…”), ale tylko jeśli porównanie jest w materiale.
11. Najwyżej dwie liczby w jednym zdaniu; resztę przenieś albo pomiń.
12. Zapowiedzi firm („dwukrotnie szybszy”) podawaj jako twierdzenia: „firma twierdzi”, „przekonuje”.
13. Skracając, nie wzmacniaj: „opisał” nie staje się „przyznał”, „wymaga uwagi” nie staje się „utrudnia”, „może” nie staje się „będzie”.

### Budowa
14. Akapity 1–3 zdania, jeden wątek na akapit.
15. Najważniejszy wniosek może stać sam, jako jednozdaniowy akapit, ale najwyżej raz w tekście.
16. Zdania krótkie: jedna myśl, najwyżej jedno wtrącenie.

### Głos
17. Ciepło i rzeczowo, w drugiej osobie („Kiedy pracowałeś…”). Lekkość z konkretów i z jednego jasnego zdania oceny, nie z przymiotników.
18. Krytykę i zachwyty przypisuj rozmówcom albo źródłom („mówi”, „twierdzi”), a własną ocenę wyrażaj spokojnie i najwyżej raz.
19. Najwyżej jedno pytanie retoryczne w tekście, i tylko gdy tekst na nie odpowiada.

### Zakończenie
20. Kończ praktycznie: co zrobić, co obserwować albo czego jeszcze nie wiadomo. Nie streszczaj tekstu.

### Czego nie robimy
21. „Przełomowy”, „rewolucyjny”, „wreszcie”, „szokujący”, „warto zauważyć”, „najważniejsze zastrzeżenie dotyczy”, „dla porządku dodajmy”.
22. Mówienie o materiale („z dostarczonego tekstu nie wynika”), powtarzanie tej samej myśli w dwóch akapitach, komunikat prasowy bez dystansu.

## Przykłady „przed i po” (na naszych tekstach)

**Lead**
- Przed: „OpenRouter opisał ustalenia badaczy bezpieczeństwa: u części dostawców inferencji dane zostały naruszone albo nie były chronione zgodnie z deklarowanymi politykami.”
- Po: „U części firm, które OpenRouter wysyła z Twoimi promptami, dane wyciekły albo były przechowywane wbrew obietnicom. Sam OpenRouter nie został włamany.”

**Trudne słowo**
- Przed: „To use-after-free w module ładowania fontów Type 1.”
- Po: „To błąd typu use-after-free, czyli program sięga po pamięć, którą już oddał, a atakujący może ją w tym czasie podmienić.”

**Liczby**
- Przed: „Nvidia -22,92%, Micron -23,62%, AMD -20,54%, TSMC -20,07% i Arm -20,12%.”
- Po: „Najmocniej spadli producenci chipów: Nvidia i Micron straciły w tydzień ponad jedną piątą wartości.”

**Zakończenie**
- Przed: „Wspólny mianownik jest taki sam: deklaracja o niezatrzymywaniu danych to dopiero obietnica.”
- Po: „Jeśli kierujesz ruch przez OpenRoutera, sprawdź na jego liście, czy Twoi dostawcy wydali komunikat.”
