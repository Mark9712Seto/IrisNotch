# Third-party software

Iris Notch is built on these projects, each under its own license. Their licenses apply to their code; the PolyForm Noncommercial license applies only to Iris Notch' own code.

| Component | Use | License |
|---|---|---|
| [Tauri](https://tauri.app) and plugins | desktop app framework | MIT / Apache-2.0 |
| [whisper.cpp](https://github.com/ggml-org/whisper.cpp) via [whisper-rs](https://github.com/tazz4843/whisper-rs) | local speech-to-text | MIT / Unlicense |
| Whisper models (OpenAI, ggml conversion) | downloaded on request | MIT |
| [Piper](https://github.com/rhasspy/piper) (with espeak-ng and ONNX Runtime, bundled in its release) | local text-to-speech, downloaded on request | MIT (espeak-ng: GPL-3.0, ONNX Runtime: MIT) |
| Piper voices `it_IT-paola-medium`, `it_IT-riccardo-x_low` ([rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices)) | Italian voices, downloaded on request | see each voice's `MODEL_CARD` |
| [cpal](https://github.com/RustAudio/cpal), [reqwest](https://github.com/seanmonstar/reqwest), [keyring](https://github.com/hwchen/keyring-rs), serde, tokio and other Rust crates | audio, network, key storage | MIT / Apache-2.0 |

The website uses the fonts [Bricolage Grotesque](https://fonts.google.com/specimen/Bricolage+Grotesque), [Figtree](https://fonts.google.com/specimen/Figtree) and [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) from Google Fonts (SIL Open Font License 1.1).

Iris Notch is an independent project. It is not affiliated with or endorsed by Nous Research (Hermes Agent), the Piper project, or OpenAI.
