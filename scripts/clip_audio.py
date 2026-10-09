#!/usr/bin/env python3
"""Real-audio clips for the blackboard: transcribe a recording, then cut moments out of it.

  uvx --with faster-whisper python clip_audio.py transcribe <audio> <workdir>
      -> <workdir>/transcript.json (words with times) and transcript.txt (one timed line per sentence)
  uvx --with faster-whisper python clip_audio.py cut <audio> <workdir> <clips.json>
      -> <workdir>/clips/NN-slug/audio.wav + words.txt (word times inside that clip)

clips.json: [{"slug": "the-12k-offer", "from": 85.96, "to": 131.10}, ...]
`from` and `to` are the start times of the first and last transcript.txt lines to keep. Optional
"stop": "results," ends the clip after that word in the last line.

Local and free: faster-whisper on the CPU. Each cut is re-transcribed, so the times in words.txt
belong to the clip itself and a cut that caught a stray word shows up as CHECK.
"""
import json, os, re, subprocess, sys
import numpy as np
from faster_whisper import WhisperModel

SR = 16000
norm = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())

def load(path):   # raw mono floats from ffmpeg: sidesteps faster-whisper's own decoder
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32)

def model():
    return WhisperModel(os.environ.get("WHISPER_MODEL", "small.en"), device="cpu", compute_type="int8")

def transcribe(audio_path, work):
    os.makedirs(work, exist_ok=True)
    segs, _ = model().transcribe(load(audio_path), word_timestamps=True, vad_filter=True)
    out = [{"start": s.start, "end": s.end, "text": s.text.strip(),
            "words": [{"w": w.word.strip(), "s": round(w.start, 2), "e": round(w.end, 2)} for w in s.words]} for s in segs]
    json.dump(out, open(f"{work}/transcript.json", "w"))
    with open(f"{work}/transcript.txt", "w") as f:
        for s in out: f.write(f"[{int(s['start']) // 60:02d}:{s['start'] % 60:05.2f} = {s['start']:.2f}] {s['text']}\n")
    print(f"{len(out)} lines -> {work}/transcript.txt")

def cut(audio_path, work, clips_path):
    audio, segs = load(audio_path), json.load(open(f"{work}/transcript.json"))
    every = [w for s in segs for w in s["words"]]
    m = model()

    def quietest(t, lo, hi):   # the quietest 25 ms in [t+lo, t+hi]: the seam between two words
        best, at = 1e9, t
        for c in np.arange(max(0, t + lo), t + hi, 0.005):
            w = audio[int(c * SR):int(c * SR) + int(0.025 * SR)]
            if len(w) == 0: break
            e = float(np.sqrt(np.mean(w * w)))
            if e < best: best, at = e, c + 0.0125
        return at

    for n, c in enumerate(json.load(open(clips_path)), 1):
        i = min(range(len(segs)), key=lambda k: abs(segs[k]["start"] - c["from"]))
        j = min(range(len(segs)), key=lambda k: abs(segs[k]["start"] - c["to"]))
        words = [w for s in segs[i:j + 1] for w in s["words"]]
        if c.get("stop"):
            words = words[:len(words) - [norm(w["w"]) for w in reversed(words)].index(norm(c["stop"]))]
        # Never look for the seam past the neighbouring word: that is how a stray word gets into a cut.
        k0, k1 = every.index(words[0]), every.index(words[-1])
        before = every[k0 - 1]["e"] if k0 else 0
        after = every[k1 + 1]["s"] if k1 + 1 < len(every) else 1e9
        t0 = quietest(words[0]["s"], max(-0.30, before + 0.03 - words[0]["s"]), 0.04)
        t1 = quietest(words[-1]["e"], 0.02, max(0.08, min(0.45, after - 0.03 - words[-1]["e"])))
        d, dur = f"{work}/clips/{n:02d}-{c['slug']}", t1 - t0
        os.makedirs(d, exist_ok=True)
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", f"{t0:.3f}", "-t", f"{dur:.3f}", "-i", audio_path,
                        "-af", f"afade=t=in:d=0.02,afade=t=out:st={dur - 0.06:.3f}:d=0.06", "-ar", "48000", "-ac", "2", f"{d}/audio.wav"], check=True)
        got = list(m.transcribe(audio[int(t0 * SR):int(t1 * SR)], word_timestamps=True)[0])
        with open(f"{d}/words.txt", "w") as f:
            f.write(f"# {c['slug']}  {dur:.2f}s  (source {int(t0) // 60}:{t0 % 60:05.2f} to {int(t1) // 60}:{t1 % 60:05.2f})\n# [seconds into audio.wav] word\n")
            for s in got: f.write(" ".join(f"[{w.start:.2f}] {w.word.strip()}" for w in s.words) + "\n")
        heard = [w.word.strip() for s in got for w in s.words]
        ok = norm(heard[0]) == norm(words[0]["w"]) and norm(heard[-1]) == norm(words[-1]["w"])
        print(f"{'ok   ' if ok else 'CHECK'} {n:02d}-{c['slug']}  {dur:.1f}s  starts «{' '.join(heard[:4])}»  ends «{' '.join(heard[-4:])}»")

if __name__ == "__main__":
    mode, args = (sys.argv[1] if len(sys.argv) > 1 else ""), sys.argv[2:]
    if mode == "transcribe" and len(args) == 2: transcribe(*args)
    elif mode == "cut" and len(args) == 3: cut(*args)
    else: sys.exit(__doc__)
