# Contributing

Thanks for wanting to help!

- **UI** (`app/ui`): plain JavaScript, no build step. Open `design/isola-demo.html` (rebuild it with `python3 tools/bundle_demo.py`) to try changes in a browser with a fake Hermes.
- **Eyes and animations** (`app/ui/eyes.js`): every state is a set of eye parameters (size, gaze, lids, tilt, cheeks), and transitions are interpolated. Easter eggs are entries in `EGGS`. All motion goes through SVG attributes from JS: CSS animations on SVG groups blur in Chromium.
- **Backend** (`app/src-tauri`): Rust. `cargo test` runs the unit tests. With `python3 tools/mock_hermes.py` running, `cargo test -- --include-ignored` also runs the end-to-end test against the fake Hermes.
- **Website** (`site/`): static HTML, published by `.github/workflows/pages.yml`, which also copies `app/ui/eyes.js` and the browser demo next to it. To try it locally, copy those files into a folder with `site/` and `docs/images/` as the workflow does.
- Please keep the UI text short and plain, and don't widen what the island can approve.

## License of contributions

Iris Notch is licensed under the PolyForm Noncommercial License 1.0.0. By opening a pull request, you agree that your contribution is licensed under the same terms, and that Variety Project may also include it in versions released under other terms (for example, if the project ever moves to a more open license).
