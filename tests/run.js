#!/usr/bin/env node
// Render every example and every language scene, and fail on any WARN or FAIL:  node tests/run.js [outDir]
// A language with no built-in voice on this machine is reported as skipped, not failed.
const { spawnSync } = require('child_process');
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = path.resolve(process.argv[2] || path.join(root, 'out'));
fs.mkdirSync(out, { recursive: true });
const scenes = [...fs.readdirSync(path.join(root, 'examples')).filter(f => f.endsWith('.js')).map(f => path.join(root, 'examples', f)),
                ...fs.readdirSync(path.join(__dirname, 'languages')).filter(f => f.endsWith('.js')).map(f => path.join(__dirname, 'languages', f))];
let bad = 0;
for (const f of scenes) {
  const name = path.basename(f, '.js'), mp4 = path.join(out, name + '.mp4');
  const r = spawnSync('node', [path.join(root, 'scripts/render.js'), f, mp4], { encoding: 'utf8' });
  const log = r.stdout + r.stderr, sheet = (log.match(/^sheet (.+)$/m) || [])[1];
  if (sheet) fs.copyFileSync(sheet, path.join(out, name + '-sheet.jpg'));
  const warns = log.split('\n').filter(l => l.startsWith('WARN'));
  let verdict = r.status === 0 && !warns.length ? 'ok' : 'FAIL';
  if (r.status !== 0 && /no built-in voice|is not installed/.test(log)) verdict = 'skip';
  if (verdict === 'FAIL') bad++;
  console.log(`${verdict.padEnd(4)} ${name.padEnd(12)} ${(log.match(/^ok .* ([\d.]+s)$/m) || [])[1] || ''}`);
  if (verdict !== 'ok') console.log('     ' + (warns.join('\n     ') || log.trim().split('\n').slice(-8).join('\n     ')));
}
// Output checks: each scene in tests/lint declares what the renderer must say about it on its first line
// (`// expect: some words from the warning`, or `// expect: none`). Every warning has to fire when it should, and a
// clean scene has to stay quiet.
for (const f of fs.readdirSync(path.join(__dirname, 'lint')).filter(f => f.endsWith('.js')).sort()) {
  const file = path.join(__dirname, 'lint', f), want = (fs.readFileSync(file, 'utf8').match(/^\/\/ expect: (.+)$/m) || [])[1];
  const r = spawnSync('node', [path.join(root, 'scripts/render.js'), file, '--sheet'], { encoding: 'utf8' });
  const warns = (r.stdout || '').split('\n').filter(l => l.startsWith('WARN'));
  const ok = r.status === 0 && (want === 'none' ? !warns.length : warns.some(w => w.includes(want)));
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} lint   ${f.replace('.js', '').padEnd(20)} ${want === 'none' ? 'stays quiet' : `warns: ${want}`}`);
  if (!ok) console.log('     got: ' + (warns.join(' | ') || (r.stderr || '').trim().split('\n').slice(-2).join(' ') || 'no warnings'));
}

// Translation: --strings lists what must be translated, --lang renders the same drawings in another language from a JSON
// map, and any string left out of the map is reported rather than silently shown in the wrong language.
{
  const render = args => spawnSync('node', [path.join(root, 'scripts/render.js'), ...args], { encoding: 'utf8' });
  const scene = path.join(root, 'examples/ai-agents.js');
  let keys = [];
  try { keys = Object.keys(JSON.parse(render([scene, '--strings']).stdout)); } catch {}
  const partial = path.join(out, 'partial.es.json');
  fs.writeFileSync(partial, JSON.stringify({ 'What is an AI agent?': '¿Qué es un agente de IA?' }));
  const full = render([scene, path.join(out, 'agents-es.mp4'), '--lang', 'es', '--preview']);
  const part = render([scene, '--sheet', '--lang', 'es', '--translations', partial]);
  const missing = render([scene, '--sheet', '--lang', 'zz']);
  const checks = [
    ['strings lists the scene', keys.includes('What is an AI agent?') && keys.includes('3. OBSERVE')],
    ['full translation renders clean', full.status === 0 && !/^WARN/m.test(full.stdout)],
    ['untranslated strings are reported', /^WARN no translation for: "3\. OBSERVE"/m.test(part.stdout)],
    ['missing file is refused with the fix', missing.status !== 0 && /--strings/.test(missing.stderr)],
  ];
  for (const [name, ok] of checks) { if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} i18n   ${name}`); }
}

// Export presets: a landscape scene must come out at each format's exact size.
const { execFileSync } = require('child_process');
for (const [preset, w, h] of [['tiktok', 540, 960], ['square', 540, 540], ['youtube', 960, 540]]) {
  const f = path.join(out, `preset-${preset}.mp4`);
  const r = spawnSync('node', [path.join(root, 'scripts/render.js'), path.join(root, 'examples/ai-agents.js'), f, '--preset', preset, '--preview'], { encoding: 'utf8' });
  let size = '';
  try { size = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', f], { encoding: 'utf8' }).trim().replace(/,+$/, '').replace(',', 'x'); } catch {}
  const ok = r.status === 0 && size === `${w}x${h}`;
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} preset ${preset.padEnd(8)} ${size || 'no video'}`);
}
// Sound extras: the pen scratch and a user-supplied music file must mix in without breaking the render. There is no
// generated music, so the test makes a tone to stand in for the file.
{
  const f = path.join(out, 'sound.mp4'), bed = path.join(out, 'bed.wav');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=220:duration=3', bed]);
  const r = spawnSync('node', [path.join(root, 'scripts/render.js'), path.join(root, 'examples/ai-agents.js'), f, '--sfx', '--music', bed, '--preview'], { encoding: 'utf8' });
  let audio = '';
  try { audio = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=codec_type', '-of', 'csv=p=0', f], { encoding: 'utf8' }).trim(); } catch {}
  const refused = spawnSync('node', [path.join(root, 'scripts/render.js'), path.join(root, 'examples/ai-agents.js'), f, '--music', path.join(out, 'missing.mp3'), '--preview'], { encoding: 'utf8' });
  const ok = r.status === 0 && audio.startsWith('audio') && refused.status !== 0;
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} sound  sfx + music file, missing file refused`);
}
console.log(bad ? `${bad} failed` : 'all passed');
process.exit(bad ? 1 : 0);
