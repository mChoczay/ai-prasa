# AI News TikTok – projekt pipeline'u w n8n

Data: 2026-11-18 · Status: **odłożone** – na razie realizujemy `2026-11-18-ai-news-digest-design.md` (dashboard + mail). Ten dokument zostaje jako materiał na fazę wideo/TikTok.

## 1. Po co to jest

Newsy ze świata AI (giełda, nowe modele, rankingi, przecieki) pojawiają się szybciej, niż da się je śledzić. Pipeline ma 2–3 razy dziennie wybierać najważniejszy temat, robić z niego krótki film (lektor + grafiki) i publikować go na TikToku. Właściciel nadąża w ten sposób za newsami, oglądając własny kanał, a kanał ma docelowo zarabiać co najmniej na swoje koszty.

Inspiracja formatem: polskie kanały newsowe typu „Moto Newsy” (zdjęcie tematu na górze, duże napisy karaoke, gawędziarski lektor, ~1 min). Kopiujemy format, nie markę.

## 2. Cele

- 2–3 filmy dziennie, każdy o **jednym** temacie.
- Długość **61–75 s** (próg Creator Rewards to >1 min).
- Język polski, ton luźny, gawędziarski, ale merytoryczny.
- Każda informacja w filmie ma źródło. Rzeczy niepotwierdzone są w filmie wprost nazwane plotką/przeciekiem.
- Koszt zmienny ok. **$0,3–0,6 za film**, łącznie z abonamentami docelowo **poniżej ~$100/mies.**
- Działa bez ręcznej pracy poza jednym kliknięciem zatwierdzenia (w fazie 1).

## 3. Poza zakresem (non-goals)

- Animowany prezenter / maskotka / avatar – świadomie odrzucone na rzecz lektora + grafik.
- Prywatny dzienny przegląd wszystkich newsów dla właściciela – niepotrzebny, 2–3 tematy dziennie wystarczą.
- Inne platformy (YouTube Shorts, Instagram Reels) – nie w v1. Architektura nie powinna tego blokować (gotowy MP4 jest osobnym artefaktem).
- Mechanizmy zarabiania (afiliacja, sponsorzy, linki w bio) – nie budujemy w v1.
- Panel/dashboard statystyk.

## 4. Anty-cele (porażka, nawet jeśli technicznie działa)

- Film podaje plotkę jako fakt albo myli liczby (kurs, wycena, wynik w rankingu).
- Kanał wygląda jak kopia Tadzia / „Stukającej Panewki” (nazwa, postać, oprawa).
- Konto dostaje bana lub strike: nieoznaczone treści AI, cudze nagrania/zdjęcia z prawami autorskimi, „porady inwestycyjne”.
- Ten sam temat wraca w kilku filmach z rzędu.
- Koszty miesięczne rosną ponad przychody bez wiedzy właściciela.

## 5. Ograniczenia i fakty

- **n8n:** instancja jest pusta. Jedyny credential: Anthropic. Kredyty bramki n8n obejmują m.in. Brave Search, Firecrawl, OpenAI, Gemini – można ich używać bez własnych kluczy.
- **TikTok:** n8n nie ma natywnego węzła. Oficjalne Content Posting API wymaga audytu aplikacji; przed audytem publikuje tylko prywatnie. Dlatego publikacja idzie przez pośrednika (np. Upload-Post, Blotato, Postiz – do wyboru przez budującego).
- **Oznaczanie AI:** każdy film publikowany z flagą „AI-generated content”.
- **Creator Rewards w Polsce:** dostępność niepewna (źródła sprzeczne). Właściciel sprawdzi w aplikacji (Narzędzia twórcy). Projekt nie zakłada przychodu z TikToka w pierwszych miesiącach.
- **Grafiki a prawa autorskie:** nie używamy cudzych zdjęć prasowych ani wideo. Dozwolone: zrzuty ekranu oficjalnych ogłoszeń/stron/rankingów (krótko, jako cytat źródła), logo firm w kontekście newsa, wykresy generowane z danych, ilustracje generowane przez AI.

## 6. Podejścia rozważane

| Podejście | Za | Przeciw | Decyzja |
|---|---|---|---|
| A. Pełny lip-sync maskotki w każdym filmie (Kling Avatar v2) | najlepszy efekt, rozpoznawalna twarz | ~$4,3/film, ~$320/mies. | odrzucone |
| B. Tańszy lip-sync (LTX-2 / Wan S2V) | ~$90–230/mies. | nieprzetestowane na kreskówkach | odrzucone |
| C. Biblioteka pętli maskotki | ~$25/mies. | powtarzalność gestów | odrzucone |
| **D. Lektor + grafiki, bez postaci** | najtańsze (~$0,3–0,6/film), najprostsze, najmniej ryzyka | trudniej o rozpoznawalność | **wybrane przez właściciela** |

Rozpoznawalność budujemy oprawą: stały szablon, kolorystyka, jingiel/intro 1–2 s, charakterystyczny głos lektora i nazwa kanału.

## 7. Format filmu

Pion 1080×1920, 61–75 s, 8–12 scen po ~5–8 s.

```
┌─────────────────────┐
│  grafika sceny      │  zrzut źródła / wykres / ilustracja AI / logo
│  (górne ~45%)       │
├─────────────────────┤
│  NAPISY KARAOKE     │  duże, białe z obrysem, aktywne słowo na żółto
├─────────────────────┤
│  dolna część:       │  rozmyta grafika sceny + „karta faktu”
│  karta faktu        │  (np. „NVDA +4,2%”, „#1 w LMArena”, „PLOTKA”)
├─────────────────────┤
│  pasek: źródło      │  nazwa źródła bieżącej sceny
└─────────────────────┘
```

Struktura scenariusza:
1. Hak (0–3 s) – jedno zdanie, dlaczego to ważne.
2. Co się stało (fakty ze źródłami).
3. Dlaczego to ważne / kontekst.
4. Co dalej / opinia lektora (oznaczona jako opinia).
5. Zamknięcie + CTA („obserwuj, żeby nadążać”).

Przy tematach giełdowych: ostatnia scena lub stała plansza „To nie jest porada inwestycyjna”.
Przy przeciekach: plansza/karta „PLOTKA” na czas omawiania niepotwierdzonej części.

## 8. Przepływ (jeden workflow uruchamiany 3× dziennie)

Godziny **publikacji**: 8:00, 13:00, 18:30 (czas PL). Każdy slot to jeden film. Pipeline startuje ok. 2 h przed slotem, żeby film był gotowy do zatwierdzenia z wyprzedzeniem; zatwierdzony film czeka i jest publikowany o godzinie slotu (zaplanowana publikacja u pośrednika lub węzeł Wait w n8n). Film niezatwierdzony do godziny slotu + 2 h przepada (decyzja Claude'a – do skorygowania wg dostępności właściciela).

1. **Zbieranie kandydatów** – RSS oficjalnych blogów (OpenAI, Anthropic, Google/DeepMind, Meta AI, Mistral, xAI, NVIDIA, Hugging Face), Reuters/Bloomberg/The Verge/TechCrunch (sekcje AI), arXiv (cs.AI/cs.CL – tylko gdy głośne), rankingi (LMArena, Artificial Analysis), Brave Search na „AI news last 12h”. Okno: ostatnie ~12 h.
2. **Odfiltrowanie powtórek** – porównanie z tabelą „opublikowane tematy” w n8n Data Table (tytuł + streszczenie + data). Temat omówiony w ostatnich 7 dniach odpada, chyba że jest istotna nowa informacja.
3. **Wybór tematu** – LLM (Claude) ocenia kandydatów: ważność, świeżość, „klikalność”, wiarygodność. Wybiera jeden.
4. **Weryfikacja** – Firecrawl pobiera treść źródeł; LLM wyciąga fakty z przypisanym źródłem każdego. Reguła przecieków: wchodzi tylko, gdy podają go ≥2 wiarygodne źródła albo znany leaker ze sprawdzonym dorobkiem; zawsze oznaczony jako plotka. Liczby giełdowe pobierane z API danych rynkowych, nie z artykułu.
5. **Scenariusz** – Claude pisze tekst lektora (~150–180 słów → 61–75 s) + podział na sceny z opisem grafiki i kartą faktu dla każdej.
6. **Grafiki** – dla każdej sceny: zrzut źródła (Firecrawl screenshot) albo wykres (np. QuickChart) albo ilustracja AI (Gemini/OpenAI z kredytów n8n). Ilustracje w jednym stałym stylu wizualnym kanału.
7. **Lektor** – ElevenLabs, jeden stały polski głos, znaczniki czasu słów do napisów.
8. **Montaż** – Creatomate: stały szablon, podstawienie scen, grafik, audio, napisów karaoke, intro/outro.
9. **Zatwierdzenie (faza 1)** – Telegram: podgląd MP4 + scenariusz + lista źródeł + przyciski „Publikuj” / „Odrzuć”. Brak decyzji w ciągu X h → film nie idzie (nie publikujemy w ciemno).
10. **Publikacja** – pośrednik do uploadu → TikTok, opis z hashtagami, flaga treści AI. Zapis tematu do tabeli „opublikowane tematy”.
11. **Obsługa błędów** – każdy błąd kroku → wiadomość na Telegram z nazwą kroku. Brak dobrego tematu → pomijamy slot (lepiej nic niż słaby film).

**Faza 2:** gdy przez ~2–4 tygodnie właściciel prawie nie odrzuca filmów, zatwierdzanie staje się opcjonalne (auto-publikacja po X min bez sprzeciwu).

## 9. Koszty (szacunek, ~75 filmów/mies.)

| Pozycja | Szacunek |
|---|---|
| LLM (Claude), wyszukiwanie, Firecrawl, ilustracje | kredyty n8n / kilka $ |
| ElevenLabs (plan Creator) | ~$22/mies. |
| Creatomate | do sprawdzenia przez budującego (plan wg minut renderu) |
| Pośrednik uploadu TikTok | ~$10–20/mies., do sprawdzenia |
| Hosting n8n | zależny od obecnego planu właściciela |

Każda cena do potwierdzenia na stronie dostawcy przed wyborem.

## 10. Decyzje podjęte

- Wideo: lektor + grafiki, bez postaci (właściciel).
- 2–3 filmy dziennie, jeden temat na film, bez prywatnego przeglądu (właściciel).
- Własna marka, nie kopia Tadzia (właściciel).
- Artefakt n8n: zwykły workflow z harmonogramem, LLM jako kroki ograniczone (decyzja Claude'a – sterowanie jest stałe).
- Zatwierdzanie przez Telegram w fazie 1 (propozycja Claude'a, właściciel nie zgłosił sprzeciwu).
- Reguła przecieków i disclaimer giełdowy jak w sekcji 8 (propozycja Claude'a).
- Narzędzia: Claude, Brave, Firecrawl, ElevenLabs, Creatomate (propozycja Claude'a). Lista nie jest wiążąca: jeśli renderer przebija budżet, budujący może zamienić Creatomate na tańszą alternatywę (np. JSON2Video, Shotstack, self-hosted Remotion/FFmpeg), zachowując format z sekcji 7.
- Kredyty bramki n8n (Brave, Firecrawl, OpenAI, Gemini) są widoczne na instancji – potwierdzone przez listę credentiali 2026-11-18.
- Konto TikTok: osobiste (nie firmowe), bo Creator Rewards wymaga konta osobistego. Podłączenie konta do pośrednika (logowanie OAuth) robi właściciel – to krok na ścieżce krytycznej przed pierwszym testem publikacji (decyzja Claude'a).

## 11. Zostawione budującemu

- Konkretny pośrednik uploadu TikTok i API danych giełdowych.
- Dokładna lista kanałów RSS i zapytań wyszukiwania.
- Projekt szablonu w Creatomate (kolory, font, intro), styl ilustracji AI.
- Wybór głosu ElevenLabs (2–3 propozycje do odsłuchu dla właściciela).
- Podział na pod-workflowy w n8n i schemat tabel.
- Prompty LLM.
