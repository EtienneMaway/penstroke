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
console.log(bad ? `${bad} failed` : 'all passed');
process.exit(bad ? 1 : 0);
