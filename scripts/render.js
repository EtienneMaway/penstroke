#!/usr/bin/env node
// Render a blackboard explainer:  node render.js <scene.js> <out.mp4>
// The voice drives the clock: each beat is spoken first and its measured length
// times that beat's drawing, so voice and pen stay in sync without guessing.
const { execFileSync, spawn, spawnSync } = require('child_process');
const { once } = require('events');
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');

const die = m => { console.error(m); process.exit(1); };
// Flags: --preview (small, 12 fps, built-in voice unless the real takes are cached), --beats 3 or 3-5 (only those beats,
// with their audio), --sheet (no video at all: just the layout contact sheet, in seconds).
const argv = process.argv.slice(2), pos = [], opt = {};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--preview' || a === '--sheet' || a === '--no-captions' || a === '--music' || a === '--sfx') opt[a.slice(2)] = true;
  else if (a === '--preset') opt.preset = argv[++i];
  else if (a === '--beats' || a === '--beat') opt.beats = argv[++i];
  else if (a.startsWith('--')) die(`unknown flag ${a}`);
  else pos.push(a);
}
const [sceneFile, out] = pos;
if (!sceneFile || (!out && !opt.sheet)) die('usage: node render.js <scene.js> <out.mp4> [--preview] [--beats 3-5]\n       node render.js <scene.js> --sheet');
const PREVIEW = !!(opt.preview || opt.sheet);
// Export formats. A scene keeps its own shape; if it is not the preset's shape it is centred on a taller or wider board of
// the same colour, so nothing is cropped or stretched. Vertical formats put the captions on the empty board under the drawing.
const SQUARE = { w: 1080, h: 1080, captions: true };
const PRESETS = { tiktok: { w: 1080, h: 1920, captions: true }, reels: { w: 1080, h: 1920, captions: true }, shorts: { w: 1080, h: 1920, captions: true },
                  youtube: { w: 1920, h: 1080 }, square: SQUARE, instagram: SQUARE, linkedin: SQUARE };
const preset = opt.preset ? PRESETS[opt.preset] : null;
if (opt.preset && !preset) die(`unknown preset '${opt.preset}'. Presets: ${Object.keys(PRESETS).join(', ')}`);
const FPS = PREVIEW ? 12 : 30, LEAD = 0.3, GAP = 0.15, TAIL = 1.0;   // seconds: before the first word, between beats, hold at the end
const MAC = process.platform === 'darwin';   // elsewhere espeak-ng stands in for `say`: rougher, but it speaks about a hundred languages
let chromium;
try { ({ chromium } = require('playwright')); }
catch { die(`playwright missing. Run: node ${__dirname}/doctor.js`); }

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'khan-'));
const probe = f => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]));
const jpeg = dataUrl => Buffer.from(dataUrl.split(',')[1], 'base64');

// ponytail: one `say` take per beat, so intonation resets at every beat and the voice is robotic.
// Upgrade: a single full take + forced alignment (whisper.cpp) for word timings, or return a
// Chatterbox/Piper file from here for a human voice. Anything that writes an audio file works.
// A scene's `lang` picks the free voice that speaks it; `voice` names one outright.
const SAY = { en: 'Samantha', ar: 'Majed', he: 'Carmit', hi: 'Lekha', zh: 'Tingting', ja: 'Kyoko', ko: 'Yuna', th: 'Kanya',
              ru: 'Milena', el: 'Melina', tr: 'Yelda', id: 'Damayanti', es: 'Mónica', fr: 'Thomas', de: 'Anna', it: 'Alice', pt: 'Luciana',
              bn: 'Piya', ta: 'Vani', te: 'Geeta', kn: 'Soumya', uk: 'Lesya', vi: 'Linh', pl: 'Zosia', nl: 'Xander', sv: 'Alva', ms: 'Amira' };
const ESPEAK = { en: 'en-us', zh: 'cmn' };   // every other code is espeak-ng's own: ur, fa, bn, ta, ...
function voiceFor(meta) {
  const lang = meta.lang || 'en';
  if (!MAC) {
    try { execFileSync('espeak-ng', ['--version'], { stdio: 'ignore' }); }
    catch { die('the free voice needs macOS `say`, or espeak-ng on other systems (apt install espeak-ng)'); }
    return meta.voice || ESPEAK[lang] || lang;
  }
  const voice = meta.voice || SAY[lang];
  if (!voice) die(`macOS has no built-in voice for lang '${lang}'. Name one with \`voice\`, or use \`eleven\` or \`audio\`.`);
  if (!execFileSync('say', ['-v', '?'], { encoding: 'utf8' }).split('\n').some(l => l.startsWith(voice + ' ')))
    die(`the voice ${voice} is not installed. Add it in System Settings > Accessibility > Spoken Content > System voice > Manage Voices.`);
  return voice;
}
function tts(text, i, voice, rate) {
  const txt = path.join(tmp, `${i}.txt`), audio = path.join(tmp, MAC ? `${i}.aiff` : `${i}.wav`);
  fs.writeFileSync(txt, text);
  if (MAC) execFileSync('say', ['-v', voice, '-r', String(rate), '-o', audio, '-f', txt]);
  else execFileSync('espeak-ng', ['-v', voice, '-s', String(rate), '-w', audio, '-f', txt]);
  return audio;
}

// Optional human voice: put ELEVENLABS_API_KEY in the environment and `eleven: '<voice id>'` on the scene.
// The whole script is read in ONE take, so it flows like one person talking, then cut back into beats
// at the character times the API returns. Takes are cached beside the scene, so re-rendering the same
// words costs nothing: fix the drawing as often as you like.
async function elevenTakes(beats, opt, dir) {
  const o = typeof opt === 'string' ? { voice: opt } : opt;
  if (!o.voice) die('`eleven` needs a voice id: eleven: \'<voice id>\' or eleven: { voice: \'<voice id>\' }');
  const said = beats.map((b, i) => ({ i, text: b.say })).filter(b => b.text), text = said.map(b => b.text).join(' ');
  const body = JSON.stringify({ text, model_id: o.model || 'eleven_multilingual_v2', voice_settings: o.settings });
  const cache = path.join(dir, '.voice', crypto.createHash('sha1').update(o.voice + body).digest('hex').slice(0, 12) + '.json');
  if (!fs.existsSync(cache)) {
    const key = process.env.ELEVENLABS_API_KEY;
    if (!key) die('the scene sets `eleven`, so ELEVENLABS_API_KEY must be set. Remove `eleven` to use the free Mac voice.');
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${o.voice}/with-timestamps`, { method: 'POST', headers: { 'xi-api-key': key, 'content-type': 'application/json' }, body });
    if (!r.ok) die(`ElevenLabs ${r.status}: ${await r.text()}`);
    fs.mkdirSync(path.dirname(cache), { recursive: true });
    fs.writeFileSync(cache, await r.text());
  }
  const take = JSON.parse(fs.readFileSync(cache)), { character_start_times_seconds: starts, character_end_times_seconds: ends } = take.alignment;
  if (starts.length !== text.length) die(`ElevenLabs timed ${starts.length} characters for a ${text.length}-character script. Keep \`say\` to plain text.`);
  const mp3 = path.join(tmp, 'take.mp3'), wav = path.join(tmp, 'take.wav');
  fs.writeFileSync(mp3, Buffer.from(take.audio_base64, 'base64'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', mp3, '-ar', '48000', wav]);
  // Cut halfway through the pause between one beat's last character and the next beat's first, on a
  // whole millisecond, so the pieces land back together sample-exact.
  const cuts = [0];
  let pos = 0;
  said.slice(0, -1).forEach(b => { pos += b.text.length + 1; cuts.push(Math.round((ends[pos - 2] + starts[pos]) * 500) / 1000); });
  cuts.push(probe(wav));
  return Object.fromEntries(said.map((b, k) => {
    const f = path.join(tmp, `${b.i}.wav`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-af', `atrim=start=${cuts[k]}:end=${cuts[k + 1]}`, f]);
    return [b.i, f];
  }));
}

// Local human voice, on by default once installed. `kokoro: 'am_michael'` or { voice, speed } picks a voice,
// `kokoro: false` or KHAN_TTS=say turns it off. Free and offline after the first model download; it speaks
// English, Spanish, French, Hindi, Italian, Japanese, Portuguese and Chinese. Takes are cached beside the scene.
const KOKORO = { en: 'af_heart', 'en-gb': 'bf_emma', es: 'ef_dora', fr: 'ff_siwis', hi: 'hf_alpha', it: 'if_sara', ja: 'jf_alpha', pt: 'pf_dora', zh: 'zf_xiaobei' };
// Which Python runs Kokoro: KHAN_PYTHON, else the project's own .venv, else python3.
const venvPy = path.join(__dirname, '..', '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const PYTHON = process.env.KHAN_PYTHON || (fs.existsSync(venvPy) ? venvPy : 'python3');
const hasKokoro = () => spawnSync(PYTHON, ['-c', 'import importlib.util as u,sys; sys.exit(0 if u.find_spec("kokoro") and u.find_spec("soundfile") else 1)'], { stdio: 'ignore' }).status === 0;

// Kokoro is the default voice whenever it is installed and speaks the scene's language. `kokoro: false` on a scene
// or KHAN_TTS=say keeps the built-in voice. `kokoro: ...` or KHAN_TTS=kokoro demand it and fail loudly if they cannot have it.
// Returns { takes, forced } or null.
function kokoroTakes(meta, dir) {
  if (meta.kokoro === false || process.env.KHAN_TTS === 'say') return null;
  const forced = !!meta.kokoro || process.env.KHAN_TTS === 'kokoro';
  const o = typeof meta.kokoro === 'string' ? { voice: meta.kokoro } : meta.kokoro === true || !meta.kokoro ? {} : meta.kokoro;
  const voice = o.voice || KOKORO[meta.lang || 'en'];
  if (!voice) {
    if (meta.kokoro) die(`Kokoro does not speak lang '${meta.lang}'. It speaks ${Object.keys(KOKORO).join(', ')}.`);
    return null;   // this language keeps the built-in voice
  }
  if (!hasKokoro()) {
    if (forced) die(`Kokoro is not installed for ${PYTHON}. Install it with: ${PYTHON} -m pip install kokoro soundfile (Python 3.10+; or: uv venv --python 3.11 .venv && uv pip install --python .venv/bin/python kokoro soundfile)`);
    return null;   // not installed: quietly use the built-in voice
  }
  const said = meta.beats.map((b, i) => ({ i, text: b.say })).filter(b => b.text), speed = o.speed || 1;
  const cache = path.join(dir, '.voice', 'kokoro');
  const lines = said.map(b => ({ i: b.i, text: b.text, out: path.join(cache, crypto.createHash('sha1').update(`${voice} ${speed} ${b.text}`).digest('hex').slice(0, 12) + '.wav') }));
  const todo = lines.filter(l => !fs.existsSync(l.out));
  if (PREVIEW && todo.length && !process.env.KHAN_TTS) { console.log('preview: Kokoro takes are not cached yet, using the built-in voice (timings will differ from the final render)'); return null; }
  if (todo.length) {
    fs.mkdirSync(cache, { recursive: true });
    const r = spawnSync(PYTHON, [path.join(__dirname, 'kokoro_tts.py')], { input: JSON.stringify({ voice, speed, lines: todo }), stdio: ['pipe', 'inherit', 'inherit'] });
    if (r.status !== 0) {
      if (forced) die(`Kokoro failed. Install it with: ${PYTHON} -m pip install kokoro soundfile (set KHAN_PYTHON to use another Python)`);
      console.error('Kokoro failed, using the built-in voice instead. Set KHAN_TTS=kokoro to see the error as a failure.');
      return null;
    }
  }
  return Object.fromEntries(lines.map(l => [l.i, l.out]));
}

(async () => {
  const browser = await chromium.launch(), page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(require('url').pathToFileURL(path.join(__dirname, 'board.html')).href);   // a plain 'file://' + path is invalid for C:\ paths
  // The scene gets its own scope: a scene variable named like a helper (box, line, ring) must not be a redeclaration error.
  await page.addScriptTag({ content: `(() => {\n${fs.readFileSync(path.resolve(sceneFile), 'utf8')}\n})();` });
  const meta = await page.evaluate(() => window.sceneMeta());
  if (errs.length || !meta) die(`scene failed to load: ${errs.join('; ') || 'scene({...}) was never called'}`);

  let outSize = null;   // the video's pixel size when a preset sets it
  if (preset) {
    const [W, H] = meta.size, A = preset.w / preset.h, pad = { l: 0, t: 0, r: 0, b: 0 };
    if (W / H > A * 1.01) { const extra = W / A - H; pad.t = Math.round(extra * 0.3); pad.b = Math.round(extra) - pad.t; }   // wider than the format: board goes in the upper middle, captions below
    else if (W / H < A / 1.01) pad.l = pad.r = Math.round((H * A - W) / 2);                                                 // narrower: margins at the sides
    const k = (PREVIEW ? 0.5 : 1) * preset.w / (W + pad.l + pad.r);
    outSize = [Math.round(preset.w * (PREVIEW ? 0.5 : 1) / 2) * 2, Math.round(preset.h * (PREVIEW ? 0.5 : 1) / 2) * 2];
    await page.evaluate(([p, s]) => { window.setPad(p); window.setScale(s); }, [pad, k]);
  } else if (PREVIEW) await page.evaluate(() => window.setScale(0.5));   // a third of the pixels: frames come out much faster
  if (process.env.KHAN_THEME) await page.evaluate(t => window.setTheme(t), process.env.KHAN_THEME);   // KHAN_THEME=light re-skins any scene
  // Screenshot backgrounds go in as data URLs: a file:// image would taint the canvas and block toDataURL.
  const dir = path.dirname(path.resolve(sceneFile));
  const mime = f => 'image/' + ({ jpg: 'jpeg' }[path.extname(f).slice(1).toLowerCase()] || path.extname(f).slice(1).toLowerCase());
  await page.evaluate(m => window.loadImages(m), Object.fromEntries(meta.bgs.map(f => [f, `data:${mime(f)};base64,` + fs.readFileSync(path.resolve(dir, f)).toString('base64')])));

  const takes = meta.eleven && !meta.audio ? await elevenTakes(meta.beats, meta.eleven, dir) : null;
  const kok = !meta.audio && !takes ? kokoroTakes(meta, dir) : null;
  const voice = meta.audio || takes || kok ? null : voiceFor(meta);
  if (!meta.audio) console.log(`voice ${takes ? 'ElevenLabs' : kok ? 'Kokoro' : voice}`);
  const gap = meta.gap ?? (takes ? 0 : GAP);   // scene-level `gap` slows the pace: more air between beats. One take already has its own pauses.
  let at = LEAD;
  const clips = [];
  let timings, total;
  if (meta.audio) {
    // Recorded voice: the audio file is the clock. Each beat starts at its `at` (seconds into the
    // file, from a word-level transcript) and draws until the next beat starts, or for its `dur`.
    const f = path.resolve(dir, meta.audio);
    total = probe(f) + TAIL / 2;   // a short hold on the finished board after the last word
    clips.push({ f, at: 0 });
    timings = meta.beats.map((b, i) => {
      if (typeof b.at !== 'number') die(`beat ${i + 1} needs \`at\` (seconds into ${meta.audio})`);
      const next = meta.beats[i + 1]?.at ?? total;
      if (next <= b.at) die(`beat ${i + 1} starts at ${b.at}s, not before the next beat (${next}s)`);
      return { start: b.at, dur: Math.min(b.dur || Infinity, next - b.at - 0.02) };   // finish a hair early, so the QA frame of a beat is not the next beat's wiped board
    });
  } else {
    timings = meta.beats.map((b, i) => {
      let dur = b.dur || 1;
      if (b.say) { const f = takes ? takes[i] : kok ? kok[i] : tts(b.say, i, voice, meta.rate); dur = probe(f); clips.push({ f, at }); }
      const t = { start: at, dur: gap < 0.03 ? dur - 0.02 : dur };   // back to back, finish a hair early: the QA frame must not be the next beat's board
      at += dur + gap;
      return t;
    });
    total = at - gap + TAIL;
  }
  await page.evaluate(t => window.setTimings(t), timings);
  await page.evaluate(() => document.fonts.ready);

  // --beats 3 or 3-5: render only that stretch of the timeline, with a beat of lead-in and tail.
  let first = 0, last = timings.length - 1;
  if (opt.beats) {
    const m = /^(\d+)(?:-(\d+))?$/.exec(opt.beats);
    if (!m) die('--beats takes a beat number or a range: --beats 3 or --beats 3-5');
    first = +m[1] - 1; last = +(m[2] || m[1]) - 1;
    if (first < 0 || last >= timings.length || first > last) die(`--beats ${opt.beats}: this scene has beats 1 to ${timings.length}`);
  }
  const ranged = first > 0 || last < timings.length - 1;
  const t0 = ranged ? Math.floor(Math.max(0, timings[first].start - 0.25) * FPS) / FPS : 0;
  const t1 = ranged ? Math.min(total, timings[last].start + timings[last].dur + 0.5) : total;
  const span = t1 - t0;

  // Sound that is not speech: a pen scratch that follows the drawing, a swipe when the board is wiped, and a quiet music bed.
  // Scene: `sfx: true`, `music: true` (a soft synthesised pad) or `music: 'bed.mp3'` (your own file, looped and ducked under
  // the voice), each also `{ ..., volume }`. Flags --sfx and --music turn them on for any scene.
  const extras = [];   // { file, kind, volume, loop }
  const sfxOpt = meta.sfx === false ? null : (meta.sfx || opt.sfx) ? (typeof meta.sfx === 'object' ? meta.sfx : {}) : null;
  const musicOpt = meta.music === false ? null : (meta.music || opt.music) ? (typeof meta.music === 'object' ? meta.music : typeof meta.music === 'string' ? { src: meta.music } : {}) : null;
  if (!opt.sheet && (sfxOpt || musicOpt)) {
    const fx = require('./sfx');
    if (sfxOpt) {
      const STEP = 0.04;
      const track = await page.evaluate(([n, s]) => window.penTrack(n, s), [total, STEP]);
      const wipes = timings.map((t, i) => (meta.beats[i].wipe && i > 0 ? t.start : -1)).filter(t => t >= 0);
      const f = path.join(tmp, 'sfx.wav');
      fx.writeWav(f, fx.mixTracks(fx.scratch(fx.runs(track, STEP), total), fx.swipes(wipes, total)));
      extras.push({ file: f, kind: 'sfx', volume: sfxOpt.volume ?? 0.4 });
    }
    if (musicOpt) {
      let f = musicOpt.src ? path.resolve(dir, musicOpt.src) : null;
      if (f && !fs.existsSync(f)) die(`music file not found: ${musicOpt.src} (paths are relative to the scene file)`);
      if (!f) { f = path.join(tmp, 'music.wav'); fx.writeWav(f, fx.pad(total)); }
      extras.push({ file: f, kind: 'music', volume: musicOpt.volume ?? (musicOpt.src ? 0.25 : 0.5), loop: !!musicOpt.src });
    }
  }

  if (!opt.sheet) {
    const args = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-'];
    clips.forEach(c => args.push('-i', c.f));
    // With sound extras but no speech at all, a silent input stands in for the voice so there is something to mix onto.
    const silent = !clips.length && extras.length;
    if (silent) args.push('-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo');
    extras.forEach(e => { if (e.loop) args.push('-stream_loop', '-1'); args.push('-i', e.file); });
    const nIn = n => 1 + clips.length + (silent ? 1 : 0) + n;   // input number of the n-th extra
    const out_ = ranged ? 'full' : 'a';
    if (clips.length || silent) {
      const delayed = clips.map((c, i) => `[${i + 1}:a]aresample=48000,adelay=${Math.round(c.at * 1000)}:all=1[a${i}]`).join(';');
      const voice = clips.length
        ? `${delayed};${clips.map((_, i) => `[a${i}]`).join('')}amix=inputs=${clips.length}:normalize=0[vraw]`
        : `[${1 + clips.length}:a]aresample=48000[vraw]`;
      let graph;
      if (!extras.length) graph = `${voice};[vraw]apad[${out_}]`;
      else {
        const st = 'aformat=channel_layouts=stereo';
        const music = extras.findIndex(e => e.kind === 'music'), sfx = extras.findIndex(e => e.kind === 'sfx');
        const parts = [voice, `[vraw]${st}${music >= 0 ? ',asplit=2[vd][vs]' : '[vd]'}`];
        const labels = ['[vd]'];
        if (music >= 0) {
          const e = extras[music], fadeAt = Math.max(0, total - 1.5);
          parts.push(`[${nIn(music)}:a]aresample=48000,${st},volume=${e.volume},afade=t=in:d=1,afade=t=out:st=${fadeAt.toFixed(2)}:d=1.5[m0]`);
          parts.push('[m0][vs]sidechaincompress=threshold=0.04:ratio=10:attack=30:release=600[md]');   // the music ducks while someone speaks
          labels.push('[md]');
        }
        if (sfx >= 0) { parts.push(`[${nIn(sfx)}:a]aresample=48000,${st},volume=${extras[sfx].volume}[sx]`); labels.push('[sx]'); }
        parts.push(`${labels.join('')}amix=inputs=${labels.length}:normalize=0:duration=longest,apad[${out_}]`);
        graph = parts.join(';');
      }
      const cut = ranged ? `;[full]atrim=start=${t0.toFixed(3)}:end=${t1.toFixed(3)},asetpts=PTS-STARTPTS[a]` : '';
      args.push('-filter_complex', graph + cut, '-map', '0:v', '-map', '[a]', '-c:a', 'aac', '-b:a', '160k', '-ac', '2');
    }
    if (outSize) args.push('-vf', `scale=${outSize[0]}:${outSize[1]}`);
    args.push('-t', span.toFixed(3), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', PREVIEW ? '30' : '18', '-movflags', '+faststart', out);
    const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });
    const burn = (process.env.KHAN_CAPTIONS === 'burn' || (preset?.captions && !meta.audio)) && !opt['no-captions'];
    if (burn) await page.evaluate(() => window.setCaptions(true));
    for (let i = Math.round(t0 * FPS); i < Math.round(t0 * FPS) + Math.ceil(span * FPS); i++) {
      const buf = jpeg(await page.evaluate(t => window.frame(t), i / FPS));
      if (!ff.stdin.write(buf)) await once(ff.stdin, 'drain');
    }
    ff.stdin.end();
    await once(ff, 'close');
    if (burn) await page.evaluate(() => window.setCaptions(false));   // the QA sheet shows the bare board
  }

  // QA sheet: the board as it stands at the end of every beat, tiled into one image.
  for (let i = first; i <= last; i++)
    fs.writeFileSync(path.join(tmp, `b${String(i - first).padStart(3, '0')}.jpg`), jpeg(await page.evaluate(t => window.frame(t), timings[i].start + timings[i].dur + 0.01)));   // +0.01: land past the beat's last stroke
  const sheet = path.join(tmp, 'sheet.jpg');
  const tall = outSize ? outSize[0] < outSize[1] : meta.size[0] < meta.size[1];
  const cols = tall ? 6 : 3;   // a vertical board tiles six across so the sheet stays readable
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '1', '-i', path.join(tmp, 'b%03d.jpg'),
    '-vf', `scale=${cols === 3 ? 640 : 300}:-1,tile=${cols}x${Math.ceil((last - first + 1) / cols)}`, '-frames:v', '1', sheet]);
  const warns = await page.evaluate(() => window.warnings());
  await browser.close();

  timings.forEach((t, i) => console.log(`beat ${i + 1}  ${t.start.toFixed(2)}s  +${t.dur.toFixed(2)}s  ${meta.beats[i].say || (meta.audio ? '' : '(silent)')}`));
  warns.forEach(w => console.log('WARN ' + w));
  console.log('sheet ' + sheet);
  // Captions: one cue per spoken beat, written beside the video as .srt. KHAN_CAPTIONS=burn also draws them into the picture itself.
  // A real-audio scene's `say` is only a note of what the speaker says, so it gets no captions.
  if (!meta.audio && out && !opt.sheet && !ranged && !PREVIEW) {
    const stamp = t => { const ms = Math.round(t * 1000), z = (n, w = 2) => String(n).padStart(w, '0');
      return `${z(Math.floor(ms / 3600000))}:${z(Math.floor(ms / 60000) % 60)}:${z(Math.floor(ms / 1000) % 60)},${z(ms % 1000, 3)}`; };
    const cues = timings.map((t, i) => ({ t, text: meta.beats[i].say })).filter(c => c.text);
    const srt = out.replace(/\.[^.\/]+$/, '') + '.srt';
    fs.writeFileSync(srt, cues.map((c, i) => `${i + 1}\n${stamp(c.t.start)} --> ${stamp(c.t.start + c.t.dur)}\n${c.text}\n`).join('\n'));
    console.log('captions ' + srt);
  }
  if (opt.sheet) return console.log('ok layout only: no video written');
  const got = probe(out);
  if (Math.abs(got - span) > 0.15) die(`FAIL ${out} is ${got}s, expected ${span.toFixed(2)}s`);
  console.log(`ok ${out} ${got.toFixed(2)}s${ranged ? ` (beats ${first + 1}-${last + 1})` : ''}${PREVIEW ? ' preview' : ''}`);
})().catch(e => die(e.stack || String(e)));
