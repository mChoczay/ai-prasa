# Poranna prasa AI – słowniczek pojęć (krótki projekt)

Data: 2026-11-20. Status: zaakceptowany przez właściciela w rozmowie („tak”).

**Po co.** Właściciel ocenił artykuł o eksporcie chipów do Chin jako „mniej takich” i dopisał: „nawet nie wiem co to są te czipy H200 i dlaczego są takie ważne … warto otwierać im wizytówki, tam w 3–4 zdaniach na chłopski rozum tłumaczyć co to jest”.

## Cele

**Strona**
- Pod artykułem, obok „Może dotyczyć: …”, jest linijka `Pojęcia: H200 · eksport chipów`.
- Stuknięcie w pojęcie otwiera ten sam arkusz co karta firmy: nazwa pojęcia i 3–4 zdania prostym językiem (co to jest i dlaczego ma znaczenie w tym temacie).

**Gazeta (etap `PPAI · profiles`, po `Finish edition`)**
- Jedno wywołanie Haiku na całe wydanie wybiera 1–3 trudne pojęcia na artykuł (czołówka i artykuły) i pisze do nich wyjaśnienia.
  - Pomija pojęcia oczywiste dla programisty AI (AI, model, LLM, API, firma) oraz nazwy firm i modeli, które mają już karty.
  - Pojęcie znane z tabeli słowniczka dostaje tylko odwołanie, bez ponownego pisania.
  - Uwagi czytelnika z ostatnich 30 dni (to samo podsumowanie, które dostaje redakcja) idą do promptu jako podpowiedź, czego czytelnik nie rozumie.
- Nowe pojęcia zapisują się w tabeli n8n `glossary_terms` (`term_id`, `term`, `explain`, `first_date`).
- Każdy artykuł dostaje `terms: [term_id, …]`.
- Publikacja zapisuje `site/data/glossary.json` (`{ terms: [{ id, term, explain }] }`) obok `profiles.json`.

## Nie-cele

- podświetlanie słów w treści artykułu;
- słowniczek w mailu;
- osobna strona słowniczka;
- pojęcia w plotkach i dodatkach.

## Anty-cele

- dłuższy krok pisania artykułów (Sonnet) – słowniczek nie dokłada niczego do tego etapu;
- więcej niż jedno dodatkowe wywołanie Claude dziennie;
- błąd słowniczka zatrzymujący wydanie: przy błędzie wydanie idzie bez pojęć.

## Ograniczenia

- Obecne zasady projektu: zero zależności, commity od właściciela, push za zgodą, 180 s na etap, bez `URL` w sandboksie.
- Koszt około 0,005 USD dziennie (Haiku).

## Podejścia (wybór)

- **Haiku w etapie kart, z pamięcią w tabeli (wybrane).** Tanie, nie wydłuża pisania, a pojęcia się kumulują.
- Sonnet dopisuje pojęcia przy pisaniu artykułów. Odrzucone: wydłuża najdłuższy krok (do 92 z 180 s).

## Moje decyzje (sprawdź przy czytaniu)

- Najwyżej 3 pojęcia na artykuł i najwyżej 12 na wydanie.
- Wyjaśnienie ma najwyżej 600 znaków.
- `term_id` to slug nazwy (ta sama funkcja co dla firm: `entityId`). To samo pojęcie z innego dnia wskazuje na istniejący wpis.
- Linijka „Pojęcia” jest pod „Może dotyczyć”. Pojęcie bez wpisu w `glossary.json` nie jest pokazywane.
