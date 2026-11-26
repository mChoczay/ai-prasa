# Próba A/B: stara i nowa instrukcja redaktora (runda 2)

Te same teksty reporterów z 21 i 22 listopada 2026 (sprzed etapu redakcji) przeszły przez Sonneta 5.5 dwa razy: ze starą instrukcją i z nową, z regułami z `docs/styl-redakcji.md`. To druga runda: nowa instrukcja dostała reguły o sile czasowników, liczbach w zdaniu i długości leadu. Stara redakcja pochodzi z pierwszej rundy. Obie wersje przeszły przez te same bezpieczniki co w produkcji (długość, liczby, lead).

Koszt obu rund: ok. 0,51 USD (pierwsza 0,34, druga 0,17).

Kolumny: słowa w tekście, słowa w leadzie, średnio słów w zdaniu, średnio zdań w akapicie, najwięcej liczb w jednym zdaniu, ile razy „czyli”, ile zakazanych słów. Licznik liczb liczy też cyfry w nazwach modeli (np. Qwen3.6-35B-A3B), więc zawyża wynik w tekstach o modelach.

## Podsumowanie liczbowe (średnio na tekst)

| wersja | słowa | lead | słów/zdanie | zdań/akapit | max liczb w zdaniu | „czyli” razem | zakazane razem |
|---|---|---|---|---|---|---|---|
| reporter | 250.2 | 25.3 | 16.6 | 3.1 | 3.1 | 4 | 0 |
| stara redakcja | 230.0 | 25.4 | 14.8 | 3.1 | 3.0 | 7 | 0 |
| nowa redakcja, runda 1 | 218.5 | 26.3 | 16.0 | 2.6 | 3.0 | 7 | 0 |
| nowa redakcja, runda 2 | 229.2 | 25.8 | 14.8 | 2.8 | 2.9 | 8 | 0 |

Teksty niżej pokazują rundę 2.

## Co się zmieniło w rundzie 2

**Naprawione**
- Siła czasowników zostaje: „według autorów wymaga uwagi przy monitorowaniu” jest bez zmian, a w tekście o OpenRouterze lead mówi „poinformował”, nie „przyznał”. To były dwa przesunięcia sensu z rundy 1.
- Tekst o hipotezie Riemanna zaczyna się od tego, kto co zrobił („Alpöge napisał na swojej stronie, że…”), a tło przyszło w drugim zdaniu.
- Zdania są krótsze niż w rundzie 1 (14,8 słowa zamiast 16), czyli tyle, co po starej redakcji.

**Zostało z rundy 1**
- Wyjaśnienia trudnych słów w stylu „czyli…” (use-after-free, double free, destylacja, BIS).
- Brak „Kiedy pracowałeś…” na początku tekstów, które stara redakcja zostawiała.
- Poprawiona gramatyka leadu o ONZ.
- Akapity krótsze niż po starej redakcji (2,8 zamiast 3,1 zdania).

**Dalej słabo**
- Zdania z trzema i więcej liczbami częściowo zostają, np. o SoftBanku (64,6 mld, 14,48%, sierpień 2024) i o wersjach Debiana i Ubuntu. Przy porównaniu wyników benchmarków to rozsądne, przy wyliczankach mniej.
- Dwa leady mają 31 i 33 słowa zamiast najwyżej 30. Lead reportera w drugim z tych tekstów był podobnie długi.
- Teksty nie są krótsze niż po starej redakcji (229 wobec 230 słów). Nowa instrukcja zmienia budowę tekstu, ale go nie skraca.

## Wydanie 2026-11-21

Bezpieczniki, wersja stara: wszystkie teksty przyjęte.
Bezpieczniki, wersja nowa: wszystkie teksty przyjęte.

### Matematyk z Anthropic twierdzi, że z pomocą Claude'a dowiódł hipotezy Riemanna

| wersja | słowa | lead | słów/zdanie | zdań/akapit | max liczb w zdaniu | „czyli” | zakazane |
|---|---|---|---|---|---|---|---|
| reporter | 401 | 25 | 16.0 | 3.1 | 1 | 1 | 0 |
| stara redakcja | 342 | 24 | 13.7 | 3.1 | 1 | 1 | 0 |
| nowa redakcja | 330 | 31 | 15.0 | 3.1 | 1 | 1 | 0 |

**Lead, reporter**
> Levent Alpöge, matematyk z Anthropic, ogłosił dowód hipotezy Riemanna uzyskany we współpracy z Claude'em. Dowód nie został jeszcze niezależnie zweryfikowany, a Anthropic nie skomentował sprawy.

**Lead, stara redakcja**
> Levent Alpöge, matematyk z Anthropic, ogłosił, że wraz z Claude'em dowiódł hipotezy Riemanna. Nikt niezależny jeszcze tego nie sprawdził, a Anthropic nie komentuje sprawy.

**Lead, nowa redakcja**
> Levent Alpöge, matematyk z Anthropic, opublikował na swojej stronie dokument z dowodem hipotezy Riemanna, który jak pisze, powstał z pomocą Claude'a. Nikt niezależny go nie zweryfikował, a Anthropic nie komentuje sprawy.

<details><summary>Cały tekst: stara redakcja</summary>

> Alpöge opublikował na swojej stronie dokument, w którym pisze, że z Claude'em odkrył dowód hipotezy Riemanna. Jak podaje The Verge, to jeden z siedmiu Problemów Milenijnych, sformułowany w 1859 roku. Dotyczy rozmieszczenia liczb pierwszych i zer pewnej funkcji i uchodzi za jeden z najważniejszych nierozwiązanych problemów matematyki.
> 
> Na razie to twierdzenie jednego autora, z jego własnej strony. Anthropic, według The Verge, nie komentuje i nie angażuje się w ogłoszenie. Redakcja serwisu poprosiła firmę o komentarz i nie dostała odpowiedzi.
> 
> Alpöge pisze, że metoda łatwo się rozszerza: obejmuje uogólnioną hipotezę Riemanna, a przy większej ilości czasu, jak się spodziewa, także rozszerzoną. Twierdzi, że on i Claude sformalizowali argumenty bez dodatkowych założeń. Rozwiązanie jest zapisane w Lean, czyli w języku asystenta dowodzenia, który pozwala maszynowo sprawdzić poprawność kroków. Sama formalizacja nie zastępuje jednak oceny matematyków, choćby co do tego, czy sformalizowane twierdzenie mówi to, co powinno.
> 
> Alpöge opisuje też, że napisał do szefa Anthropic Dario Amodei późną niedzielną nocą. Sugeruje, że wstrzymał publikację do czwartkowego debiutu giełdowego firmy. The Verge przytacza to za jego dokumentem.
> 
> Zasady Clay Mathematics Institute są jasne: rozwiązanie musi zostać opublikowane i przetrwać co najmniej dwa lata badania. W tym czasie ma zyskać ogólną akceptację światowej społeczności matematycznej, zanim w ogóle będzie rozważane do nagrody 1 mln dolarów. Przez ćwierć wieku od ustanowienia nagrody oficjalnie rozwiązano tylko jeden problem, hipotezę Poincarégo.
> 
> Według The Verge we wrześniu OpenAI ogłosiło rozwiązanie problemu Naviera-Stokesa, na co poświęciło miliony dolarów i uruchomiło 10 tys. agentów. Wynik uznaje się za wiarygodny, choć nie ma formalnego uznania. Sprawę komplikują zarzuty o wykorzystanie niepublikowanych prac matematyków, które OpenAI stanowczo odrzuca. Buckmaster, profesor NYU, twierdzi, że rozwiązanie poszło drogą, nad którą pracował z Alpögem z użyciem Codexa OpenAI i Claude'a.
> 
> Anthropic w sierpniu przyznawał, że pracuje z Claude'em nad hipotezą Riemanna, ale zastrzegał: „Nie spodziewamy się, że techniki, których użył Claude, doprowadzą do udowodnienia hipotezy Riemanna”. Alpöge podaje też, że w lipcu z pomocą Claude'a rozwiązał hipotezę jakobianową. Zalew takich wyników zmusza matematyków do nadążania z weryfikacją.
> 
> Najrozsądniejsza jest teraz cierpliwość: sprawdzenie dowodu zajmie dłużej niż cykl newsowy.

*Dla Ciebie:* Dla developera to sygnał, że modele zaczynają wspierać pracę badawczą z formalną weryfikacją w Lean, co pasuje do wzorca „generuj i sprawdzaj maszynowo”. Do czasu niezależnej weryfikacji nie opieraj wniosków na tym twierdzeniu.

</details>

<details><summary>Cały tekst: nowa redakcja</summary>

> Levent Alpöge, matematyk związany z Anthropic, napisał na swojej stronie, że wraz z Claude'em odkrył dowód hipotezy Riemanna. Jak podaje The Verge, to jedno z siedmiu zadań z listy Problemów Milenijnych, sformułowane w 1859 roku. Dotyczy rozmieszczenia liczb pierwszych i zer pewnej funkcji.
> 
> To twierdzenie jednego autora, opublikowane na jego własnej stronie. Według The Verge Anthropic nie komentuje i nie angażuje się w ogłoszenie, a redakcja serwisu nie dostała jeszcze odpowiedzi na prośbę o komentarz.
> 
> Alpöge pisze, że metoda łatwo się rozszerza: obejmuje uogólnioną hipotezę Riemanna, a przy większej ilości czasu, jak się spodziewa, także rozszerzoną. Dodaje, że on i Claude sformalizowali argumenty bez dodatkowych założeń. Rozwiązanie jest przedstawione w Lean, czyli w języku asystenta dowodzenia, który pozwala maszynowo sprawdzić poprawność kroków. Sama formalizacja nie zastępuje jednak oceny matematyków, choćby co do tego, czy sformalizowane twierdzenie mówi to, co powinno.
> 
> Alpöge opisuje też, że napisał do szefa Anthropic Dario Amodei późną niedzielną nocą i sugeruje, że wstrzymał publikację do czwartkowego debiutu giełdowego firmy. The Verge przytacza to za jego dokumentem.
> 
> Według zasad Clay Mathematics Institute rozwiązanie musi zostać opublikowane i przetrwać co najmniej dwa lata badania, w trakcie których ma zyskać ogólną akceptację światowej społeczności matematycznej. Dopiero wtedy może być rozważane do nagrody 1 mln dolarów. Przez ćwierć wieku od ustanowienia nagrody oficjalnie rozwiązano tylko jeden problem, hipotezę Poincarégo.
> 
> Według The Verge we wrześniu OpenAI ogłosiło rozwiązanie problemu Naviera-Stokesa, na co poświęciło miliony dolarów i uruchomiło 10 tys. agentów. Wynik uznaje się za wiarygodny, choć nie ma formalnego uznania. Sprawę komplikują zarzuty o wykorzystanie niepublikowanych prac matematyków, które OpenAI stanowczo odrzuca. Buckmaster, profesor NYU, twierdzi, że rozwiązanie poszło drogą, nad którą pracował z Alpögem z użyciem Codexa OpenAI i Claude'a.
> 
> Anthropic w sierpniu przyznawał, że pracuje z Claude'em nad hipotezą Riemanna, zastrzegając: „Nie spodziewamy się, że techniki, których użył Claude, doprowadzą do udowodnienia hipotezy Riemanna”. Alpöge podaje też, że w lipcu z pomocą Claude'a rozwiązał hipotezę jakobianową. Zalew takich wyników zostawia matematyków w sytuacji, w której muszą nadążyć z weryfikacją.

*Dla Ciebie:* Dla developera to sygnał, że modele zaczynają wspierać pracę badawczą z formalną weryfikacją w Lean, co pasuje do wzorca generuj i sprawdzaj maszynowo. Do czasu niezależnej weryfikacji nie opieraj żadnych wniosków na tym twierdzeniu.

</details>

### Anthropic traci prawie 9% pierwszego pełnego dnia na giełdzie, a technologie spadają razem z nim

| wersja | słowa | lead | słów/zdanie | zdań/akapit | max liczb w zdaniu | „czyli” | zakazane |
|---|---|---|---|---|---|---|---|
| reporter | 241 | 21 | 15.1 | 2.7 | 4 | 0 | 0 |
| stara redakcja | 253 | 21 | 14.9 | 2.8 | 4 | 1 | 0 |
| nowa redakcja | 243 | 21 | 12.8 | 3.2 | 3 | 1 | 0 |

**Lead, reporter**
> Akcje Anthropic zamknęły piątek 8,5% niżej, po cenie 97,17 dolara. Spadki objęły cały sektor AI, także producentów chipów i dostawców chmury.

**Lead, stara redakcja**
> Akcje Anthropic zamknęły piątek 8,5% niżej, po cenie 97,17 dolara. Spadki objęły cały sektor AI, także producentów chipów i dostawców chmury.

**Lead, nowa redakcja**
> Akcje Anthropic zamknęły piątek 8,5% niżej, po cenie 97,17 dolara. Spadki objęły cały sektor AI, także producentów chipów i dostawców chmury.

<details><summary>Cały tekst: stara redakcja</summary>

> Kiedy pracowałeś, rynek dał pierwszą odpowiedź na debiut Anthropic. Według CNBC akcje otworzyły się na Nasdaq w czwartek po cenie 111,50 dolara, po tym jak firma zebrała 81,3 mld dolarów w największym IPO (pierwszej publicznej emisji akcji) w historii. W kolejnych sesjach kurs osuwał się i zamknął na poziomie 97,17 dolara.
> 
> CNBC wiąże ruch z szerszym niepokojem wokół handlu AI. Wymienia trzy czynniki: zaskakujące odejście Jensena Huanga ze stanowiska CEO Nvidii, pogorszenie nastrojów wokół centrów danych oraz obawy, że rosnące stopy procentowe zaszkodzą planom wielobilionowej rozbudowy infrastruktury. Nvidia i AMD straciły ponad 13%, a Amazon, Google i Microsoft także zamknęły niżej.
> 
> Fala objęła Azję. SoftBank, który zainwestował w OpenAI łącznie 64,6 mld dolarów i jest właścicielem Arm, spadł o 14,48%, najmocniej od sierpnia 2024. Kospi, indeks giełdy w Seulu, zamknął 5,21% niżej, SK hynix straciło 5,92%, Samsung 7,01%, a TSMC w Tajpej 4,76%.
> 
> Analitycy są podzieleni. Seaport Research ocenia akcje neutralnie i pisze, że spółka oczekuje od inwestorów „niesamowitego skoku wiary”, a do uzasadnienia wyceny potrzebuje znacznie szybszego wzrostu w ciągu dwóch lat. William Blair daje ocenę outperform, czyli rekomendację, że akcje powinny wypaść lepiej niż rynek. Chwali efektywność firmy i potencjał długoterminowej rentowności, mimo ogromnych kosztów infrastruktury.
> 
> Sekretarz skarbu Scott Bessent nazwał Anthropic historią „tylko w Ameryce” i zaznaczył, że firma chętnie współpracuje przy testowaniu modeli przed premierą. Według CNBC Tom Brown, szef ds. mocy obliczeniowych, ma przekazać dużą darowiznę na konta inwestycyjne dla dzieci.
> 
> Spadek Anthropic przypada na dzień szerokiej wyprzedaży technologii, więc nie da się go przypisać wyłącznie jednej spółce.

*Dla Ciebie:* Jeśli opierasz produkt na API Claude, technicznie na razie nic się nie zmienia. Warto jednak śledzić raporty spółki publicznej jako źródło informacji o kosztach i ryzyku dostawcy.

</details>

<details><summary>Cały tekst: nowa redakcja</summary>

> Według CNBC akcje Anthropic otworzyły się na Nasdaq w czwartek po cenie 111,50 dolara. Firma zebrała wtedy 81,3 mld dolarów w największym IPO w historii. W kolejnych sesjach kurs osuwał się i zamknął na poziomie 97,17 dolara.
> 
> CNBC wiąże ruch z szerszym niepokojem wokół handlu AI i wymienia trzy czynniki. Pierwszy to zaskakujące odejście Jensena Huanga ze stanowiska CEO Nvidii, drugi to pogorszenie nastrojów wokół centrów danych. Trzeci to obawy, że rosnące stopy procentowe zaszkodzą planom wielobilionowej rozbudowy infrastruktury. Nvidia i AMD straciły ponad 13%, a Amazon, Google i Microsoft także zamknęły niżej.
> 
> Fala objęła Azję. SoftBank, który zainwestował w OpenAI łącznie 64,6 mld dolarów i jest właścicielem Arm, spadł o 14,48%, najmocniej od sierpnia 2024. Kospi, główny indeks giełdy w Seulu, zamknął 5,21% niżej. SK hynix straciło 5,92%, Samsung 7,01%, a TSMC w Tajpej 4,76%.
> 
> Analitycy są podzieleni. Seaport Research ocenia akcje neutralnie i pisze, że spółka oczekuje od inwestorów „niesamowitego skoku wiary”, a do uzasadnienia wyceny potrzebuje znacznie szybszego wzrostu w ciągu dwóch lat. William Blair daje ocenę outperform, czyli rekomenduje wynik lepszy od rynku. Chwali efektywność firmy i potencjał długoterminowej rentowności, mimo ogromnych kosztów infrastruktury.
> 
> Sekretarz skarbu Scott Bessent nazwał Anthropic historią „tylko w Ameryce” i zaznaczył, że firma chętnie współpracuje przy testowaniu modeli przed premierą. Według CNBC Tom Brown, szef ds. mocy obliczeniowych, ma przekazać dużą darowiznę na konta inwestycyjne dla dzieci.
> 
> Spadek Anthropic przypada na dzień szerokiej wyprzedaży technologii, więc nie da się go przypisać wyłącznie jednej spółce.

*Dla Ciebie:* Jeśli opierasz produkt na API Claude, na razie nic się nie zmienia technicznie. Warto jednak śledzić raporty spółki publicznej jako źródło informacji o kosztach i ryzyku dostawcy.

</details>

### Inkling 2 Mini: otwarty model z pętlą warstw, który mieści się w laptopie

| wersja | słowa | lead | słów/zdanie | zdań/akapit | max liczb w zdaniu | „czyli” | zakazane |
|---|---|---|---|---|---|---|---|
| reporter | 235 | 29 | 14.7 | 3.2 | 9 | 0 | 0 |
| stara redakcja | 234 | 29 | 13.8 | 2.8 | 9 | 0 | 0 |
| nowa redakcja | 239 | 29 | 14.1 | 2.8 | 9 | 0 | 0 |

**Lead, reporter**
> Thinking Machines wydało Inkling 2 Mini, otwarty model MoE o 26,4 mld parametrów, który zajmuje około 20 GB. Powtarza środkowe warstwy trzykrotnie, by lepiej rozumować przy mniejszej liczbie tokenów.

**Lead, stara redakcja**
> Thinking Machines wydało Inkling 2 Mini, otwarty model MoE o 26,4 mld parametrów, który zajmuje około 20 GB. Powtarza środkowe warstwy trzykrotnie, by lepiej rozumować przy mniejszej liczbie tokenów.

**Lead, nowa redakcja**
> Thinking Machines wydało Inkling 2 Mini, otwarty model MoE o 26,4 mld parametrów, który zajmuje około 20 GB. Powtarza środkowe warstwy trzykrotnie, by lepiej rozumować przy mniejszej liczbie tokenów.

<details><summary>Cały tekst: stara redakcja</summary>

> Thinking Machines opublikowało Inkling 2 Mini z otwartymi wagami. To model Mixture-of-Experts z 26,4 mld parametrów łącznie i 3,4 mld aktywnych. Wyróżnia go architektura z pętlą: 24 warstwy podzielono na cztery bloki po sześć, a dwa środkowe przechodzą przez obliczenia trzykrotnie.
> 
> Dzięki temu model może rozumować dłużej bez zapisywania całego toku myśli. Według autorów wymaga to uwagi przy monitorowaniu przez chain of thought. Wariant ze zmienną liczbą pętli, wydany obok jako materiał badawczy, zachowywał czytelny CoT, a model nie wykazywał wyższej skłonności do sabotażu w testach agentowych.
> 
> Wagi trenowano głównie natywnie w NVFP4, a cztery ostatnie warstwy w MXFP8. Całość to około 20 GB, więc działa lokalnie. Zespół uruchomił model offline na MacBooku Pro, gdzie w kilka minut zbudował symulator lotu.
> 
> Wyniki według firmy: model prowadzi wśród otwartych modeli poniżej 100 mld parametrów na DeepSWE v1.1 (48,2%) i Vals Index v2.2 (46,5%). Prowadzi też na BrowseComp, DeepSearchQA i MCP Atlas dzięki skutecznemu użyciu wyszukiwania i narzędzi. W teście efektywności energetycznej Stanford Hazy Research na NVIDIA DGX Spark uzyskał 0,703, wobec 0,430 dla Qwen3.6-35B-A3B i 0,159 dla Gemma-4-26B-A4B.
> 
> Ograniczenia są jasno opisane. Pętla nie zwiększa pojemności wiedzy, więc wynik na AA-Omniscience jest typowy dla tej wielkości. W czacie wieloturowym i przy wielu ograniczeniach w instrukcji (MultiChallenge 50,0%, ComplexConstraints v1.1 33,4%) ustępuje Qwen3.8-27B, a na CritPt v2 i HLE-Diamond większym modelom.
> 
> Model jest dostępny w Tinker do inferencji i dostrajania. Wszystkie wyniki pochodzą od samego wydawcy.

*Dla Ciebie:* Jeśli budujesz lokalnych agentów kodujących, to kandydat do testów, zwłaszcza przy ograniczonej pamięci. Do czatu z wieloma ograniczeniami lepszy może być Qwen3.8-27B.

</details>

<details><summary>Cały tekst: nowa redakcja</summary>

> Thinking Machines opublikowało Inkling 2 Mini z otwartymi wagami. To model Mixture-of-Experts z 26,4 mld parametrów łącznie i 3,4 mld aktywnych. Wyróżnia go architektura z pętlą: 24 warstwy podzielono na cztery bloki po sześć, a dwa środkowe przechodzą przez obliczenia trzykrotnie.
> 
> Dzięki temu model może rozumować dłużej bez zapisywania całego toku myśli, co według autorów wymaga uwagi przy monitorowaniu przez chain of thought. Wariant ze zmienną liczbą pętli, wydany obok jako materiał badawczy, zachowywał czytelny CoT. Model nie wykazywał też wyższej skłonności do sabotażu w testach agentowych.
> 
> Wagi trenowano głównie natywnie w NVFP4, a cztery ostatnie warstwy w MXFP8 (to formaty zapisu liczb o niskiej precyzji, które zmniejszają model). Całość to około 20 GB, więc działa lokalnie. Zespół uruchomił go offline na MacBooku Pro, gdzie w kilka minut zbudował symulator lotu.
> 
> Według firmy model prowadzi wśród otwartych modeli poniżej 100 mld parametrów na DeepSWE v1.1 (48,2%) i Vals Index v2.2 (46,5%). Prowadzi też na BrowseComp, DeepSearchQA i MCP Atlas dzięki skutecznemu użyciu wyszukiwania i narzędzi. W teście efektywności energetycznej Stanford Hazy Research na NVIDIA DGX Spark uzyskał 0,703, wobec 0,430 dla Qwen3.6-35B-A3B i 0,159 dla Gemma-4-26B-A4B.
> 
> Pętla nie zwiększa pojemności wiedzy, więc wynik na AA-Omniscience jest typowy dla tej wielkości. W czacie wieloturowym i przy wielu ograniczeniach w instrukcji (MultiChallenge 50,0%, ComplexConstraints v1.1 33,4%) ustępuje Qwen3.8-27B. Na CritPt v2 i HLE-Diamond ustępuje większym modelom.
> 
> Model jest dostępny w Tinker do inferencji i dostrajania. Wszystkie wyniki pochodzą od samego wydawcy.

*Dla Ciebie:* Jeśli budujesz lokalnych agentów kodujących, to kandydat do testów, zwłaszcza przy ograniczonej pamięci. Do czatu z wieloma ograniczeniami lepszy może być Qwen3.8-27B.

</details>

### METR aktualizuje wykres horyzontu czasowego: modele słabsze w zadaniach wymagających osądu

| wersja | słowa | lead | słów/zdanie | zdań/akapit | max liczb w zdaniu | „czyli” | zakazane |
|---|---|---|---|---|---|---|---|
| reporter | 251 | 28 | 16.7 | 3.0 | 1 | 0 | 0 |
| stara redakcja | 247 | 28 | 15.4 | 3.2 | 1 | 0 | 0 |
| nowa redakcja | 248 | 27 | 15.5 | 2.7 | 1 | 0 | 0 |

**Lead, reporter**
> Nowy raport METR pokazuje dalszy wykładniczy wzrost w zadaniach weryfikowalnych, ale modele wciąż gorzej radzą sobie z zadaniami otwartymi. Opus 5.5 zbliża się do poprzeczki w projektowaniu ewaluacji.

**Lead, stara redakcja**
> Nowy raport METR pokazuje dalszy wykładniczy wzrost w zadaniach weryfikowalnych, ale modele wciąż gorzej radzą sobie z zadaniami otwartymi. Opus 5.5 zbliża się do poprzeczki w projektowaniu ewaluacji.

**Lead, nowa redakcja**
> METR zaktualizowało wykres horyzontu czasowego: w zadaniach weryfikowalnych modele rosną dalej wykładniczo, ale w zadaniach otwartych wypadają słabiej. Opus 5.5 zbliża się do poprzeczki w projektowaniu ewaluacji.

<details><summary>Cały tekst: stara redakcja</summary>

> METR zaktualizowało swój wykres horyzontu czasowego, który często bywał błędnie interpretowany. Modele wykonują zadania wcześniej zrobione przez ludzi, a ich wynik określa długość zadań (mierzoną czasem człowieka), które potrafią ukończyć. Dotychczasowy wykres pokazywał podwajanie tej długości mniej więcej co cztery miesiące.
> 
> W nowej wersji dodano zadania o znacznie dłuższym szacowanym czasie oraz bardziej otwarte. To ważne, bo uczenie przez wzmacnianie działa najlepiej tam, gdzie sukces da się sprawdzić automatycznie, jak w kodowaniu i matematyce. Trudniej jest przy zadaniach takich jak wybór kierunku badań, a to one są kluczowe dla automatyzacji badań nad AI.
> 
> Jak opisuje MIT Technology Review, w zadaniu projektowania nowych ewaluacji żadna z ewaluacji stworzonych przez modele nie została uznana przez pracowników METR za przydatną. Dzieje się tak mimo że najlepsze modele przewyższają większość ludzi w inżynierii oprogramowania. W ocenianiu argumentów filozoficznych modele także ustąpiły ludziom, choć pracownicy METR różnią się co do znaczenia tego zadania. Nowsze modele, np. Opus 5.5, osiągają poziom „borderline above the bar”, podczas gdy rok temu wszystkie były wyraźnie poniżej.
> 
> Eksperci cytowani w tekście są ostrożni. Sayash Kapoor ocenia, że „smak badawczy” może być wąskim gardłem, inni sądzą, że modele trenowane na zadaniach weryfikowalnych w końcu opanują otwarte. Najoung Kim zaznacza, że nie wiadomo, jak ekstrapolować obserwowaną poprawę, bo takich zadań w raporcie jest mało. OpenAI również napisało, że jego modele radzą sobie gorzej w realnych zadaniach pracowników niż w łatwiejszych, weryfikowalnych.
> 
> Tekst przypomina też niedawny, mocno zredagowany raport METR sugerujący, że AI mogło przyspieszać tempo postępu w Anthropic dwukrotnie.

*Dla Ciebie:* Wynik zgadza się z codziennym doświadczeniem: agenci świetnie kodują, ale ocena jakości i dobór kierunku nadal wymagają człowieka. Przy planowaniu automatyzacji warto zakładać ten podział.

</details>

<details><summary>Cały tekst: nowa redakcja</summary>

> METR zaktualizowało swój wykres horyzontu czasowego, który często bywał błędnie interpretowany. Modele wykonują zadania wcześniej zrobione przez ludzi, a ich wynik określa, jak długie zadania (mierzone czasem człowieka) potrafią ukończyć. Dotychczasowy wykres pokazywał podwajanie tej długości mniej więcej co cztery miesiące.
> 
> W nowej wersji dodano zadania o znacznie dłuższym szacowanym czasie oraz bardziej otwarte. To ważne, bo uczenie przez wzmacnianie działa najlepiej tam, gdzie sukces da się sprawdzić automatycznie, jak w kodowaniu i matematyce. Trudniej jest przy zadaniach takich jak wybór kierunku badań, a to one są kluczowe dla automatyzacji badań nad AI.
> 
> Jak opisuje MIT Technology Review, w zadaniu projektowania nowych ewaluacji dla METR żadna z ewaluacji stworzonych przez modele nie została uznana przez pracowników za przydatną. Dzieje się tak, mimo że najlepsze modele przewyższają większość ludzi w inżynierii oprogramowania. W ocenianiu argumentów filozoficznych modele także ustąpiły ludziom, choć pracownicy METR różnią się co do znaczenia tego zadania.
> 
> Nowsze modele, np. Opus 5.5, osiągają poziom „borderline above the bar”, podczas gdy rok temu wszystkie były wyraźnie poniżej.
> 
> Eksperci cytowani w tekście są ostrożni. Sayash Kapoor ocenia, że „smak badawczy” może być wąskim gardłem, inni sądzą, że modele trenowane na zadaniach weryfikowalnych w końcu opanują otwarte. Najoung Kim zaznacza, że nie wiadomo, jak ekstrapolować obserwowaną poprawę, bo takich zadań w raporcie jest mało. OpenAI również napisało, że jego modele radzą sobie gorzej w realnych zadaniach pracowników niż w łatwiejszych, weryfikowalnych.
> 
> Tekst przypomina też niedawny, mocno zredagowany raport METR sugerujący, że AI mogło przyspieszać tempo postępu w Anthropic dwukrotnie.

*Dla Ciebie:* Wynik zgadza się z codziennym doświadczeniem: agenci świetnie kodują, ale ocena jakości i dobór kierunku nadal wymagają człowieka. Przy planowaniu automatyzacji warto zakładać ten podział.

</details>

### Harness adapters: adapter LoRA trenowany RL podnosi Qwen3.8-27B z 39% do 55% na Terminal-Bench 2.1

| wersja | słowa | lead | słów/zdanie | zdań/akapit | max liczb w zdaniu | „czyli” | zakazane |
|---|---|---|---|---|---|---|---|
| reporter | 252 | 34 | 18.0 | 3.5 | 6 | 0 | 0 |
| stara redakcja | 247 | 34 | 16.5 | 3.0 | 6 | 0 | 0 |
| nowa redakcja | 245 | 33 | 13.6 | 3.0 | 5 | 0 | 0 |

**Lead, reporter**
> Hugging Face pokazuje przepis na dopasowanie modelu do konkretnego harnessu agentowego przez RL. Przy zamrożonych wagach Qwen3.8-27B wynik rośnie z 39% do 55% pass@1, a zużycie tokenów spada z 2,9K do 1,5K na zadanie.

**Lead, stara redakcja**
> Hugging Face pokazuje przepis na dopasowanie modelu do konkretnego harnessu agentowego przez RL. Przy zamrożonych wagach Qwen3.8-27B wynik rośnie z 39% do 55% pass@1, a zużycie tokenów spada z 2,9K do 1,5K na zadanie.

**Lead, nowa redakcja**
> Hugging Face pokazuje, jak dopasować model do konkretnego harnessu agentowego przez RL. Przy zamrożonych wagach Qwen3.8-27B wynik rośnie z 39% do 55% pass@1, a zużycie tokenów spada z 2,9K do 1,5K na zadanie.

<details><summary>Cały tekst: stara redakcja</summary>

> Hugging Face opisuje metodę, w której zamiast wymieniać model, uczy się lekki adapter LoRA pod konkretny harness i rozkład zadań. Modele są zwykle optymalizowane ogólnie, więc w parze z danym harnessem tracą część skuteczności i efektywności. Qwen3.8-27B w harnessie pi ma na Terminal-Bench 2.1 wynik 39% przy średnio 2,9K tokenów na zadanie. Po dodaniu adaptera trenowanego RL wynik to 55% pass@1 i 1,5K tokenów.
> 
> Według autorów to głównie efekt tego, że model mniej rozumuje, rzadziej woła narzędzia i częściej trafia za pierwszym razem.
> 
> Różnica wobec wielu frameworków RL: tam trenuje się reimplementację pętli agenta, tutaj harness działa dokładnie tak, jak jest dystrybuowany. Trener uczy się na tokenach zarejestrowanych przez proxy między harnessem a vLLM. Eksperyment obejmuje trzy harnessy: Pi 1.5.2, OpenCode 2.2.7 i Hermes Agent v0.22.6, z gotowymi obrazami Docker.
> 
> Dużą część wpisu zajmuje budowa zbioru zadań. Z około 59 000 zadań w formacie Harbor znalezionych na Hubie wybrano dwa źródła przeznaczone do treningu i dołożono trzecie, wygenerowane w Tasksmith (Repo2RLEnv): z 30 pull requestów powstały 24 zadania w 10 repozytoriach Pythona. Filtr odrzucał duplikaty, zadania oznaczone jako nie do treningu i 253 zadania z docelowych benchmarków. Walidację openenv validate przeszło 858 z 1127 kandydatów, a kontrole błędnych odpowiedzi wykryły m.in. weryfikator regex-log w Terminal-Bench 2.1, który akceptował złe wyniki.
> 
> GRPO porównuje próby w obrębie zadania, więc zadania zawsze rozwiązywane lub nigdy nierozwiązywane nie dają sygnału. Z 442 ocenionych zadań Qwen3.8-27B rozwiązał 151 za każdym razem i 120 nigdy, a 171 zadań utworzyło zbiór kwalifikowany do treningu.

*Dla Ciebie:* Jeśli używasz jednego harnessu na stałe, trening adaptera może obniżyć koszt tokenów i podnieść skuteczność bez zmiany bazowego modelu. Przepis jest odtwarzalny na własnych zadaniach.

</details>

<details><summary>Cały tekst: nowa redakcja</summary>

> Hugging Face opisuje metodę, w której zamiast wymieniać model, uczy się lekki adapter LoRA pod konkretny harness i rozkład zadań. Modele są zwykle optymalizowane ogólnie, więc w parze z danym harnessem tracą część skuteczności i efektywności.
> 
> Przykład z wpisu: Qwen3.8-27B w harnessie pi ma na Terminal-Bench 2.1 wynik 39% przy średnio 2,9K tokenów na zadanie. Po dodaniu adaptera trenowanego RL wynik to 55% pass@1 i 1,5K tokenów. Według autorów to głównie efekt tego, że model mniej rozumuje, rzadziej woła narzędzia i częściej trafia za pierwszym razem.
> 
> W wielu frameworkach RL trenuje się reimplementację pętli agenta. Tutaj harness działa dokładnie tak, jak jest dystrybuowany, a trener uczy się na tokenach zarejestrowanych przez proxy między harnessem a vLLM. Eksperyment obejmuje trzy harnessy: Pi 1.5.2, OpenCode 2.2.7 i Hermes Agent v0.22.6, z gotowymi obrazami Docker.
> 
> Dużą część wpisu zajmuje budowa zbioru zadań. Z około 59 000 zadań w formacie Harbor znalezionych na Hubie wybrano dwa źródła przeznaczone do treningu. Trzecie wygenerowano w Tasksmith (Repo2RLEnv): z 30 pull requestów powstały 24 zadania w 10 repozytoriach Pythona.
> 
> Filtr odrzucał duplikaty, zadania oznaczone jako nie do treningu i 253 zadania z docelowych benchmarków. Walidację openenv validate przeszło 858 z 1127 kandydatów. Kontrole błędnych odpowiedzi wykryły m.in. weryfikator regex-log w Terminal-Bench 2.1, który akceptował złe wyniki.
> 
> GRPO porównuje próby w obrębie zadania, więc zadania zawsze rozwiązywane lub nigdy nierozwiązywane nie dają sygnału. Z 442 ocenionych zadań Qwen3.8-27B rozwiązał 151 za każdym razem i 120 nigdy. Pozostałe 171 utworzyło zbiór kwalifikowany do treningu.

*Dla Ciebie:* Jeśli używasz jednego harnessu na stałe, trening adaptera może obniżyć koszt tokenów i podnieść skuteczność bez zmiany bazowego modelu. Przepis jest odtwarzalny na własnych zadaniach.

</details>

### Dwa miliony kanarków w łańcuchu dostaw AI: prompty wyciekają przez routery i hostingi

| wersja | słowa | lead | słów/zdanie | zdań/akapit | max liczb w zdaniu | „czyli” | zakazane |
|---|---|---|---|---|---|---|---|
| reporter | 261 | 26 | 17.4 | 3.0 | 0 | 0 | 0 |
| stara redakcja | 264 | 26 | 13.9 | 3.2 | 0 | 1 | 0 |
| nowa redakcja | 282 | 26 | 14.1 | 3.3 | 0 | 1 | 0 |

**Lead, reporter**
> HD Moore z Dragos wysłał prawie dwa miliony promptów z unikalnymi sekretami przez sieć usług AI. Część trafiła do atakujących, resellerów i niezgodnych z zasadami scraperów.

**Lead, stara redakcja**
> HD Moore z Dragos wysłał prawie dwa miliony promptów z unikalnymi sekretami przez sieć usług AI. Część trafiła do atakujących, resellerów i scraperów łamiących zasady usług.

**Lead, nowa redakcja**
> HD Moore z Dragos wysłał prawie dwa miliony promptów z unikalnymi sekretami przez sieć usług AI. Część trafiła do atakujących, resellerów i scraperów łamiących zasady usług.

<details><summary>Cały tekst: stara redakcja</summary>

> HD Moore, główny badacz Dragos, sprawdził, co dzieje się z wrażliwymi danymi wysyłanymi przez pośredników inferencji. Zebrał klucze AWS powiązane z pustymi kontami, hasła, unikalne adresy URL, nazwy DNS i odwołania do prywatnych repozytoriów git. Każdy sekret trafił do dokładnie jednego promptu u jednego dostawcy, a infrastrukturę odbierającą ruch kontrolował sam.
> 
> Podstawowy problem: prompty są szyfrowane w tranzycie, ale odszyfrowywane na każdym przeskoku. Router AI, jak OpenRouter lub Vercel, czyta tekst, żeby wybrać dostawcę. Dalej zapytanie może trafić do innego routera i do różnych hostingów, a każdy z nich może logować prompt tak długo, jak pozwala jego polityka.
> 
> Najpoważniejsze odkrycie to włamanie do trzech dostawców hostingu. W jednym przypadku atakujący użyli „kilkuset” kluczy AWS. Wszystkie żądania wysłane w kilku oknach czasowych pod koniec października zostały skradzione, także te odrzucone, zanim model je uruchomił. Wskazuje to na kopiowanie przy wejściu do usługi.
> 
> W dwóch pozostałych częściowo skradzione zapytania miały flagę ZDR (zero data retention, czyli obietnicę niezachowywania danych), która nie pomogła. Klucze testowano w ciągu godzin i użyto ich „dziesiątki tysięcy” razy w wywołaniach AWS. Próbowano m.in. włączyć modele w Bedrock i dodać własnych użytkowników IAM.
> 
> Część sekretów przechwycili sami resellerzy, którzy kusili niskimi cenami i włączali logowanie. Kolejny wątek to chiński lab AI, którego systemy pobierały tajne adresy URL z ponad połowy promptów wysłanych do jego modeli między lipcem a październikiem. Dotyczyło to także około dwóch trzecich żądań oznaczonych jako brak zbierania danych lub ZDR, a również amerykańskich hostingów odsprzedających te modele.
> 
> Moore uważa, że najskuteczniejsza ochrona to hostowanie modeli na własnych serwerach, co jest drogie. Alternatywą jest korzystanie bezpośrednio z dostawcy pierwszego rzędu.

*Dla Ciebie:* Jeśli kierujesz ruch przez routery lub tanich resellerów, nie wysyłaj tam kluczy, haseł ani prywatnych adresów, bo flaga ZDR nie jest gwarancją. Warto filtrować sekrety z promptów przed wysłaniem.

</details>

<details><summary>Cały tekst: nowa redakcja</summary>

> HD Moore, główny badacz Dragos, sprawdził, co dzieje się z wrażliwymi danymi wysyłanymi przez pośredników inferencji. Zebrał klucze AWS powiązane z pustymi kontami, hasła, unikalne adresy URL, nazwy DNS i odwołania do prywatnych repozytoriów git. Każdy sekret trafił do dokładnie jednego promptu u jednego dostawcy, a infrastrukturę odbierającą ruch kontrolował sam. Takie unikalne sekrety działają jak kanarki: jeśli ktoś ich użyje, wiadomo, skąd wyciekły.
> 
> Podstawowy problem polega na tym, że prompty są szyfrowane w tranzycie, ale odszyfrowywane na każdym przeskoku. Router AI, jak OpenRouter lub Vercel, czyta tekst, żeby wybrać dostawcę. Dalej zapytanie może trafić do innego routera i do różnych hostingów, a każdy z nich może je logować tak długo, jak pozwala jego polityka.
> 
> Najpoważniejsze odkrycie to włamanie do trzech dostawców hostingu. W jednym przypadku atakujący użyli „kilkuset” kluczy AWS. Skradzione zostały wszystkie żądania wysłane w kilku oknach czasowych pod koniec października, także te odrzucone, zanim model je uruchomił. Wskazuje to na kopiowanie przy wejściu do usługi.
> 
> W dwóch pozostałych przypadkach część skradzionych zapytań miała flagę ZDR (zero data retention, czyli obietnicę niezachowywania danych), która nie pomogła. Klucze testowano w ciągu godzin i użyto ich „dziesiątki tysięcy” razy w wywołaniach AWS. Próbowano m.in. włączyć modele w Bedrock i dodać własnych użytkowników IAM.
> 
> Część sekretów przechwycili sami resellerzy, którzy kusili niskimi cenami i włączali logowanie. Kolejny wątek to chiński lab AI, którego systemy pobierały tajne adresy URL z ponad połowy promptów wysłanych do jego modeli między lipcem a październikiem. Dotyczyło to także około dwóch trzecich żądań oznaczonych jako brak zbierania danych lub ZDR, a także amerykańskich hostingów odsprzedających te modele.
> 
> Moore uważa, że najskuteczniejsza ochrona to hostowanie modeli na własnych serwerach, co jest drogie. Alternatywą jest korzystanie bezpośrednio z dostawcy pierwszego rzędu.

*Dla Ciebie:* Jeśli kierujesz ruch przez routery lub tanich resellerów, nie wysyłaj tam kluczy, haseł ani prywatnych adresów, bo flaga ZDR nie jest gwarancją. Warto filtrować sekrety z promptów przed wysłaniem.

</details>

### Cursor rozważa odejście od chińskich modeli. Raport Kongresu o chińskim AI w amerykańskim stosie

| wersja | słowa | lead | słów/zdanie | zdań/akapit | max liczb w zdaniu | „czyli” | zakazane |
|---|---|---|---|---|---|---|---|
| reporter | 197 | 26 | 17.9 | 2.2 | 3 | 0 | 0 |
| stara redakcja | 206 | 26 | 14.7 | 2.8 | 2 | 1 | 0 |
| nowa redakcja | 208 | 28 | 14.9 | 2.8 | 3 | 1 | 0 |

**Lead, reporter**
> Cursor, należący do SpaceX, poinformował komisje Izby Reprezentantów, że rozważa rezygnację z chińskich modeli open-weight ze względu na ryzyko geopolityczne. Composer 2 powstał na Kimi K2.5.

**Lead, stara redakcja**
> Cursor, należący do SpaceX, poinformował komisje Izby Reprezentantów, że rozważa rezygnację z chińskich modeli open-weight ze względu na ryzyko geopolityczne. Composer 2 powstał na Kimi K2.5.

**Lead, nowa redakcja**
> Cursor, należący do SpaceX, poinformował komisje Izby Reprezentantów, że rozważa rezygnację z chińskich modeli open-weight ze względu na ryzyko geopolityczne. Jego model Composer 2 powstał na Kimi K2.5.

<details><summary>Cały tekst: stara redakcja</summary>

> Według raportu dwóch komisji Izby Reprezentantów, dotyczącego bezpieczeństwa krajowego i chińskiej rywalizacji, który CNBC poznało przed publikacją, Cursor zamierza „zbadać wycofywanie” modeli open-weight opracowanych w Chinach. SpaceX przejęło Cursora w sierpniu przy domniemanej wycenie kapitału 60 mld dolarów. Cursor zbudował model kodujący Composer 2 na Kimi K2.5 od Moonshot AI. Ani Cursor, ani SpaceX nie odpowiedziały CNBC na prośbę o komentarz.
> 
> Raport jest wynikiem wielomiesięcznego śledztwa w sprawie obecności chińskich modeli w amerykańskim stosie technologicznym. W badaniu uczestniczyły także Airbnb i DoorDash. Główne motywy adopcji to koszt, możliwość dostosowania oraz niemal czołowa wydajność. USA nie mają konkurencyjnej alternatywy open-weight w cenie i jakości, jakich oczekuje rynek.
> 
> Rekomendacje obejmują krajową amerykańską inicjatywę open-weight, łączącą publiczną moc obliczeniową, wspólną infrastrukturę ewaluacji i „zgodny z prawem dostęp” do amerykańskich modeli czołowych na potrzeby treningu. Raport postuluje też rozszerzenie październikowego zakazu DeepSeek w federalnych agencjach cywilnych na wszystkie modele opracowane w Chinach. Zakaz objąłby systemy federalne i realizację kontraktów federalnych.
> 
> Waszyngton obawia się też zdalnego dostępu chińskich firm do chipów Nvidii przez zagraniczne centra danych oraz destylacji, czyli uczenia mniejszych modeli na odpowiedziach większych. W poniedziałek BIS (amerykański urząd kontroli eksportu) ogłosił tymczasową regułę mającą zapobiegać takiemu dostępowi.
> 
> To na razie deklaracja rozważań i zalecenia komisji, a nie wiążące przepisy.

*Dla Ciebie:* Jeśli twój produkt korzysta z chińskich modeli open-weight, zwłaszcza w kontraktach z sektorem federalnym USA, warto przygotować plan zastępstwa. Ryzyko regulacyjne rośnie, choć przepisów jeszcze nie ma.

</details>

<details><summary>Cały tekst: nowa redakcja</summary>

> Według raportu dwóch komisji Izby Reprezentantów, dotyczącego bezpieczeństwa krajowego oraz chińskiej rywalizacji, Cursor zamierza „zbadać wycofywanie” modeli open-weight opracowanych w Chinach. Raport poznało przed publikacją CNBC. Cursor, który SpaceX przejęło w sierpniu przy domniemanej wycenie kapitału 60 mld dolarów, zbudował model kodujący Composer 2 na Kimi K2.5 od Moonshot AI. Ani Cursor, ani SpaceX nie odpowiedziały CNBC na prośbę o komentarz.
> 
> Raport jest wynikiem wielomiesięcznego śledztwa w sprawie obecności chińskich modeli w amerykańskim stosie technologicznym. W badaniu uczestniczyły także Airbnb i DoorDash. Główne motywy adopcji to koszt, możliwość dostosowania oraz niemal czołowa wydajność. USA nie mają konkurencyjnej alternatywy open-weight w cenie i jakości, jakich oczekuje rynek.
> 
> Rekomendacje obejmują krajową amerykańską inicjatywę open-weight, łączącą publiczną moc obliczeniową, wspólną infrastrukturę ewaluacji i „zgodny z prawem dostęp” do amerykańskich modeli czołowych na potrzeby treningu. Raport postuluje też rozszerzenie październikowego zakazu DeepSeek w federalnych agencjach cywilnych na wszystkie modele opracowane w Chinach. Zakaz miałby obejmować systemy federalne i realizację kontraktów federalnych.
> 
> Waszyngton obawia się też zdalnego dostępu chińskich firm do chipów Nvidii przez zagraniczne centra danych oraz destylacji, czyli uczenia własnego modelu na odpowiedziach cudzego. W poniedziałek BIS, amerykański urząd nadzorujący eksport technologii, ogłosił tymczasową regułę mającą zapobiegać takiemu dostępowi.
> 
> To na razie deklaracja rozważań i zalecenia komisji, a nie wiążące przepisy.

*Dla Ciebie:* Jeśli twój produkt korzysta z chińskich modeli open-weight, zwłaszcza w kontraktach z sektorem federalnym USA, warto przygotować plan zastępstwa. Ryzyko regulacyjne rośnie, choć przepisów jeszcze nie ma.

</details>

## Wydanie 2026-11-22

Bezpieczniki, wersja stara: wszystkie teksty przyjęte.
Bezpieczniki, wersja nowa: wszystkie teksty przyjęte.

### OpenRouter: incydenty z przetwarzaniem danych u dostawców inferencji

| wersja | słowa | lead | słów/zdanie | zdań/akapit | max liczb w zdaniu | „czyli” | zakazane |
|---|---|---|---|---|---|---|---|
| reporter | 363 | 25 | 15.8 | 3.8 | 1 | 1 | 0 |
| stara redakcja | 232 | 26 | 12.9 | 3.0 | 1 | 1 | 0 |
| nowa redakcja | 233 | 20 | 12.9 | 3.0 | 1 | 1 | 0 |

**Lead, reporter**
> OpenRouter opisał ustalenia badaczy bezpieczeństwa: u części dostawców inferencji dane zostały naruszone albo nie były chronione zgodnie z deklarowanymi politykami. Sam OpenRouter nie został włamany.

**Lead, stara redakcja**
> OpenRouter odpowiada na ustalenia badaczy bezpieczeństwa: u części dostawców inferencji dane zostały naruszone albo nie były chronione zgodnie z deklarowanymi politykami. Sam OpenRouter nie został włamany.

**Lead, nowa redakcja**
> OpenRouter poinformował w niedzielę, że badacze bezpieczeństwa znaleźli problemy z danymi u części dostawców inferencji. Sam OpenRouter nie został włamany.

<details><summary>Cały tekst: stara redakcja</summary>

> W niedzielę OpenRouter opublikował komunikat o ustaleniach badaczy bezpieczeństwa z minionego tygodnia. Badacze zgłosili, że u niektórych dostawców inferencji dane zostały naruszone albo polityki dotyczące danych nie były przestrzegane. OpenRouter pracował z badaczami i z samymi dostawcami, żeby zrozumieć wyniki i skłonić ich do naprawy problemów.
> 
> Według firmy testy nie wykazały żadnego włamania ani nieautoryzowanego dostępu do samego OpenRoutera. Problemy dotyczą konkretnych dostawców inferencji, czyli firm, które faktycznie uruchamiają modele za agregatorem. Aktualną listę komunikatów bezpieczeństwa od dostawców OpenRouter prowadzi na swojej stronie.
> 
> Firma podziękowała za raport firmie Dragos. Zapowiada, że włączy podobne techniki testowania do własnych procesów i podniesie poprzeczkę dla dostawców, którzy chcą być na OpenRouter. Nie podała kryteriów ani terminów, więc na razie to deklaracja.
> 
> Nie wszyscy dotknięci dostawcy opublikowali własne komunikaty. OpenRouter powiadomił jednak dotkniętych użytkowników niezależnie od tego, czy publiczny wpis istnieje. Firma zachęca dostawców do opisania incydentów i obiecuje aktualizować listę.
> 
> Wśród nagłówków dnia jest wpis Together.ai o wycieku promptów w żądaniach w czerwcu i lipcu 2026, który wygląda na część tej samej serii zdarzeń. Nie wiadomo jeszcze, którzy dostawcy zostali dotknięci, jakie dane wyciekły ani na jaką skalę. Odpowiedzi może przynieść żywa lista komunikatów.
> 
> To kolejny odcinek historii o promptach wyciekających przez routery i hosting w łańcuchu dostaw AI. Deklaracja o niezatrzymywaniu danych to dopiero obietnica, a sprawdzają ją niezależne testy. Dla zespołów korzystających z agregatorów polityka danych dostawcy końcowego jest realnym elementem modelu zagrożeń.

*Dla Ciebie:* Sprawdź na liście OpenRouter, czy dostawcy, przez których kierujesz ruch, opublikowali komunikaty. Rozważ ograniczenie routingu do wybranych dostawców i przejrzyj, jakie dane trafiają w promptach.

</details>

<details><summary>Cały tekst: nowa redakcja</summary>

> W niedzielę OpenRouter opublikował komunikat o ustaleniach badaczy z minionego tygodnia. Według firmy zgłosili oni, że u niektórych dostawców inferencji dane zostały naruszone albo polityki dotyczące danych nie były przestrzegane. OpenRouter pracował z badaczami i z dostawcami, żeby zrozumieć wyniki i nakłonić ich do naprawy problemów.
> 
> Według OpenRoutera testy nie wykazały włamania ani nieautoryzowanego dostępu do niego samego. Problem dotyczy dostawców inferencji, czyli firm, które faktycznie uruchamiają modele za agregatorem. Firma prowadzi na swojej stronie listę komunikatów bezpieczeństwa otrzymanych od dostawców.
> 
> OpenRouter podziękował za raport firmie Dragos. Zapowiada, że włączy podobne techniki testowania do własnych procesów i podniesie poprzeczkę, którą będą musieli spełnić dostawcy chcący być na platformie. Nie podał kryteriów ani terminów, więc na razie to deklaracja.
> 
> Nie wszyscy dotknięci dostawcy opublikowali własne komunikaty, ale OpenRouter powiadomił dotkniętych użytkowników niezależnie od tego. Firma zachęca dostawców do opisania incydentów i obiecuje aktualizować listę. Wśród nagłówków dnia jest też wpis Together.ai o wycieku promptów w żądaniach w czerwcu i lipcu 2026, który wygląda na część tej samej serii zdarzeń.
> 
> Nie wiadomo, którzy dostawcy zostali dotknięci, jakie dane wyciekły ani na jaką skalę. Szczegóły działań podjętych przez OpenRouter też nie są znane. Warto sprawdzić żywą listę komunikatów.
> 
> Podobny wątek opisywaliśmy kilka dni temu, gdy prompty wyciekały przez routery i hosting w łańcuchu dostaw AI. Deklaracja o niezatrzymywaniu danych to obietnica, którą weryfikują dopiero niezależne testy. Polityka danych dostawcy końcowego jest więc realnym elementem modelu zagrożeń.

*Dla Ciebie:* Sprawdź na liście OpenRouter, czy dostawcy, przez których kierujesz ruch, opublikowali komunikaty. Rozważ ograniczenie routingu do wybranych dostawców i przejrzyj, jakie dane trafiają w promptach.

</details>

### Lean potwierdza dowód hipotezy Riemanna: 17 milionów linii kodu

| wersja | słowa | lead | słów/zdanie | zdań/akapit | max liczb w zdaniu | „czyli” | zakazane |
|---|---|---|---|---|---|---|---|
| reporter | 231 | 23 | 15.4 | 3.8 | 3 | 1 | 0 |
| stara redakcja | 178 | 22 | 13.7 | 3.3 | 3 | 1 | 0 |
| nowa redakcja | 158 | 21 | 14.4 | 2.8 | 3 | 1 | 0 |

**Lead, reporter**
> Społeczności Lean i Mathlib oficjalnie poświadczyły poprawność dowodu hipotezy Riemanna autorstwa Leventa Alpöge'a. Dowód ma postać biblioteki Lean liczącej 17 milionów linii kodu.

**Lead, stara redakcja**
> Społeczności Lean i Mathlib poświadczyły poprawność dowodu hipotezy Riemanna autorstwa Leventa Alpöge'a. Dowód ma postać biblioteki Lean liczącej 17 milionów linii kodu.

**Lead, nowa redakcja**
> Społeczności Lean i Mathlib poświadczyły poprawność dowodu hipotezy Riemanna autorstwa Leventa Alpöge'a. Dowód to biblioteka Lean licząca 17 milionów linii kodu.

<details><summary>Cały tekst: stara redakcja</summary>

> Kiedy pracowałeś, pojawiło się oficjalne potwierdzenie, które domyka wątek z ostatnich dni. 20 listopada 2026 roku Levent Alpöge opublikował dowód hipotezy Riemanna jako bibliotekę Lean liczącą 17 milionów linii kodu. We wspólnym oświadczeniu społeczności Lean i Mathlib, poparte przez Lean FRO i Mathlib Initiative, napisano, że mają pełne przekonanie o poprawności dowodu.
> 
> Kod zależy bezpośrednio wyłącznie od Mathlib, czyli głównej biblioteki matematycznej dla Lean. Przez ostatnią dobę społeczności weryfikowały dowód i poświadczyły, że poprawne są zarówno sformułowanie twierdzenia, jak i sam dowód. Według oświadczenia spełnione są wszystkie cztery kryteria z wpisu projektu Xena o sprawdzaniu dowodu w Lean. Autorzy dziękują osobom, które udostępniły zasoby potrzebne do weryfikacji.
> 
> To wynik sprawdzony maszynowo, a nie tylko zrecenzowany przez ludzi. Wcześniejsze doniesienia o dowodzie z udziałem Claude'a trudno było ocenić z zewnątrz, a kompilator Lean sprawdza każdy krok. Oświadczenie nie mówi, jakich narzędzi, w tym AI, użyto przy tworzeniu dowodu.
> 
> Społeczność zapowiada teraz pracę nad wyjaśnieniem nowych idei zawartych w dowodzie. Przy 17 milionach linii zrozumienie struktury argumentu będzie osobnym, długim zadaniem. Warto śledzić, czy powstaną krótsze, czytelne wersje kluczowych kroków.

*Dla Ciebie:* To praktyczny dowód, że formalna weryfikacja w Lean skaluje się do ogromnych baz kodu, co interesuje każdego, kto myśli o sprawdzaniu kodu generowanego maszynowo.

</details>

<details><summary>Cały tekst: nowa redakcja</summary>

> 20 listopada 2026 roku Levent Alpöge opublikował dowód hipotezy Riemanna jako bibliotekę Lean liczącą 17 milionów linii kodu. We wspólnym oświadczeniu społeczności Lean i Mathlib, poparte przez Lean FRO i Mathlib Initiative, napisano, że mają pełne przekonanie o poprawności dowodu.
> 
> Kod zależy bezpośrednio wyłącznie od Mathlib, czyli głównej biblioteki matematycznej dla Lean. Przez ostatnią dobę społeczności weryfikowały dowód i poświadczyły, że poprawne są zarówno sformułowanie twierdzenia, jak i sam dowód. Według oświadczenia spełnione są wszystkie cztery kryteria opisane we wpisie projektu Xena o sprawdzaniu dowodów w Lean.
> 
> To wynik sprawdzony maszynowo, a nie tylko zrecenzowany przez ludzi: kompilator Lean sprawdza każdy krok. Wcześniej pojawiały się doniesienia o dowodzie z udziałem Claude'a, trudne do oceny z zewnątrz. Oświadczenie nie mówi, jakich narzędzi, w tym AI, użyto przy tworzeniu dowodu.
> 
> Społeczność zapowiada teraz pracę nad wyjaśnieniem nowych idei zawartych w dowodzie. Przy takiej objętości zrozumienie struktury argumentu będzie długim zadaniem. Warto śledzić, czy matematycy przygotują krótsze, czytelne wersje kluczowych kroków.

*Dla Ciebie:* To praktyczny przykład, że formalna weryfikacja w Lean skaluje się do ogromnych baz kodu, co interesuje każdego, kto myśli o sprawdzaniu kodu generowanego maszynowo.

</details>

### Upload2Shell: luka w Ghostscripcie otwiera RCE w Google, WordPressie i Debianie

| wersja | słowa | lead | słów/zdanie | zdań/akapit | max liczb w zdaniu | „czyli” | zakazane |
|---|---|---|---|---|---|---|---|
| reporter | 207 | 22 | 17.3 | 3.0 | 8 | 1 | 0 |
| stara redakcja | 202 | 21 | 16.8 | 3.0 | 8 | 0 | 0 |
| nowa redakcja | 206 | 25 | 15.8 | 2.2 | 8 | 1 | 0 |

**Lead, reporter**
> Badacze z pwn.ai opisali CVE-2026-125396, błąd use-after-free w Ghostscripcie, który pozwala wyjść z piaskownicy -dSAFER. Poprawki są dostępne w upstreamie i dystrybucjach.

**Lead, stara redakcja**
> Badacze z pwn.ai opisali CVE-2026-125396, błąd w Ghostscripcie, który pozwala wyjść z piaskownicy -dSAFER. Poprawki są już w upstreamie i dystrybucjach.

**Lead, nowa redakcja**
> Badacze z pwn.ai opisali CVE-2026-125396, błąd w Ghostscripcie, który pozwala wyjść z piaskownicy -dSAFER i uruchomić własne polecenia. Poprawki są już w projekcie i dystrybucjach.

<details><summary>Cały tekst: stara redakcja</summary>

> Zespół pwn.ai opublikował opis Upload2Shell: błędu use-after-free (użycia pamięci po jej zwolnieniu) w module ładowania fontów Type 1 w Ghostscripcie. Spreparowany dokument może wyjść z piaskownicy -dSAFER, zmienić natywne kontrolki ścieżek i wykonać polecenia atakującego z uprawnieniami procesu renderującego.
> 
> Ghostscript działa pod spodem wielu przepływów drukowania, poczty, uploadu i podglądu. Wcześniejsze badania zespołu nad ImageMagickiem pokazały, że pliki nazwane .png lub .jpg nadal mogą trafić do Ghostscripta podczas konwersji obrazów. Badacze potwierdzili trasy ataku m.in. w rendererze dokumentów Google, w uploadzie WordPress Core (dla użytkowników Author+ oraz Contributorów z uprawnieniem upload_files), we wtyczkach z publicznymi polami uploadu, w IPP w Debianie (zdalne wykonanie jako lp), w miniaturach załączników Roundcube oraz w Plesk Obsidian i MediaWiki z PdfHandler. Autorzy piszą też o Boksie, Dropboxie i Zoomie, ale szczegóły części przypadków mają dopiero się pojawić.
> 
> Błąd zgłoszono upstream jako Artifex Bug 709684, a Ghostscript 10.08.0 go naprawia. Debian wydał wersję 10.05.1~dfsg-1+deb13u3, a Ubuntu opublikowało pakiety dla siedmiu wydań 21 października 2026 (USN-8949-1). WordPress naprawił ścieżkę uploadu jako CVE-2026-65640, a Roundcube ograniczył niebezpieczne typy obrazów przed konwersją przez ImageMagick (CVE-2026-114727). Google naprawił swoją ścieżkę przed publikacją.
> 
> Badacze zapowiadają kolejne wyniki, bo inny filtr wydruku, generator miniatur lub podgląd dokumentu może być następną drogą do interpretera.

*Dla Ciebie:* Jeśli Twoja aplikacja przetwarza pliki użytkowników przez ImageMagick lub Ghostscript, zaktualizuj Ghostscripta do wersji z poprawką i ogranicz typy plików dopuszczane do konwersji.

</details>

<details><summary>Cały tekst: nowa redakcja</summary>

> Zespół pwn.ai opublikował opis Upload2Shell, czyli use-after-free (program sięga po pamięć, którą już oddał) w module ładowania fontów Type 1 w Ghostscripcie. Spreparowany dokument może wyjść poza piaskownicę -dSAFER, zmienić natywne kontrolki ścieżek i wykonać polecenia atakującego z uprawnieniami procesu renderującego.
> 
> Ghostscript działa pod spodem wielu przepływów drukowania, poczty, uploadu i podglądu. Wcześniejsze badania zespołu nad ImageMagickiem pokazały, że pliki nazwane .png lub .jpg nadal mogą trafić do Ghostscripta podczas konwersji obrazów.
> 
> Badacze potwierdzili trasy ataku m.in. w rendererze dokumentów Google, w uploadzie WordPress Core (dla użytkowników Author+ oraz Contributorów z uprawnieniem upload_files) i we wtyczkach z publicznymi polami uploadu. Dotyczy to też IPP w Debianie (zdalne wykonanie jako lp), miniatur załączników Roundcube oraz Plesk Obsidian i MediaWiki z PdfHandler. Autorzy piszą też o Boksie, Dropboxie i Zoomie, ale szczegóły części przypadków pojawią się osobno.
> 
> Błąd zgłoszono upstream jako Artifex Bug 709684, a Ghostscript 10.08.0 go naprawia. Debian wydał wersję 10.05.1~dfsg-1+deb13u3 oznaczoną jako naprawioną, a Ubuntu opublikowało pakiety dla siedmiu wydań 21 października 2026 (USN-8949-1).
> 
> WordPress naprawił ścieżkę uploadu jako CVE-2026-65640, a Roundcube ograniczył niebezpieczne typy obrazów przed konwersją przez ImageMagick (CVE-2026-114727). Google naprawił ścieżkę przed publikacją.
> 
> Badacze zapowiadają kolejne wyniki, bo inny filtr wydruku, generator miniatur lub podgląd dokumentu może być następną drogą do interpretera.

*Dla Ciebie:* Jeśli Twoja aplikacja przetwarza pliki użytkowników przez ImageMagick lub Ghostscript, zaktualizuj Ghostscripta do wersji z poprawką i ogranicz typy plików dopuszczane do konwersji.

</details>

### GPGME 2.3.1: krytyczny double free, wystarczy spreparowany klucz OpenPGP

| wersja | słowa | lead | słów/zdanie | zdań/akapit | max liczb w zdaniu | „czyli” | zakazane |
|---|---|---|---|---|---|---|---|
| reporter | 239 | 23 | 13.3 | 4.5 | 3 | 0 | 0 |
| stara redakcja | 238 | 23 | 14.9 | 4.0 | 3 | 1 | 0 |
| nowa redakcja | 242 | 23 | 14.2 | 2.8 | 3 | 1 | 0 |

**Lead, reporter**
> Projekt GnuPG wydał GPGME 2.3.1 z poprawką krytycznego błędu double free (CVE-2026-129975). Wykonanie zdalnego kodu nie jest wykluczone, więc zalecana jest natychmiastowa aktualizacja.

**Lead, stara redakcja**
> Projekt GnuPG wydał GPGME 2.3.1 z poprawką krytycznego błędu double free (CVE-2026-129975). Zdalnego wykonania kodu nie można wykluczyć, więc warto zaktualizować od razu.

**Lead, nowa redakcja**
> Projekt GnuPG wydał GPGME 2.3.1 z poprawką krytycznego błędu double free (CVE-2026-129975). Zdalne wykonanie kodu nie jest wykluczone, więc zalecana jest natychmiastowa aktualizacja.

<details><summary>Cały tekst: stara redakcja</summary>

> Werner Koch ogłosił GPGME 2.3.1, który naprawia krytyczny błąd obecny we wszystkich wcześniejszych wersjach. Wystarczy klucz OpenPGP ze spreparowanym, bardzo długim identyfikatorem użytkownika, by wywołać podwójne zwolnienie pamięci (double free). Według ogłoszenia można tak wykradać dane z aplikacji, na przykład przez wysłanie podpisanych danych, a ataku RCE, czyli zdalnego uruchomienia cudzego kodu, nie da się wykluczyć.
> 
> Przyczyna leży w dwóch wewnętrznych funkcjach GPGME czytających linie statusu i listy kluczy z gpg. Najpierw alokowany jest bufor 1024 bajtów, w razie potrzeby realokowany. Wskaźnik do nowego bufora trafia z powrotem do obiektu kontekstu dopiero na końcu funkcji. Jeśli funkcja skończy się wcześniej, na przykład przez błąd odczytu, kontekst zachowuje nieaktualny wskaźnik, a pamięć jest zwalniana drugi raz przy zwalnianiu kontekstu. Dzięki innym alokacjom pomiędzy standardowe zabezpieczenia alokatorów mogą tego nie wykryć.
> 
> Podatne jest całe oprogramowanie używające GPGME w wersji wcześniejszej niż 2.3.0, jako biblioteka współdzielona, DLL lub linkowane statycznie. Wśród przykładów są Gpg4win, GnuPG Desktop, większość klientów poczty, wiele klientów XMPP, Samba i Flatpak. Błąd odkrył Johan Carlsson, a GitLab poinformował GnuPG 12 listopada. Ujawnienie planowano na 25 listopada, ale przyspieszono je do 20 listopada, bo GitLab musiał wcześniej wydać aktualizację z powodu innego błędu, Ruby2Shell.
> 
> Zaktualizuj bibliotekę do 2.3.1, a binaria linkowane statycznie przebuduj. Jeśli aktualizacja jest niemożliwa, jest łatka, która według autorów prawdopodobnie nakłada się czysto nawet na bardzo stare wersje. Wersja 2.3.0 nie była publicznie dostępna. Wydano też Gpg4win 5.1.2 i dodano stałe GPGME_PK_MLKEM, GPGME_PK_MLDSA i GPGME_PK_DLTHM.

*Dla Ciebie:* Sprawdź, czy Twoje obrazy kontenerów i aplikacje wiążą GPGME statycznie lub dynamicznie, i zaktualizuj do 2.3.1 albo zastosuj łatkę.

</details>

<details><summary>Cały tekst: nowa redakcja</summary>

> Werner Koch ogłosił GPGME 2.3.1, które naprawia krytyczny błąd obecny we wszystkich wcześniejszych wersjach. Wystarczy klucz OpenPGP ze spreparowanym, bardzo długim identyfikatorem użytkownika, by wywołać double free, czyli zwolnienie tej samej pamięci dwa razy. Według ogłoszenia można w ten sposób wykradać dane z aplikacji, na przykład przez wysłanie podpisanych danych, a ataku RCE (zdalnego uruchomienia kodu) nie da się wykluczyć.
> 
> Przyczyna leży w dwóch wewnętrznych funkcjach GPGME czytających linie statusu i listy kluczy z gpg. Najpierw alokowany jest bufor 1024 bajtów, który w razie potrzeby jest realokowany. Wskaźnik do nowego bufora trafia z powrotem do obiektu kontekstu dopiero na końcu funkcji.
> 
> Jeśli funkcja skończy się wcześniej, na przykład przez błąd odczytu, kontekst zachowuje nieaktualny wskaźnik. Pamięć jest wtedy zwalniana drugi raz przy zwalnianiu kontekstu. Przez inne alokacje pomiędzy standardowe zabezpieczenia alokatorów mogą tego nie wykryć.
> 
> Podatne jest oprogramowanie korzystające z GPGME w wersji wcześniejszej niż 2.3.0, jako biblioteka współdzielona, DLL lub linkowane statycznie. Wśród przykładów podano Gpg4win, GnuPG Desktop, większość klientów poczty, wiele klientów XMPP, Sambę i Flatpak.
> 
> Błąd odkrył Johan Carlsson, a GitLab poinformował GnuPG 12 listopada. Ujawnienie planowane na 25 listopada przyspieszono do 20 listopada, bo GitLab musiał wcześniej wydać aktualizację z powodu innego błędu, Ruby2Shell.
> 
> Zaktualizuj bibliotekę do 2.3.1, a binaria linkowane statycznie przebuduj. Jeśli aktualizacja jest niemożliwa, jest łatka, która według autorów prawdopodobnie nakłada się czysto nawet na bardzo stare wersje. Wersja 2.3.0 nie była publicznie dostępna. Wydano też Gpg4win 5.1.2 i dodano stałe GPGME_PK_MLKEM, GPGME_PK_MLDSA i GPGME_PK_DLTHM.

*Dla Ciebie:* Sprawdź, czy Twoje obrazy kontenerów i aplikacje wiążą GPGME statycznie lub dynamicznie, i zaktualizuj do 2.3.1 albo zastosuj łatkę.

</details>

### Muru: Graham Dumpleton buduje serwer Pythona w Rust z pomocą AI

| wersja | słowa | lead | słów/zdanie | zdań/akapit | max liczb w zdaniu | „czyli” | zakazane |
|---|---|---|---|---|---|---|---|
| reporter | 200 | 21 | 22.2 | 2.3 | 1 | 0 | 0 |
| stara redakcja | 181 | 22 | 16.5 | 2.8 | 1 | 0 | 0 |
| nowa redakcja | 178 | 24 | 19.8 | 2.3 | 1 | 0 | 0 |

**Lead, reporter**
> Autor mod_wsgi pracuje nad Muru, serwerem w Rust dla aplikacji ASGI i WSGI, tworzonym z udziałem AI. Szczegółowo dokumentuje cały proces.

**Lead, stara redakcja**
> Graham Dumpleton, autor mod_wsgi, buduje z pomocą AI Muru, serwer w Rust dla aplikacji ASGI i WSGI. Proces pracy opisuje bardzo szczegółowo.

**Lead, nowa redakcja**
> Graham Dumpleton, autor mod_wsgi, buduje z pomocą AI Muru, serwer w Rust dla aplikacji ASGI i WSGI. Proces opisuje na bieżąco i bardzo szczegółowo.

<details><summary>Cały tekst: stara redakcja</summary>

> Simon Willison poleca Muru, projekt Grahama Dumpletona, który 20 lat temu zapoczątkował mod_wsgi i od tamtej pory szuka idealnego sposobu serwowania aplikacji webowych w Pythonie na produkcji. Muru to jego nowy serwer napisany w Rust z pomocą AI. Ma dostarczać jak najlepsze narzędzia do uruchamiania aplikacji ASGI i WSGI w trakcie developmentu i na produkcji.
> 
> Ciekawy jest sposób pracy. Podobnie jak przy wcześniejszym projekcie wrapture, Dumpleton na bieżąco publikuje bardzo szczegółowy opis projektu. Willison zebrał wszystko z ostatnich trzech tygodni i szczególnie poleca wpis o AI jako wyborze stylu pracy.
> 
> W cytowanym fragmencie autor pisze, że AI może wykonać dużą część pracy na powierzchni, ale decyzja, co jeszcze nie jest wystarczająco dobre, należy do niego. Dwadzieścia lat błędów przy mod_wsgi okazuje się tu przydatne. Zapowiada, że będzie dopracowywał Muru, aż stanie się czymś, czemu sam zaufa, i czemu zaufają inni.
> 
> To wpis linkujący i opinia, nie ogłoszenie wydania, więc nie ma benchmarków ani informacji o gotowości do produkcji. Wartość leży w dokumentacji procesu: doświadczony inżynier pokazuje, jak wygląda praca z AI przy projekcie systemowym, gdzie ocena jakości zostaje po stronie człowieka.

*Dla Ciebie:* Jeśli uruchamiasz aplikacje ASGI lub WSGI, obserwuj Muru. Dzienniki pracy Dumpletona to dobry materiał o rozsądnym używaniu AI w projekcie systemowym.

</details>

<details><summary>Cały tekst: nowa redakcja</summary>

> Simon Willison poleca Muru, projekt Grahama Dumpletona, który 20 lat temu zapoczątkował mod_wsgi i od tamtej pory szuka idealnego sposobu serwowania aplikacji webowych w Pythonie na produkcji. Muru to jego nowy serwer w Rust, pisany z pomocą AI, który ma być jak najlepszym narzędziem do uruchamiania aplikacji ASGI i WSGI w developmencie i na produkcji.
> 
> Podobnie jak przy wcześniejszym projekcie wrapture, Dumpleton na bieżąco publikuje bardzo szczegółowy opis prac. Willison zebrał wpisy z ostatnich trzech tygodni i szczególnie poleca ten o AI jako wyborze stylu pracy.
> 
> W cytowanym fragmencie Dumpleton pisze, że AI może wykonać dużą część pracy na powierzchni, ale decyzja, co jeszcze nie jest wystarczająco dobre, należy do niego. Pomaga w tym dwadzieścia lat błędów przy mod_wsgi. Zapowiada, że będzie dopracowywał Muru, aż stanie się czymś, czemu sam zaufa, i czemu zaufają inni.
> 
> To wpis linkujący i opinia, a nie ogłoszenie wydania, więc nie ma w nim benchmarków ani informacji o gotowości do produkcji. Wartość leży w dokumentacji procesu: doświadczony inżynier pokazuje pracę z AI przy projekcie systemowym, w którym ocena jakości zostaje po stronie człowieka.

*Dla Ciebie:* Jeśli uruchamiasz aplikacje ASGI lub WSGI, warto obserwować Muru, a dzienniki pracy Dumpletona są dobrym materiałem o rozsądnym używaniu AI w projekcie systemowym.

</details>

### ONZ bez porozumienia w sprawie „zabójczych robotów”: dwa lata na propozycje

| wersja | słowa | lead | słów/zdanie | zdań/akapit | max liczb w zdaniu | „czyli” | zakazane |
|---|---|---|---|---|---|---|---|
| reporter | 175 | 26 | 15.9 | 2.8 | 0 | 0 | 0 |
| stara redakcja | 166 | 28 | 15.1 | 2.8 | 0 | 0 | 0 |
| nowa redakcja | 168 | 28 | 15.3 | 2.8 | 0 | 0 | 0 |

**Lead, reporter**
> Po tygodniu negocjacji w Genewie państwa zgodziły się jedynie „zacząć dyskutować opcje” dotyczące autonomicznej broni. Na propozycje przepisów dano dwa lata, a część może pozostać opcjonalna.

**Lead, stara redakcja**
> Po tygodniu negocjacji w Genewie państwa zgodziły się jedynie „rozpoczęcie dyskusji o opcjach” dotyczących autonomicznej broni. Na propozycje przepisów dano dwa lata, a część regulacji może pozostać opcjonalna.

**Lead, nowa redakcja**
> Po tygodniu rozmów w Genewie państwa uzgodniły tylko „rozpoczęcie dyskusji o opcjach” w sprawie autonomicznej broni. Na propozycje przepisów dano dwa lata, a część regulacji może pozostać opcjonalna.

<details><summary>Cały tekst: stara redakcja</summary>

> Na tygodniowym spotkaniu dyplomatów ONZ w Genewie jednym z tematów były zasady użycia autonomicznej broni. Według The Verge przedstawiciele rozjechali się po w dużej mierze bezowocnych rozmowach, uzgadniając jedynie „rozpoczęcie dyskusji o opcjach”.
> 
> Przed negocjacjami Międzynarodowy Komitet Czerwonego Krzyża uznał za pilne przygotowanie prawnie wiążących reguł w ciągu roku. Apel poparli sekretarz generalny ONZ i papież Leon. Kompromis daje jednak dwa lata na zgłaszanie propozycji. Negocjacje o treści i egzekwowaniu przepisów prawdopodobnie potrwają znacznie dłużej, a część przyszłych regulacji może być opcjonalna.
> 
> Organizacje humanitarne i część państw wskazują na pilność, bo półautonomiczna broń i drony odpowiadają za znaczną liczbę ofiar cywilnych w konfliktach, w tym w Ukrainie, Gazie i Sudanie. Według cytowanego NPR głównymi przeszkodami były Rosja, Izrael i USA. Pierwszego dnia Rosja opóźniła obrady, sprzeciwiając się agendzie, a USA zaproponowały pięcioletnie okno na dyskusję o niewiążących, opcjonalnych wytycznych.
> 
> Dla branży AI to sygnał, że w najbliższym czasie nie powstanie wiążący międzynarodowy reżim dla autonomicznych systemów uzbrojenia. O konkretnych skutkach dla dostawców modeli nic nie wiadomo.

*Dla Ciebie:* Wiążących reguł ONZ nie będzie szybko, więc zasady użycia modeli w zastosowaniach wojskowych wyznaczą na razie głównie polityki firm i prawo krajowe.

</details>

<details><summary>Cały tekst: nowa redakcja</summary>

> Dyplomaci ONZ rozmawiali w Genewie przez tydzień, a jednym z tematów były zasady użycia autonomicznej broni. Według The Verge rozjechali się po w dużej mierze bezowocnych rozmowach, uzgadniając jedynie „rozpoczęcie dyskusji o opcjach”.
> 
> Przed negocjacjami Międzynarodowy Komitet Czerwonego Krzyża uznał za pilne przygotowanie prawnie wiążących reguł w ciągu roku. Apel poparli sekretarz generalny ONZ i papież Leon. Kompromis daje jednak dwa lata na zgłaszanie propozycji, a negocjacje o treści i egzekwowaniu przepisów prawdopodobnie potrwają znacznie dłużej. Pozostawiono też miejsce na to, by część przyszłych regulacji była opcjonalna.
> 
> Organizacje humanitarne i część państw wskazują na pilność, bo półautonomiczna broń i drony odpowiadają za znaczną liczbę ofiar cywilnych, w tym w Ukrainie, Gazie i Sudanie. Zgodnie z cytowanym NPR głównymi przeszkodami były Rosja, Izrael i USA. Pierwszego dnia Rosja opóźniła obrady, sprzeciwiając się agendzie, a USA zaproponowały pięcioletnie okno na dyskusję o niewiążących, opcjonalnych wytycznych.
> 
> Dla branży AI to sygnał, że w najbliższym czasie nie powstanie wiążący międzynarodowy reżim dla autonomicznych systemów uzbrojenia. Skutki dla dostawców modeli nie są znane.

*Dla Ciebie:* Wiążących reguł na poziomie ONZ nie będzie szybko, więc zasady użycia modeli w zastosowaniach wojskowych w najbliższym czasie wyznaczą głównie polityki firm i prawo krajowe.

</details>
