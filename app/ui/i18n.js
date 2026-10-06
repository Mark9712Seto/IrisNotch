/* Lingua dell'interfaccia: italiano (i testi scritti nel codice) o inglese.
   T("testo italiano", {variabili}) restituisce il testo nella lingua scelta; i {nomi} tra graffe si sostituiscono.
   I testi fissi della pagina (index.html) si traducono una volta all'avvio con translatePage().
   Cambiando lingua l'app si ricarica, così niente resta a metà. */
(function () {
  const Iris = (window.Iris = window.Iris || {});
  const EN = {
    // barra, chat, menu
    "Sessioni": "Sessions", "Nuova conversazione": "New conversation", "Tieni aperta": "Keep open", "Impostazioni": "Settings",
    "Fissate": "Pinned", "Dall'isola": "From the island", "Altre sessioni": "Other sessions", "Cerca nelle sessioni…": "Search sessions…",
    "Risposte a voce": "Spoken replies", "Scrivi a Iris…": "Write to Iris…", "Premi e parla": "Push to talk", "Invia": "Send", "Ferma": "Stop",
    "Risposte a voce: attive": "Spoken replies: on", "Risposte a voce: spente": "Spoken replies: off",
    "Ti ascolto…": "Listening…", "Trascrivo…": "Transcribing…", "Sto pensando…": "Thinking…", "Uso uno strumento…": "Using a tool…",
    "Rispondo…": "Replying…", "Mi serve il via libera": "I need your OK", "Fatto": "Done", "Qualcosa è andato storto": "Something went wrong",
    "Hermes non raggiungibile": "Hermes can't be reached", "Parlo…": "Speaking…", "Chiedo a un aiutante…": "Asking a helper…",
    "La richiesta non è andata a buon fine": "The request didn't go through",
    "ora": "now", "Senza titolo": "Untitled", "Togli dalle fissate": "Unpin", "Fissa in alto": "Pin to top", "Rinomina": "Rename", "Elimina": "Delete",
    "Ancora nessuna conversazione dall'isola.": "No conversations from the island yet.", "Nessuna sessione trovata.": "No sessions found.",
    "Clicca di nuovo per eliminare (non si può annullare)": "Click again to delete (can't be undone)",
    "Rinomina: {e}": "Rename: {e}", "Eliminazione: {e}": "Delete: {e}", "Voce: {e}": "Voice: {e}",
    "Ciao! Come posso aiutarti?": "Hi! How can I help?", "la scorciatoia": "the shortcut",
    "Scrivi qui sotto, oppure tieni premuto {k} e parla.": "Type below, or hold {k} and speak.",
    "Ascolta": "Listen", "Copia": "Copy", "Copiato": "Copied", "1 azione prima": "1 earlier action", "{n} azioni prima": "{n} earlier actions",
    // via libera e voce
    "Iris chiede il via libera": "Iris asks for your OK", "Una volta": "Once", "Nega": "Deny", "Iris vuole eseguire questa azione:": "Iris wants to run this action:",
    "Rifai": "Redo", "Annulla": "Cancel", "rilascia per finire": "release to finish", "clicca di nuovo il microfono per finire": "click the microphone again to finish",
    "Non ho sentito niente": "I didn't hear anything", "Ho capito questo": "Here's what I heard", "correggi se serve": "fix it if needed",
    // nomi degli strumenti e delle provenienze
    "terminale": "terminal", "leggo un file": "reading a file", "scrivo un file": "writing a file", "cerco sul web": "searching the web",
    "memoria": "memory", "casa": "home", "posta": "mail", "calendario": "calendar", "attività": "tasks", "eseguo codice": "running code",
    "guardo un'immagine": "looking at an image", "chiedo a un aiutante": "asking a helper", "cerco nelle conversazioni": "searching conversations",
    "abilità": "skills", "lavori programmati": "scheduled jobs", "isola": "island", "pannello": "dashboard",
    // impostazioni
    "Indirizzo": "Address", "Chiave API": "API key", "Prova la connessione con Hermes": "Test the connection to Hermes",
    "Si incolla una volta. Viene salvata nel Gestore credenziali di Windows, mai in un file, e non si rivede.": "Paste it once. It's stored in Windows Credential Manager, never in a file, and you won't see it again.",
    "Voce → testo": "Speech → text", "Sul mio PC": "On my PC", "Server Whisper": "Whisper server", "Modello": "Model",
    "large-v3-turbo · 574 MB · consigliato con scheda video": "large-v3-turbo · 574 MB · best with a graphics card",
    "small · 190 MB · più leggero, va anche senza scheda video": "small · 190 MB · lighter, works without a graphics card",
    "Scarica": "Download", "Tipo di server": "Server type", "Compatibile OpenAI · /v1/audio/transcriptions": "OpenAI-compatible · /v1/audio/transcriptions",
    "Chiave (se serve)": "Key (if needed)", "Invia subito": "Send right away", "Voce compatta": "Compact voice",
    "Con l'isola chiusa la scorciatoia premi e parla non apre la chat: la tacca si allarga appena per ascoltarti, ti fa vedere cosa ha capito e mostra lì la risposta. Per mandare: Invio, la spunta o un tocco breve della scorciatoia; Esc annulla; tenerla premuta di nuovo fa riparlare. Anche il via libera si dà lì: Invio una volta, Esc nega; clic sugli occhi per vedere tutto.": "With the island closed, the push-to-talk shortcut doesn't open the chat: the notch widens just enough to listen, shows what it heard and shows the reply right there. To send: Enter, the check mark or a short tap of the shortcut; Esc cancels; holding it again lets you speak again. Approvals happen there too: Enter allows once, Esc denies; click the eyes to see everything.",
    "{a} o un tocco della scorciatoia: manda · {b} annulla · tienila premuta per rifare": "{a} or a tap of the shortcut: send · {b} cancel · hold it to speak again", "Invio": "Enter",
    "Invio o un tocco della scorciatoia": "Enter or a tap of the shortcut", "Esc per fermarla prima che parta": "Esc to stop it before it goes",
    "Clicca sugli occhi per aprire la chat": "Click the eyes to open the chat", "Tu": "You", "Annullato": "Cancelled",
    "{a} una volta · {b} nega · clic sugli occhi per vedere tutto": "{a} once · {b} deny · click the eyes to see it all",
    "Quello che dici parte appena smetti di parlare, senza l'anteprima da correggere.": "What you say is sent as soon as you stop talking, without the preview to fix it.",
    "Libera la scheda video dopo": "Free the graphics card after",
    "Se non parli per questo tempo, il modello di trascrizione esce dalla memoria della scheda video. Alla volta dopo si ricarica da solo in un paio di secondi. «Mai» lo tiene sempre pronto.": "If you don't speak for this long, the transcription model leaves the graphics card memory. Next time it reloads by itself in a couple of seconds. “Never” keeps it always ready.",
    "2 minuti fermo": "2 idle minutes", "10 minuti fermo": "10 idle minutes", "30 minuti fermo": "30 idle minutes", "mai": "never",
    "Testo → voce": "Text → speech", "Volume della voce:": "Voice volume:",
    "Quanto forte parla Iris (e quanto forte suona l'avviso di arrivo). Cambia subito: alla fine del cursore senti un piccolo suono di prova.": "How loud Iris speaks (and how loud the arrival chime is). It changes right away: when you let go of the slider you hear a short test sound.",
    "Leggi ad alta voce": "Read aloud", "Iris legge le risposte appena arrivano. Si cambia anche dall'altoparlante vicino al campo di testo.": "Iris reads replies as they arrive. You can also toggle it with the speaker next to the text box.",
    "Suono di arrivo": "Arrival chime", "Un breve suono quando arriva una risposta.": "A short sound when a reply arrives.",
    "Voce di Windows": "Windows voice", "Server TTS": "TTS server", "Scarica la voce locale (circa 85 MB)": "Download the local voice (about 85 MB)",
    "Voce italiana che gira sul tuo PC con Piper, sul processore: va bene anche su computer poco potenti e non serve la scheda video. Si scarica una volta, circa 85 MB tra programma e voce.": "A voice that runs on your PC with Piper, on the processor: fine on modest computers, no graphics card needed. Downloaded once, about 85 MB for program and voice.",
    "Voce": "Voice", "Fai sentire una frase di prova": "Play a test sentence", "Prova voce": "Try voice",
    "Server compatibile OpenAI (/v1/audio/speech): per esempio Piper o Kokoro dietro openedai-speech, Kokoro-FastAPI o speaches.": "OpenAI-compatible server (/v1/audio/speech): for example Piper or Kokoro behind openedai-speech, Kokoro-FastAPI or speaches.",
    "es. it_IT-paola-medium": "e.g. en_US-lessac-medium", "Velocità": "Speed", "Spegni la voce dopo": "Turn the voice off after",
    "Se non la usi per questo tempo, la voce locale si spegne e libera la memoria della scheda video (circa 2,5 GB). Alla frase dopo si riaccende da sola, con qualche secondo di attesa. «Mai» la tiene sempre pronta.": "If unused for this long, the local voice turns off and frees memory. It starts again by itself on the next sentence, after a few seconds. “Never” keeps it always ready.",
    "Isola": "Island",
    "Per spostarla tienila premuta e trascinala. Tirata giù dal bordo si stacca e diventa una bolla, anche su un altro schermo; riportata in cima torna tacca. Da aperta si prende dagli occhi.": "To move it, press and drag. Pulled down from the edge it pops off into a bubble, even on another screen; brought back to the top it's a notch again. When open, grab it by the eyes.",
    "Si apre": "Opens", "passando sopra, subito": "on hover, right away", "passando sopra, dopo 0,6 s": "on hover, after 0.6 s",
    "passando sopra, dopo 1 s": "on hover, after 1 s", "passando sopra, dopo 1,5 s": "on hover, after 1.5 s", "passando sopra, dopo 2 s": "on hover, after 2 s",
    "solo con un clic": "only on click", "Si richiude": "Closes", "dopo 0,7 s": "after 0.7 s", "dopo 1 s": "after 1 s", "dopo 1,5 s": "after 1.5 s",
    "dopo 2 s": "after 2 s", "dopo 3 s": "after 3 s", "dopo 5 s": "after 5 s", "Occhi che seguono": "Eyes follow the mouse",
    "Gli occhi guardano il puntatore del mouse quando gli passi vicino.": "The eyes look at the mouse pointer when it passes nearby.",
    "Rimettila al centro": "Put it back in the center", "Scorciatoie": "Shortcuts",
    "Clicca nel campo e premi la combinazione di tasti che vuoi usare: si scrive da sola. Serve almeno un tasto tra Ctrl, Alt, Shift e Win (oppure un tasto F1-F24). Esc annulla.": "Click the field and press the key combination you want: it's written for you. It needs at least one of Ctrl, Alt, Shift and Win (or an F1-F24 key). Esc cancels.",
    "Apri l'isola": "Open the island", "Clicca e premi i tasti": "Click and press the keys", "Generale": "General", "Lingua": "Language",
    "Lingua dell'app, delle voci locali e della trascrizione. Cambiandola l'app si ricarica.": "Language of the app, the local voices and transcription. Changing it reloads the app.",
    "Il tuo compleanno": "Your birthday", "Facoltativo. Quel giorno Iris ti fa gli auguri con i coriandoli.": "Optional. On that day Iris celebrates with confetti.",
    "Giorno": "Day", "Mese": "Month", "giorno": "day", "mese": "month", "Avvia con Windows": "Start with Windows", "Iris Notch parte da sola quando accendi il PC.": "Iris Notch starts by itself when you turn on the PC.",
    "Cornice nera:": "Black frame:",
    "Quanto spazio nero resta tra gli occhi e il bordo dell'isola chiusa. Più è alto, più l'isola è grande e gli occhi stanno al centro di una cornice più spessa. Con «Mostra l'area» (in Debug) si vede bene dove arrivano.": "How much black space there is between the eyes and the edge of the closed island. The higher, the bigger the island. “Show the area” (in Debug) shows exactly where they reach.",
    "Dimensione": "Size", "Ingrandisce o rimpicciolisce tutta l'app insieme: isola, occhi, chat e impostazioni, a piccoli passi da −3 a +4 (0 è la grandezza normale). Si vede subito; si tiene con Salva.": "Makes the whole app bigger or smaller: island, eyes, chat and settings, in small steps from −3 to +4 (0 is the normal size). You see it right away; Save keeps it.",
    "Piccola": "Small", "Normale": "Normal", "Grande": "Large", "−3 · la più piccola": "−3 · smallest", "0 · normale": "0 · normal", "+4 · la più grande": "+4 · largest", "Debug e prove": "Debug and tests", "Modalità debug": "Debug mode",
    "Registra nel log tutte le azioni, non solo gli errori. Il log non contiene mai le chiavi; il testo dei messaggi ci finisce solo con questa modalità accesa.": "Logs every action, not just errors. The log never contains your keys; message text goes into it only with this mode on.",
    "Mostra l'area": "Show the area", "Colora l'area dove si muovono le animazioni, per vedere il bordo nero. Non viene salvato.": "Colors the area where animations move, to see the black frame. Not saved.",
    "Ultimi errori": "Latest errors", "Cartella dei log": "Log folder", "Animazioni personali": "Your animations",
    "File .json nella cartella animazioni: occhi e forme descritti a momenti chiave, niente codice. Nella cartella ci sono la GUIDA.md con tutte le regole e un esempio da copiare.": ".json files in the animations folder: eyes and shapes described at key moments, no code. The folder has a GUIDA.md (in Italian) with every rule and an example to copy.",
    "Cartella": "Folder", "Ricarica": "Reload", "Prova le mie": "Try mine", "Informazioni": "About",
    "© 2026 Variety Project. Gratis da usare, modificare e condividere per scopi non commerciali (licenza PolyForm Noncommercial 1.0.0). Venderlo o usarlo in un prodotto a pagamento richiede il nostro permesso.": "© 2026 Variety Project. Free to use, modify and share for non-commercial purposes (PolyForm Noncommercial 1.0.0 license). Selling it or using it in a paid product requires our permission.",
    "I tuoi dati.": "Your data.",
    "Niente account, niente statistiche, niente tracciamento. Le conversazioni vanno solo al server Hermes che hai indicato. La voce viene trascritta sul tuo PC (o sul tuo server Whisper). Le chiavi restano nel Gestore credenziali di Windows. Internet serve solo per scaricare i modelli quando lo chiedi e per controllare se c'è una versione nuova.": "No account, no statistics, no tracking. Conversations go only to the Hermes server you set. Your voice is transcribed on your PC (or your Whisper server). Keys stay in Windows Credential Manager. The internet is used only to download models when you ask and to check for a new version.",
    "Licenza": "License", "Crediti": "Credits", "Codice": "Code",
    "Iris Notch è un progetto indipendente: non è affiliato a Nous Research (Hermes Agent) né al progetto Piper. Il programma è fornito così com'è, senza garanzie.": "Iris Notch is an independent project, not affiliated with Nous Research (Hermes Agent) or the Piper project. The program is provided as is, without warranty.",
    "Apri su GitHub": "Open on GitHub", "Nuova versione {v}": "New version {v}", "Apri la pagina della versione nuova su GitHub": "Open the new version's page on GitHub", "Salva": "Save", "Salvato": "Saved", "Annulla le modifiche non salvate": "Discard unsaved changes",
    "Automatica (italiana)": "Automatic (English)", "Scaricato": "Downloaded", "Non ancora scaricato": "Not downloaded yet",
    "C'è ancora la vecchia voce locale": "The old local voice is still there", "Non ora": "Not now", "Elimino…": "Deleting…",
    "da scaricare ({mb} MB)": "to download ({mb} MB)", "Scarico la voce {v}?": "Download the voice {v}?", "Dimensione: {mb} MB": "Size: {mb} MB",
    "Voce caricata e pronta.": "Voice loaded and ready.", "Si accende alla prima frase.": "It starts with the first sentence.",
    "Ultima frase: {c} s di calcolo per {a} s di voce ({k})": "Last sentence: {c} s of computing for {a} s of speech ({k})",
    "{k}× più veloce del parlato": "{k}× faster than speech", "più lenta del parlato: andrà a singhiozzo": "slower than speech: it will stutter",
    "Scarico la voce locale?": "Download the local voice?",
    "Dimensione: circa 85 MB (programma Piper 22 MB + voce {v} 61 MB)": "Size: about 85 MB (Piper program 22 MB + {v} voice 61 MB)",
    "Gira sul processore: va bene anche su PC poco potenti, niente scheda video": "Runs on the processor: fine on modest PCs, no graphics card",
    "Si installa nella cartella dell'app, non tocca il resto del PC": "Installed in the app's folder, it doesn't touch the rest of the PC",
    "occupa {g} GB e non serve più.": "it takes {g} GB and isn't needed anymore.", "Uso: {t}": "Using: {t}",
    "•••••••• salvata (scrivi per cambiarla)": "•••••••• saved (type to change it)", "incolla la chiave": "paste the key", "•••••••• salvata": "•••••••• saved",
    "Provo…": "Testing…", "non risponde": "not responding",
    "Raggiungibile, ma mancano: {m} (Hermes da aggiornare)": "Reachable, but missing: {m} (Hermes needs an update)", "Collegata": "Connected",
    "Preparo la voce… (la prima volta ci vuole un po')": "Preparing the voice… (the first time takes a while)",
    "Ciao, sono Iris. Così suona la mia voce.": "Hi, I'm Iris. This is how my voice sounds.", "vuoto": "empty", "Voce locale": "Local voice",
    "C'è una versione nuova su GitHub: {v}": "There's a new version on GitHub: {v}", "versione {v}": "version {v}",
    "{n} caricate": "{n} loaded", " · {n} con errori (vedi Ultimi errori)": " · {n} with errors (see Latest errors)",
    "Nessuna animazione nella cartella": "No animations in the folder",
    "gennaio": "January", "febbraio": "February", "marzo": "March", "aprile": "April", "maggio": "May", "giugno": "June", "luglio": "July",
    "agosto": "August", "settembre": "September", "ottobre": "October", "novembre": "November", "dicembre": "December",
    // demo
    "Apri / chiudi": "Open / close", "Tieni premuto: parla": "Hold: talk", "Chiedi il meteo": "Ask the weather", "Azione con via libera": "Action with approval",
    "Hermes irraggiungibile": "Hermes unreachable", "Easter egg": "Easter egg",
    "Che tempo fa domani a Roma?": "What's the weather tomorrow in Rome?", "Segna nel budget la bolletta della luce": "Add the electricity bill to the budget",
  };
  let lang = "it";
  function T(s, vars) {
    let r = lang === "en" && EN[s] != null ? EN[s] : s;
    if (vars) r = r.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
    return r;
  }
  // testi fissi della pagina: nodi di testo e attributi (title, placeholder, suggerimenti); le parti che riempie il codice si saltano
  const SKIP = new Set(["chat", "menuPinned", "menuMine", "menuOthers", "sLog", "eyes", "desk"]);
  function translatePage(root) {
    if (lang === "it") return;
    const walk = (el) => {
      if (SKIP.has(el.id) || el.tagName === "SCRIPT" || el.tagName === "STYLE" || el.tagName === "svg") return;
      for (const a of ["title", "placeholder", "data-tip", "aria-label"]) { const v = el.getAttribute && el.getAttribute(a); if (v && EN[v.trim()]) el.setAttribute(a, EN[v.trim()]); }
      for (const n of el.childNodes) {
        if (n.nodeType === 3) { const t = n.nodeValue.trim(); if (t && EN[t]) n.nodeValue = n.nodeValue.replace(t, EN[t]); }
        else if (n.nodeType === 1) walk(n);
      }
    };
    walk(root || document.body);
  }
  // senza una scelta salvata: la lingua di Windows (italiano → italiano, tutto il resto → inglese)
  const guess = () => (/^it\b/i.test(navigator.language || "it") ? "it" : "en");
  Iris.i18n = {
    T, translatePage, guess,
    get lang() { return lang; },
    setLang(l) {
      lang = l === "en" ? "en" : "it"; Iris.lang = lang; document.documentElement.lang = lang;
      try { localStorage.setItem("irisLang", lang); } catch (e) {}
    },
  };
  // l'ultima lingua usata vale da subito, prima che arrivino le impostazioni (che poi la confermano)
  let cached = null; try { cached = localStorage.getItem("irisLang"); } catch (e) {}
  Iris.i18n.setLang(new URLSearchParams(location.search).get("lang") || cached || "it");
})();
