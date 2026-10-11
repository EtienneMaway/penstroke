# Roadmap

Where penstroke is going. Ordered by how much each item improves the videos people actually get.

## 1. Voice and platform

- [x] **Kokoro as the default free voice** (used automatically once installed; built-in voice is the fallback). The built-in `say` voice is robotic and resets its intonation at every beat. A local human-sounding voice improves every video.
- [ ] **Windows and Linux as first-class.** A Windows CI job and a `file://` path fix are in; the job is allowed to fail until its first green run, then it becomes a gate. Linux is already a gate.
- [x] **`doctor` command** (`node scripts/doctor.js`). Check Node, ffmpeg, Playwright and the voice, and say exactly what is missing.

## 2. Better drawing

- [x] **Icon library** (`icon('cloud', x, y, p)`, 24 icons, `examples/icons.js`). More icons and shapes welcome.
- [ ] **True handwriting animation.** Text drawn stroke by stroke instead of typed in a font.
- [ ] **Auto-layout.** Automatic spacing and overlap detection instead of placing everything by pixel coordinates.
- [x] **Camera moves** (`cam: { rect }`, `{ x, y, zoom }`, `false`; `examples/camera.js`).

## 3. Easier to use

- [x] **Fast preview** (`--sheet` about 1s, `--preview` small and 12 fps).
- [x] **Re-render some beats** (`--beats 4-6`).
- [x] **Captions** (`.srt` every render, `KHAN_CAPTIONS=burn` to draw them in). Burned-in captions and exported `.srt` files for sound-off viewing.
- [x] **Music and sound effects.** Music is only a file you pass (`--music path`, looped and ducked under the voice); `--sfx` adds an optional pen scratch. No generated music.

## 4. Reach

- [x] **Export presets** (`--preset tiktok|reels|shorts|square|instagram|linkedin|youtube`).
- [ ] **Translate a finished video.** Reuse the same drawings with new narration in another language.
- [ ] **Web or desktop app.** A wrapper so non-developers can use it without a terminal.

## 5. Trust

- [x] **Output checks** (`WARN` for empty beats, arrows through labels or icons, tiny text and the phone-UI zone; `tests/lint/` proves each fires).
- [x] **Example gallery in the README** (`docs/gallery/`, made with `scripts/gif.js`).
- [ ] **Speed and caching** for long videos.

## Suggested first four

1. A great default voice (Kokoro).
2. An icon and shape library.
3. A fast preview.
4. Captions.

---

penstroke is based on [khan-explainer](https://github.com/haiderfarooq3/khan-explainer) by Haider Farooq (MIT).
