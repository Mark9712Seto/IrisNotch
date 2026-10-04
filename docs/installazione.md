# Installare e usare Iris Notch

*[Read in English](install.md)*

## 1. Scaricare il programma

1. Apri la pagina delle **Release** del repository e scegli l'ultima versione.
2. Scarica `Iris.Notch_<versione>_x64-setup.exe` (il numero è la versione: in fondo alle impostazioni vedi quale hai installato) e aprilo. Installa solo per il tuo utente, non chiede i permessi di amministratore.
3. Per provare una build più nuova di una Release: **Actions** → l'ultima esecuzione verde di **Build** → in fondo, sotto **Artifacts**, **Iris-Notch-Windows** (uno zip con l'installer e `iris-volto.exe`, il programma da solo senza installazione).

> ⚠️ **Windows SmartScreen** mostrerà "Windows ha protetto il PC", perché il programma non è firmato. Clicca **Ulteriori informazioni → Esegui comunque**. Capita a tutti i programmi non firmati; firmarlo costa un certificato a pagamento.

Serve **WebView2**, che su Windows 10/11 aggiornati c'è già. Se manca, l'installer lo scarica da solo. Non serve installare nient'altro: niente Python, niente runtime.

**Dove salva le sue cose:** `%APPDATA%\Iris Notch` (impostazioni, `logs\`, modello di trascrizione, voce locale). Fino alla 0.1.1 la cartella si chiamava `it.irisvolto.app`: la 0.1.2 la sposta da sola. Disinstallando, Windows chiede se cancellare anche i dati: spuntalo per ripartire da zero.

## 2. Primo avvio

L'isola compare in alto al centro dello schermo e, finché Hermes non è configurato, si apre sulle **Impostazioni**:

| Campo | Cosa mettere |
|---|---|
| Indirizzo | l'indirizzo dell'API server di Hermes, per esempio `http://<indirizzo-di-hermes>:8642` |
| Chiave API | la chiave che hai messo in `API_SERVER_KEY` (vedi [hermes-setup.it.md](hermes-setup.it.md)) |

Premi **Test**, il pulsante accanto alla chiave:

- **Collegata · Hermes x.y**: tutto a posto;
- **mancano: …**: la versione di Hermes è troppo vecchia per sessioni, via libera o stati;
- **401**: chiave sbagliata;
- **non raggiungibile**: regola del firewall o API server non in ascolto sulla rete.

La chiave finisce nel **Gestore credenziali di Windows** (Pannello di controllo → Gestione credenziali → Credenziali di Windows → `IrisVolto`), non in un file.

## 3. Voce → testo

Nelle impostazioni scegli **Sul mio PC** oppure **Server Whisper**.

**Sul mio PC** (consigliato):

1. Scegli il modello:
   - `large-v3-turbo`, 574 MB: il migliore per l'italiano, va sulla scheda video;
   - `small`, 190 MB: più leggero.
2. Premi **Scarica**. Si scarica una volta sola, da Hugging Face.
3. Il modello si carica al primo uso (qualche secondo) e lascia la scheda video dopo i minuti che hai impostato, così non ruba memoria ai giochi.

La scheda video si usa tramite **Vulkan**, che arriva con i driver NVIDIA: non serve installare CUDA.

**Server Whisper**: indirizzo di un server compatibile OpenAI (`/v1/audio/transcriptions`, per esempio speaches o faster-whisper-server) oppure di un `whisper.cpp server` (`/inference`).

## 4. Parlare

- **Tieni premuto** `Ctrl+Alt+Spazio`, parla, rilascia;
- oppure clicca il **microfono** nell'isola, parla, cliccalo di nuovo.

Compare **"Ho capito questo"** con il testo modificabile: correggi se serve e premi **Invia** (o Invio). Se preferisci saltare l'anteprima, c'è l'opzione *Invia subito quello che dico*.

## 5. Risposte a voce

- **Volume della voce**, in cima a *Testo → voce*: quanto forte parla Iris (e suona l'avviso). Cambia subito, e alla fine del cursore senti un suono di prova.
- L'icona dell'**altoparlante** a sinistra della casella di testo accende e spegne la lettura automatica delle risposte.
- Con *Suono quando arriva la risposta* senti un piccolo suono quando Iris comincia a rispondere.
- Sotto ogni risposta c'è **Ascolta**, per sentirla anche a posteriori, con la lettura spenta.

Motori:

- **Sul mio PC (Piper)**: voce italiana che gira sul **processore**, quindi va bene anche su PC poco potenti e non serve la scheda video. Si scarica su richiesta, dopo una conferma: **circa 85 MB** (programma 22 MB + voce Paola 61 MB), nella cartella dell'app.
  - **Voci**: *Paola* (donna, predefinita) e *Riccardo* (uomo, più leggera, 27 MB, si scarica quando la scegli dal menu). **Prova voce** accanto al menu.
  - Sotto la voce c'è la velocità dell'ultima frase: di solito è molte volte più veloce del parlato (misurato: 8× Paola, 15× Riccardo).
  - **Spegni la voce dopo**: se non la usi per quel tempo, il programma si chiude e libera la memoria; si riaccende da solo alla frase dopo.
  - Chi aveva provato la vecchia voce (Qwen3-TTS, fino alla 0.1.3) trova un riquadro per **eliminare i suoi 5 GB**.
- **Voce di Windows**: le voci installate (in italiano di solito *Elsa* o *Isabella*). Altre voci si aggiungono da Impostazioni di Windows → Ora e lingua → Voce.
- **Server TTS**: un server compatibile OpenAI (`/v1/audio/speech`), per esempio Piper o Kokoro dietro openedai-speech o Kokoro-FastAPI.

## 6. Dove sta l'isola e come si apre

- **Per spostarla** tienila premuta e trascinala. In cima allo schermo è una **tacca**. Tirata giù **si stacca e diventa una bolla**, da mettere dove vuoi, anche su un altro schermo. Riportata in cima torna tacca. Da aperta si prende dagli occhi: si richiude e la porti in giro. Dove la lasci, la ritrovi.
- Impostazioni → **Isola**:
  - **Si apre**: passando sopra (subito, oppure dopo 0,6 / 1 / 1,5 / 2 secondi, il tempo di prenderla) o solo con un clic;
  - **Si richiude** dopo 0,7-5 secondi che il mouse è uscito; da 1 secondo in su una barretta in basso fa il conto alla rovescia;
  - **Occhi che seguono** il mouse, che si può spegnere;
  - **Rimettila al centro**.
- Impostazioni → **Generale**: il tuo **compleanno** (giorno e mese: quel giorno ci sono i coriandoli), **Avvia con Windows**, la **cornice nera** intorno agli occhi (0-16 px) e la **Dimensione** di tutta l'app (Piccola, Normale, Grande: ingrandisce isola, occhi, chat e impostazioni insieme).
- **Puntina** accesa e isola aperta: prendendola dagli occhi si sposta tutta la finestra aperta, senza richiuderla. Se la lasci oltre un bordo o sopra la barra delle applicazioni rientra con una piccola molla; altrimenti resta esattamente dove l'hai lasciata.
- Impostazioni → **Debug e prove**: modalità debug (log dettagliato), **Mostra l'area** (colora dove giocano gli occhi), ultimi errori e cartella dei log.
- Ogni opzione ha un **?**: passandoci sopra col mouse spiega a cosa serve.
- **Le modifiche valgono solo con Salva.** Appena cambi qualcosa compare **Annulla** accanto a Salva, e l'isola non si richiude da sola finché non scegli. Annulla, la **freccia indietro**, `Esc` o di nuovo l'**icona delle impostazioni** scartano le modifiche e chiudono.

Toccando gli occhi 3 volte di fila ride, a 7 volte gli gira la testa.

**Secondo l'ora**, aprendo l'isola (una volta per fascia): a notte fonda ha le occhiaie, prestissimo sbadiglia, la mattina beve il caffè, nel tardo pomeriggio a volte si stiracchia, la sera è rilassato con qualche stellina.

**Il mouse** (con *Occhi che seguono*): l'umore cambia da solo ogni 2-6 minuti, quindi a volte ti segue con molta attenzione e a volte quasi ti ignora. Se il mouse sfreccia si spaventa, e ogni tanto gli gira la testa. Se non tocchi il computer per 12 minuti si appisola, e al primo movimento si sveglia di colpo.

**Animazioni.** Ogni stato (ascolta, pensa, usa uno strumento, parla, fatto, via libera, errore, dorme) ha più versioni, e a ogni volta ne esce una a caso. Gli **easter egg a sorpresa** arrivano con un timer casuale: il primo tra 3 e 10 minuti dall'avvio, poi ogni volta tra 5 e 40 minuti, mai lo stesso due volte di fila. Partono solo a isola chiusa e ferma.

**Date ed eventi:**
- Capodanno (fuochi d'artificio), Befana, San Valentino, Carnevale e Pasqua (calcolati ogni anno), pesce d'aprile;
- 25 aprile e 2 giugno (Frecce Tricolori), primavera, estate e Ferragosto, San Lorenzo, autunno;
- Halloween, Natale (neve e regalo), venerdì 17, il tuo compleanno (torta e coriandoli);
- in più, le notti di luna piena e il caffè la mattina;
- **nel mondo**: Capodanno cinese, Holi e Diwali (date lunari fino al 2035), Pi Day (14/3), San Patrizio (17/3), Hanami (25/3-10/4), Giornata della Terra (22/4), Star Wars Day (4/5), 4 luglio, 14 luglio, Oktoberfest (19/9-5/10), Día de los Muertos (1-2/11), Thanksgiving.

**Animazioni tue.** In `%APPDATA%\Iris Notch\animazioni` puoi mettere file `.json` che descrivono occhi e forme a momenti chiave: niente codice, quindi sono sicuri anche se li prendi da internet. Nella cartella ci sono la **GUIDA.md** con tutte le regole e misure e un esempio da copiare. Da *Debug e prove*: **Cartella**, **Ricarica** e **Prova le mie**. Senza date restano tra le sorprese di ogni giorno; con `quando` partono nei loro giorni o nelle loro ore.

Nei loro giorni, sei volte su dieci parte quello di stagione, e all'avvio ti saluta con quello.

## 7. Sessioni

Il titolo in alto apre il menu:

- **Dall'isola**: le ultime conversazioni nate qui;
- **Altre sessioni ▸**: tutte le altre (Telegram, CLI, lavori a orario), con la ricerca. Scegliendone una si continua lì, con tutto il suo contesto;
- **＋**: conversazione nuova;
- passando sopra una sessione compaiono tre bottoni:
  - **puntina**: la fissa in cima, nella sezione **Fissate**, anche se è di Telegram o di un altro posto. Lo salva Hermes; con versioni vecchie di Hermes lo ricorda l'app;
  - **matita** (oppure **doppio clic sul titolo** in alto): rinomina. Il nome nuovo finisce su Hermes, quindi lo vedi anche dagli altri posti;
  - **cestino**: elimina la sessione su Hermes, dopo una conferma nella riga stessa. Non si può annullare.
- Le conversazioni nate dall'isola l'app se le ricorda da sola, così restano in "Dall'isola" anche se la versione di Hermes non salva da dove sono partite.

## 8. Altre cose utili

| | |
|---|---|
| `Ctrl+Alt+I` | apre e chiude l'isola |
| 📌 | la tiene aperta anche quando il mouse esce |
| `Esc` | chiude impostazioni, anteprima voce o isola |
| Icona nell'area di notifica | *Apri / chiudi l'isola* ed **Esci da Iris Notch** (il programma non sta nella barra delle applicazioni) |
| Avvia con Windows | nelle impostazioni, sezione Generale |
| Aggiornamenti | un pallino verde sulle impostazioni avvisa quando su GitHub c'è una versione nuova: si scarica e si installa a mano |

## Problemi noti

- **Trascinamento:** dalla 0.2.0 la finestra non si muove più mentre trascini (si sposta solo l'isola dentro la pagina): niente scie, sparizioni o fantasmi. Se vedi ancora artefatti, segnalalo aprendo una *issue* su GitHub, con un video.
- **Trascrizione locale:** finora provata poco con un modello vero. Se non va, guarda **Debug e prove → Ultimi errori**.
- **Scorciatoie:** nelle impostazioni clicchi nel campo e premi la combinazione (per esempio `Ctrl+Shift+K`): si scrive da sola. Serve almeno un tasto tra Ctrl, Alt, Shift e Win, oppure un tasto F1-F24; Esc annulla. Se una scorciatoia è già usata da un altro programma, Windows non la assegna.
- **Se qualcosa non va:** accendi la **modalità debug**, rifai la cosa e apri una *issue* su GitHub allegando **Ultimi errori** (il log non contiene mai le chiavi).
