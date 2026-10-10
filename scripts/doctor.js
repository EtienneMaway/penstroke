#!/usr/bin/env node
// Check that this machine can render:  node scripts/doctor.js
// Prints one line per requirement and, for anything missing, the exact fix. Exit code 1 if a required item is missing.
const { execFileSync } = require('child_process');
const fs = require('fs');

const MAC = process.platform === 'darwin';
const run = (cmd, args) => { try { return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; } };
const rows = [];
const check = (name, ok, detail, fix, required = true) => rows.push({ name, ok, detail, fix, required });

const major = parseInt(process.versions.node, 10);
check('Node 20+', major >= 20, `v${process.versions.node}`, 'Install Node 20 or newer from https://nodejs.org');

const ff = run('ffmpeg', ['-version']), fp = run('ffprobe', ['-version']);
check('ffmpeg', !!ff && !!fp, ff ? ff.split('\n')[0] : 'not found',
  MAC ? 'brew install ffmpeg' : process.platform === 'win32' ? 'winget install ffmpeg   (or choco install ffmpeg)' : 'sudo apt install ffmpeg');

let pw = false, browser = false;
try {
  const { chromium } = require('playwright');
  pw = true;
  browser = fs.existsSync(chromium.executablePath());
} catch {}
check('playwright', pw, pw ? 'installed' : 'not installed', `cd ${__dirname} && npm install`);
check('chromium for playwright', browser, browser ? 'installed' : 'not downloaded', `cd ${__dirname} && npx playwright install chromium`);

if (MAC) {
  const voices = run('say', ['-v', '?']);
  check('free voice (macOS say)', !!voices, voices ? `${voices.split('\n').length} voices` : '`say` not found', 'macOS ships with `say`; it should always be there');
} else {
  const es = run('espeak-ng', ['--version']);
  check('free voice (espeak-ng)', !!es, es || 'not found',
    process.platform === 'win32' ? 'winget install espeak-ng   (or use Kokoro / ElevenLabs below)' : 'sudo apt install espeak-ng');
}

const path = require('path');
const venv = path.join(__dirname, '..', '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const py = process.env.KHAN_PYTHON || (fs.existsSync(venv) ? venv : 'python3');
const kokoro = run(py, ['-c', 'import kokoro, soundfile; print("ok")']) === 'ok';
check('Kokoro human voice (recommended)', kokoro, kokoro ? `on by default, via ${py}` : 'not installed: videos will use the robotic built-in voice',
  'uv venv --python 3.11 .venv && uv pip install --python .venv/bin/python kokoro soundfile', false);
check('ElevenLabs voice (optional)', !!process.env.ELEVENLABS_API_KEY, process.env.ELEVENLABS_API_KEY ? 'key set' : 'ELEVENLABS_API_KEY not set', 'export ELEVENLABS_API_KEY=...', false);
if (MAC) check('talking-head cutout (optional)', !!run('swiftc', ['--version']), run('swiftc', ['--version']) ? 'swiftc found' : 'swiftc not found', 'xcode-select --install', false);

let bad = 0;
for (const r of rows) {
  const mark = r.ok ? 'ok  ' : r.required ? 'FAIL' : 'skip';
  console.log(`${mark}  ${r.name.padEnd(34)} ${r.detail}`);
  if (!r.ok && r.fix) console.log(`      fix: ${r.fix}`);
  if (!r.ok && r.required) bad++;
}
console.log(bad ? `\n${bad} required item(s) missing. Fix those, then run this again.` : '\nReady. Try: node scripts/render.js examples/ai-agents.js out/agents.mp4');
process.exit(bad ? 1 : 0);
