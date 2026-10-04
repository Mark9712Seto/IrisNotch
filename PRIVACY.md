# Privacy

Iris Notch has no account, no telemetry and no analytics. It only talks to the services listed here.

| What | Where it goes | When |
|---|---|---|
| Your messages, the agent's replies, session names | **only the Hermes server you configure** | when you use the island |
| Your voice (audio) | transcribed **on your PC**, or on **your own** Whisper server if you choose that | while you hold push-to-talk |
| Spoken replies | generated on your PC (local voice), by Windows, or by **your own** TTS server | when spoken replies are on |
| API keys | Windows Credential Manager on your PC | — |
| Model downloads | Hugging Face (Whisper models and Piper voices) | only when you press "Download" |
| Local-voice program | GitHub (Piper release) | only when you confirm the local-voice install |
| Update check | GitHub API, reads the latest release number | at start and every 6 hours |

Settings are stored in a JSON file in the app's data folder (`%APPDATA%\Iris Notch`). Uninstalling the app and deleting that folder removes everything Iris Notch stored, including downloaded models. Keys can be deleted from the Credential Manager (entries starting with `IrisVolto`).

## The website

The project website (GitHub Pages) and the browser demo send nothing anywhere: the demo talks to a pretend Hermes that lives in the page. The pages load their fonts from Google Fonts, and GitHub hosts them, so both see the usual request data (IP address, browser) under their own privacy policies.

## Hermes

What Hermes does with your messages depends on your Hermes setup and on the model provider it uses: Iris Notch has no control over that.

---

**Italiano.** Iris Notch non ha account, statistiche d'uso o tracciamento. Le conversazioni vanno solo al server Hermes che indichi tu. La voce viene trascritta sul PC o sul tuo server Whisper. Le chiavi restano nel Gestore credenziali di Windows. Internet serve solo per scaricare i modelli quando lo chiedi, per installare la voce locale quando confermi e per controllare se c'è una versione nuova su GitHub.
