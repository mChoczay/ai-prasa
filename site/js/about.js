// "O gazecie": what the paper is, where the news comes from and what its labels mean.
import { mastheadNav } from './render.js';

export function renderAbout() {
  return `<section class="about"><header class="masthead"><h1><a class="mast-home" href="#/">Poranna prasa AI</a></h1>${mastheadNav('about')}</header>
<h2>Co to jest</h2>
<p>Osobista gazeta o sztucznej inteligencji. Co noc automat przegląda kilkanaście sprawdzonych źródeł, wybiera najważniejsze wiadomości i pisze z nich krótkie wydanie po polsku. Krótko po 5:30 przychodzi mail, a całość czyta się w około 15 minut.</p>

<h2>Jak czytać oznaczenia</h2>
<dl class="legend">
<dt><span class="status status-potwierdzone">potwierdzone</span></dt><dd>Informacja ma oficjalne źródło albo podają ją co najmniej dwa wiarygodne media.</dd>
<dt><span class="status status-plotka">plotka</span></dt><dd>Przeciek albo niepotwierdzona wiadomość. Trafia do gazety tylko wtedy, gdy podają ją dwa wiarygodne źródła albo sprawdzony informator.</dd>
<dt><span class="status status-opinia">opinia</span></dt><dd>Komentarz lub analiza, a nie nowa wiadomość.</dd>
<dt>aktualizacja</dt><dd>Temat był już w gazecie w ostatnich dniach, a ten tekst dodaje nowe fakty.</dd>
<dt>Może dotyczyć</dt><dd>Firmy i modele, których wiadomość może dotyczyć. Gazeta nigdy nie przewiduje, czy ich kurs wzrośnie, czy spadnie.</dd>
<dt>Pojęcia</dt><dd>Trudniejsze słowa są podkreślone w tekście. Stuknij, a zobaczysz proste wyjaśnienie. Tak samo działają nazwy firm.</dd>
</dl>

<h2>Giełda i rankingi</h2>
<dl class="legend">
<dt>Dlaczego?</dt><dd>Przy dużym ruchu kursu gazeta podaje przyczynę i mówi, na ile jest jej pewna: <b>fakt</b> (źródło wprost łączy ruch z wydarzeniem), <b>hipoteza</b> (prawdopodobny powód, bez potwierdzenia) albo <b>brak</b> jednoznacznej przyczyny.</dd>
<dt>Sprawdzamy</dt><dd>Jeśli kilka dni po wiadomości o firmie jej kurs mocno się ruszy, gazeta przypomni, o czym wtedy pisała. To przypomnienie, a nie dowód, że jedno spowodowało drugie.</dd>
<dt>Rankingi</dt><dd>Które modele AI prowadzą w głosowaniu użytkowników (LMArena), w niezależnych testach (Artificial Analysis) i czym ludzie się właśnie ekscytują (Hugging Face).</dd>
</dl>
<p class="note-strong">To nie jest porada inwestycyjna. Gazeta opisuje, co się stało, ale nigdy nie mówi, co kupić ani co się wydarzy.</p>

<h2>Luki</h2>
<p>Dziennik luk bezpieczeństwa, o których pisała gazeta. Co rano sprawdza w publicznych bazach luk, czy wyszła już poprawka. <b>Załatana</b> znaczy, że twórcy programu wydali wersję z poprawką; własne programy i tak trzeba zaktualizować.</p>

<h2>Skąd są wiadomości</h2>
<p>Blogi OpenAI, Google DeepMind, Google AI, NVIDIA i Hugging Face; działy AI w The Verge, TechCrunch, Ars Technica i MIT Technology Review; CNBC Technology, Hacker News i blog Simona Willisona. Do tego notowania giełdowe na zamknięcie sesji i rankingi modeli. Pod każdym tekstem są linki do źródeł.</p>

<h2>Czego się nie spodziewać</h2>
<p>Wiadomości z ostatniej chwili (jedno wydanie dziennie), plotek podanych jak fakty ani liczb spoza źródeł. Teksty pisze sztuczna inteligencja i może się pomylić, dlatego zawsze możesz sprawdzić źródło.</p>
</section>`;
}
