# Roadmap

Where penstroke is going. Ordered by how much each item improves the videos people actually get.

## 1. Voice and platform

- [x] **Kokoro as the default free voice** (used automatically once installed; built-in voice is the fallback). The built-in `say` voice is robotic and resets its intonation at every beat. A local human-sounding voice improves every video.
- [ ] **Windows and Linux as first-class.** Tested espeak-ng or Kokoro path, and clear install errors instead of macOS-only assumptions.
- [x] **`doctor` command** (`node scripts/doctor.js`). Check Node, ffmpeg, Playwright and the voice, and say exactly what is missing.

## 2. Better drawing

- [x] **Icon library** (`icon('cloud', x, y, p)`, 24 icons, `examples/icons.js`). More icons and shapes welcome.
- [ ] **True handwriting animation.** Text drawn stroke by stroke instead of typed in a font.
- [ ] **Auto-layout.** Automatic spacing and overlap detection instead of placing everything by pixel coordinates.
- [ ] **Camera moves.** Zoom and pan to a region while drawing, so large diagrams stay readable.

## 3. Easier to use

- [x] **Fast preview** (`--sheet` about 1s, `--preview` small and 12 fps).
- [x] **Re-render some beats** (`--beats 4-6`).
- [x] **Captions** (`.srt` every render, `KHAN_CAPTIONS=burn` to draw them in). Burned-in captions and exported `.srt` files for sound-off viewing.
- [ ] **Music and sound effects.** Soft background music and a pen or chalk sound while drawing.

## 4. Reach

- [ ] **Export presets** for YouTube, TikTok, Reels and LinkedIn with the right sizes and lengths.
- [ ] **Translate a finished video.** Reuse the same drawings with new narration in another language.
- [ ] **Web or desktop app.** A wrapper so non-developers can use it without a terminal.

## 5. Trust

- [ ] **Output checks in tests.** Verify nothing overlaps or runs off the board, not just that renders finish.
- [ ] **Example gallery in the README.** Visible sample videos so people can judge it in seconds.
- [ ] **Speed and caching** for long videos.

## Suggested first four

1. A great default voice (Kokoro).
2. An icon and shape library.
3. A fast preview.
4. Captions.

---

penstroke is based on [khan-explainer](https://github.com/haiderfarooq3/khan-explainer) by Haider Farooq (MIT).
