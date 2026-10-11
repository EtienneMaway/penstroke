// Synthesised sound for penstroke: a pen scratch that follows the drawing, a swipe when the board is wiped, and a soft
// chord pad for music. Everything is generated here from noise and sine waves, so there is nothing to license and no
// API to call. Mono, 48 kHz, written as a 16-bit WAV that render.js mixes in.
const fs = require('fs');

const SR = 48000;
// Seeded noise: the same scene always gets the same scratch.
const rng = seed => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;

function writeWav(file, samples) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + samples.length * 2, 4); buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  fs.writeFileSync(file, buf);
}

// Turn a per-sample boolean-ish track into runs: [[start, end], ...] in seconds, gaps under `gap` bridged, specks dropped.
function runs(track, step, gap = 0.12, min = 0.08) {
  const out = [];
  let from = -1;
  track.forEach((on, i) => {
    if (on && from < 0) from = i;
    if ((!on || i === track.length - 1) && from >= 0) { out.push([from * step, (i + (on ? 1 : 0)) * step]); from = -1; }
  });
  const merged = [];
  for (const r of out) {
    const last = merged[merged.length - 1];
    if (last && r[0] - last[1] < gap) last[1] = r[1]; else merged.push([...r]);
  }
  return merged.filter(r => r[1] - r[0] >= min);
}

// Pen on a board: band-limited noise, rubbed back and forth, with a short fade at each end of a stroke.
function scratch(intervals, total) {
  const out = new Float32Array(Math.ceil(total * SR)), noise = rng(7), grain = rng(99);
  let lp1 = 0, lp2 = 0, g = 0;
  for (const [a, b] of intervals) {
    const i0 = Math.floor(a * SR), i1 = Math.min(out.length, Math.ceil(b * SR));
    for (let i = i0; i < i1; i++) {
      const t = i / SR, into = t - a, left = b - t;
      const env = Math.min(1, into / 0.05, left / 0.12);
      const rub = 0.25 + 0.75 * Math.pow(Math.sin(Math.PI * (3.2 + 1.2 * Math.sin(t * 2.3)) * t), 2);   // slower back-and-forth, with real gaps
      g += 0.002 * (Math.abs(grain()) - g);                                                              // uneven grain: chalk skips and catches
      const n = noise();
      lp1 += 0.3 * (n - lp1);                  // softer top: no hiss
      lp2 += 0.05 * (lp1 - lp2);               // no low rumble
      out[i] = (lp1 - lp2) * env * rub * (0.4 + 6 * g);
    }
  }
  return out;
}

// A wipe: a short falling swish of filtered noise, one per cleared board.
function swipes(times, total) {
  const out = new Float32Array(Math.ceil(total * SR)), noise = rng(21), len = 0.32;
  for (const at of times) {
    const i0 = Math.floor(at * SR);
    let lp = 0;
    for (let k = 0; k < len * SR && i0 + k < out.length; k++) {
      const u = k / (len * SR), env = Math.sin(Math.PI * u) ** 2;
      lp += (0.5 - 0.42 * u) * (noise() - lp);   // the filter closes as it falls
      out[i0 + k] += lp * env * 0.8;
    }
  }
  return out;
}

// Soft pad: slow chords, each note two sines a few cents apart (a chorus, so it is not a bare synth tone), low register,
// slow crossfades, no vibrato. It is meant to sit far under a voice; for anything better, bring your own track.
const CHORDS = [[130.81, 164.81, 196.0, 246.94], [110.0, 130.81, 164.81, 196.0], [87.31, 130.81, 174.61, 220.0], [98.0, 146.83, 196.0, 246.94]];
function pad(total) {
  const out = new Float32Array(Math.ceil(total * SR)), span = 8, fade = 3;
  const chords = Math.ceil(total / span) + 1;
  for (let c = 0; c < chords; c++) {
    const notes = CHORDS[c % CHORDS.length], start = c * span - fade / 2;
    const i0 = Math.max(0, Math.floor(start * SR)), i1 = Math.min(out.length, Math.ceil((start + span + fade) * SR));
    for (let i = i0; i < i1; i++) {
      const t = i / SR, u = t - start;
      const env = Math.min(1, u / fade, (span + fade - u) / fade);
      const e = env * env * (3 - 2 * env);   // smoothstep
      let s = 0;
      for (const f of notes) s += Math.sin(2 * Math.PI * f * 0.9965 * t) + Math.sin(2 * Math.PI * f * 1.0035 * t);
      out[i] += s / (notes.length * 2) * e;
    }
  }
  return out;
}

// Scale a track so its audible part sits at a known level (RMS, 1.0 = full scale). Levels are then predictable
// next to speech, whatever the synthesis does: -40 dB is a bed you only notice when it stops.
function level(track, rms) {
  let sum = 0, n = 0;
  for (const v of track) if (Math.abs(v) > 1e-4) { sum += v * v; n++; }
  if (!n) return track;
  const k = rms / Math.sqrt(sum / n);
  for (let i = 0; i < track.length; i++) track[i] *= k;
  return track;
}

const mixTracks = (a, b) => { const o = new Float32Array(Math.max(a.length, b.length)); a.forEach((v, i) => { o[i] += v; }); b.forEach((v, i) => { o[i] += v; }); return o; };

module.exports = { SR, writeWav, runs, scratch, swipes, pad, level, mixTracks };
