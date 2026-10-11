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
  const out = new Float32Array(Math.ceil(total * SR)), noise = rng(7);
  let lp1 = 0, lp2 = 0;
  for (const [a, b] of intervals) {
    const i0 = Math.floor(a * SR), i1 = Math.min(out.length, Math.ceil(b * SR));
    for (let i = i0; i < i1; i++) {
      const t = i / SR, into = t - a, left = b - t;
      const env = Math.min(1, into / 0.03, left / 0.07);
      const rub = 0.45 + 0.55 * Math.pow(Math.sin(Math.PI * (5 + 2.5 * Math.sin(t * 4.1)) * t), 2);   // back-and-forth strokes
      const n = noise();
      lp1 += 0.55 * (n - lp1);                 // roll off the hiss...
      lp2 += 0.04 * (lp1 - lp2);               // ...and take out the low rumble
      out[i] = (lp1 - lp2) * env * rub * 0.9;
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

// Soft pad: four slow chords, each note a sine with a quiet octave above, crossfaded. Quiet by design: it sits under a voice.
const CHORDS = [[130.81, 196.0, 329.63, 493.88], [110.0, 164.81, 392.0, 523.25], [87.31, 130.81, 220.0, 329.63], [98.0, 146.83, 246.94, 329.63]];
function pad(total) {
  const out = new Float32Array(Math.ceil(total * SR)), span = 6, fade = 2;
  const chords = Math.ceil(total / span) + 1;
  for (let c = 0; c < chords; c++) {
    const notes = CHORDS[c % CHORDS.length], start = c * span - fade / 2;
    const i0 = Math.max(0, Math.floor(start * SR)), i1 = Math.min(out.length, Math.ceil((start + span + fade) * SR));
    for (let i = i0; i < i1; i++) {
      const t = i / SR, u = t - start;
      const env = Math.min(1, u / fade, (span + fade - u) / fade);
      const e = env * env * (3 - 2 * env);   // smoothstep
      let s = 0;
      notes.forEach((f, k) => {
        const v = 1 + 0.0035 * Math.sin(2 * Math.PI * (0.3 + k * 0.07) * t);   // slow vibrato keeps it from sounding static
        s += Math.sin(2 * Math.PI * f * v * t) + 0.25 * Math.sin(2 * Math.PI * f * 2 * v * t);
      });
      out[i] += s / notes.length * e * (0.8 + 0.2 * Math.sin(2 * Math.PI * 0.11 * t));
    }
  }
  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  if (peak) for (let i = 0; i < out.length; i++) out[i] *= 0.7 / peak;
  return out;
}

const mixTracks = (a, b) => { const o = new Float32Array(Math.max(a.length, b.length)); a.forEach((v, i) => { o[i] += v; }); b.forEach((v, i) => { o[i] += v; }); return o; };

module.exports = { SR, writeWav, runs, scratch, swipes, pad, mixTracks };
