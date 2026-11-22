# README jako wizytówka (krótki projekt)

**Po co:** README ma być reklamą narzędzia dla osoby nietechnicznej (np. znajomego z linkiem): co dostaje rano, skąd są wiadomości, co potrafi strona, czego się nie spodziewać — z obrazkami.

**Ustalone (zatwierdzone przez właściciela):**
- po polsku, ciepło i prosto, bez żargonu;
- układ: hasło + zrzut strony głównej → co to jest → twój poranek (mail o 5:30) → funkcje ze zrzutami (wydanie, czytnik, pojęcia, karty firm, giełda i rankingi, dodatek tygodniowy, archiwum, Luki) → skąd wiadomości → jak to powstaje (4 kroki) → czego się nie spodziewać → pytania i odpowiedzi → jedna linijka „na czym to działa”;
- zrzuty z żywej strony (telefon i komputer) w `docs/readme/`;
- nic prywatnego: bez adresu e-mail, adresu n8n, kluczy.

**Podejścia:** jedno sensowne — statyczne zrzuty w repo (GIF/wideo byłyby cięższe, a GitHub ich nie odtwarza wygodnie; generowane obrazki dawałyby nieprawdziwy obraz).

**Kroki:** zrzuty ekranu → podgląd porannego maila z `renderEmailHtml` → tekst README → sprawdzenie linków do obrazków i braku danych prywatnych (`tests/secrets.test.js`) → commit, push po zgodzie.
