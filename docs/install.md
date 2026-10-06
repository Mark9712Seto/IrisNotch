# Installing and using Iris Notch

*[Leggi in italiano](installazione.md)*

> Since 0.2.2 the app is in English and Italian: it follows the Windows language on first start, and you can change it in **Settings → General → Language**. Labels below are given in Italian with their meaning in brackets, for older versions.

## 1. Download

1. Open the repository's **Releases** page and pick the latest version.
2. Download `Iris.Notch_<version>_x64-setup.exe` (the number is the version; the bottom of the settings shows which one you have) and run it. It installs for your user only and doesn't ask for administrator rights.
3. To try a build newer than the latest Release: **Actions** → the latest green **Build** run → at the bottom, under **Artifacts**, **Iris-Notch-Windows** (a zip with the installer and `iris-volto.exe`, the program on its own, no install needed).

> ⚠️ **Windows SmartScreen** will say "Windows protected your PC", because the program isn't code-signed. Click **More info → Run anyway**. This happens with every unsigned program; signing requires a paid certificate.

You need **Hermes Agent 0.21 or newer**: older versions save the conversation but don't pass it back to the model, so every question is answered as if it were the first one (update with `hermes update`).

It needs **WebView2**, which is already there on up-to-date Windows 10/11. If it's missing, the installer downloads it. Nothing else to install: no Python, no runtimes.

**Where it keeps its files:** `%APPDATA%\Iris Notch` (settings, `logs\`, speech model, local voice). When you uninstall, Windows asks whether to delete the data too: tick it to start from scratch.

## 2. First start

The island appears at the top center of the screen and, until Hermes is configured, opens on the **Impostazioni** *(settings)*:

| Field | What to enter |
|---|---|
| Indirizzo *(address)* | the address of Hermes' API server, e.g. `http://<hermes-host>:8642` |
| Chiave API *(API key)* | the key you set in `API_SERVER_KEY` (see [hermes-setup.md](hermes-setup.md)) |

Press **Test**, the button next to the key:

- **Collegata · Hermes x.y** *(connected)*: all good;
- **mancano: …** *(missing)*: your Hermes version is too old for sessions, approvals or states;
- **401**: wrong key;
- **non raggiungibile** *(unreachable)*: a firewall rule, or the API server isn't listening on the network.

The key goes to the **Windows Credential Manager** (Control Panel → Credential Manager → Windows Credentials → `IrisVolto`), never to a file.

## 3. Speech to text

In the settings choose **Sul mio PC** *(on my PC)* or **Server Whisper**.

**On my PC** (recommended):

1. Pick the model:
   - `large-v3-turbo`, 574 MB: the best for Italian, runs on the GPU;
   - `small`, 190 MB: lighter.
2. Press **Scarica** *(download)*. It's downloaded once, from Hugging Face.
3. The model loads on first use (a few seconds) and leaves the GPU after the minutes you set, so it doesn't take memory away from games.

The GPU is used through **Vulkan**, which comes with the graphics drivers: no need to install CUDA.

**Whisper server**: the address of an OpenAI-compatible server (`/v1/audio/transcriptions`, e.g. speaches or faster-whisper-server) or of a `whisper.cpp server` (`/inference`).

## 4. Talking

- **Hold** `Ctrl+Alt+Space`, speak, release;
- or click the **microphone** in the island, speak, click it again.

**Here's what I heard** appears with editable text: fix it if needed and press **Send** or Enter. To skip the preview, turn on *Send right away*.

**Compact voice** (on by default, can be turned off in *Speech to text*): if you use the shortcut **while the island is closed**, the chat doesn't open. The notch stretches a little and shows what it heard:

- **Enter**, the check mark or **a short tap** of the shortcut: send;
- **Esc** or the X: cancel;
- **hold** the shortcut again: speak again from scratch.

With *Send right away* a green bar empties in a couple of seconds, then the question is sent (Esc stops it). While Iris works the notch stays small, with the status next to the eyes; the **reply** shows up inside it (scroll it with the mouse wheel) and after a few seconds the notch goes back to normal. If the agent needs **approval**, it asks in the notch: **Enter** allows once, **Esc** denies, long commands scroll with the mouse wheel. **Click the eyes** to open the full chat and see everything. Enter and Esc work even while you're typing in another app, but only for the few seconds the notch is asking for them.

## 5. Spoken replies

- **Volume della voce** *(voice volume)*, at the top of *Testo → voce*: how loud Iris speaks (and the chime). It changes right away.
- The **speaker** icon left of the text box turns automatic reading of replies on and off.
- With *Suono di arrivo* *(arrival chime)* you hear a short sound when Iris starts answering.
- Under each reply there's **Ascolta** *(listen)*, to hear it later even with reading off.

Engines:

- **On my PC (Piper)**: an Italian voice that runs on the **CPU**, so it works on modest PCs and needs no GPU. Downloaded on request, after you confirm: **about 85 MB** (program 22 MB + Paola voice 61 MB), into the app's folder.
  - **Voices**: *Paola* (female, default) and *Riccardo* (male, lighter, 27 MB, downloaded when you pick it). **Prova voce** *(try voice)* next to the menu.
  - Below the voice you see the speed of the last sentence: usually many times faster than speech (measured: 8× Paola, 15× Riccardo).
  - **Spegni la voce dopo** *(turn the voice off after)*: if unused for that long, the engine closes and frees memory; it starts again by itself on the next sentence.
- **Windows voice**: the installed voices. More can be added from Windows Settings → Time & language → Speech.
- **TTS server**: an OpenAI-compatible server (`/v1/audio/speech`), e.g. Piper or Kokoro behind openedai-speech or Kokoro-FastAPI.

## 6. Where the island lives and how it opens

- **To move it**, press and drag. At the top of the screen it's a **notch**. Pull it down and it **pops off into a bubble** you can put anywhere, even on another monitor. Bring it back to the top and it's a notch again. When it's open, grab it by the eyes: it closes and comes with you. It stays where you leave it.
- Settings → **Isola** *(island)*:
  - **Si apre** *(opens)*: on hover (immediately, or after 0.6 / 1 / 1.5 / 2 seconds) or only on click;
  - **Si richiude** *(closes)* 0.7–5 seconds after the mouse leaves; from 1 second up, a small bar counts down;
  - **Occhi che seguono** *(eyes follow)* the mouse, can be turned off;
  - **Rimettila al centro** *(put it back in the center)*.
- Settings → **Generale** *(general)*: the **language** (English or Italian: interface, local voices and transcription; the app reloads), your **birthday** (day and month: confetti on that day), **Avvia con Windows** *(start with Windows)*, the **black frame** around the eyes (0–16 px) and the **size** of the whole app (from −3 to +4 in small steps; 0 is normal).
- With the **pin** on and the island open, grabbing it by the eyes moves the whole open window. Drop it past an edge or over the taskbar and it springs back inside; otherwise it stays exactly where you left it.
- Settings → **Debug e prove** *(debug and tests)*: debug mode (detailed log), **Mostra l'area** *(show the area where the eyes play)*, latest errors and the log folder.
- Every option has a **?**: hover it to see what it does.
- **Changes only apply when you press Salva** *(save)*. As soon as you change something, **Annulla** *(cancel)* appears and the island won't close by itself until you choose. Cancel, the **back arrow**, `Esc` or the **settings icon** again discard the changes and close.

Poke the eyes 3 times in a row and it giggles; 7 times and it gets dizzy. Stroke it slowly back and forth with the mouse and it purrs; drag it fast and it squints against the wind; let it go and it lands with a bounce. If a reply arrives while the island is closed, an envelope flies in.

**By time of day**, when you open the island (once per part of the day): dark circles in the dead of night, yawning very early, coffee in the morning, sometimes a stretch in the late afternoon, relaxed with a few stars in the evening.

**The mouse** (with *Occhi che seguono*): its mood changes every 2–6 minutes, so sometimes it follows you closely and sometimes it barely cares. If the mouse flies across the screen it gets startled, and now and then dizzy. Leave the computer alone for 12 minutes and it takes a nap; the first mouse move wakes it up.

**Animations.** Each state (listening, thinking, using a tool, speaking, done, approval, error, asleep) has a few versions, picked at random. **Surprise easter eggs** come on a random timer: the first 3–10 minutes after start, then every 5–40 minutes, never the same twice in a row, only while the island is closed and still.

**Dates and events:** New Year, Epiphany, Valentine's Day, Carnival and Easter (computed every year), April Fools', Italian national days, spring, summer, autumn, Halloween, Christmas, Friday the 17th, full-moon nights, morning coffee, your birthday; and **around the world**: Lunar New Year, Holi and Diwali (lunar dates up to 2035), Pi Day, St. Patrick's Day, Hanami, Earth Day, Star Wars Day, July 4th, Bastille Day, Oktoberfest, Día de los Muertos, Thanksgiving. On those days, six times out of ten the surprise is the holiday's, and it greets you with it at start.

**Your own animations.** Put `.json` files in `%APPDATA%\Iris Notch\animazioni` describing eyes and shapes at key moments: no code, so they're safe even if you download them. The folder has a **GUIDA.md** with every rule and measure (in Italian) and an example to copy. From *Debug e prove*: **Cartella** *(folder)*, **Ricarica** *(reload)* and **Prova le mie** *(try mine)*. Without dates they join the daily surprises; with `quando` they play on their days or hours.

## 7. Sessions

The title at the top opens the menu:

- **Dall'isola** *(from the island)*: the latest conversations started here;
- **Altre sessioni ▸** *(other sessions)*: all the others (Telegram, CLI, scheduled jobs), with search. Pick one to continue it there, with all its context;
- **＋**: new conversation;
- hovering a session shows three buttons:
  - **pin**: keeps it at the top, under **Fissate** *(pinned)*, even if it's from Telegram or elsewhere. Saved by Hermes; with old Hermes versions the app remembers it;
  - **pencil** (or **double-click the title** at the top): rename. The new name is saved on Hermes, so you see it everywhere;
  - **bin**: deletes the session on Hermes, after a confirmation in the row. Can't be undone.

## 8. Other useful things

| | |
|---|---|
| `Ctrl+Alt+I` | opens and closes the island |
| 📌 | keeps it open even when the mouse leaves |
| `Esc` | closes settings, voice preview or the island |
| Notification-area icon | *open / close the island* and **quit Iris Notch** (the app isn't on the taskbar) |
| Start with Windows | in the settings, General section |
| Updates | twice a day it checks GitHub; a green dot on the settings icon and "New version" under the version number tell you one is out: download and install it yourself |

## Known issues

- **Dragging:** since 0.2.0 the window no longer moves while you drag (only the island moves inside the page): no trails, disappearing or ghost images. If you still see glitches, open an *issue* on GitHub with a video.
- **Local transcription** has had little testing with real models so far. If it doesn't work, check **Debug e prove → Ultimi errori** *(latest errors)*.
- **Shortcuts:** in the settings, click the field and press the combination (e.g. `Ctrl+Shift+K`): it's recorded for you. It needs at least one of Ctrl, Alt, Shift and Win, or an F1-F24 key; Esc cancels. If another program already uses a shortcut, Windows won't assign it.
- **If something goes wrong:** turn on **debug mode**, do it again and open an *issue* on GitHub with the **latest errors** attached (the log never contains your keys).
