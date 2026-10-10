#!/usr/bin/env node
// Turn a rendered video into a small looping GIF for a README:  node scripts/gif.js in.mp4 out.gif [width] [fps]
// Two passes with a fitted palette, so chalk colours stay clean. GIFs have no sound.
const { execFileSync } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const [input, output, width = '560', fps = '10'] = process.argv.slice(2);
if (!input || !output) { console.error('usage: node gif.js <in.mp4> <out.gif> [width] [fps]'); process.exit(1); }
const pal = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gif-')), 'palette.png');
const vf = `fps=${fps},scale=${width}:-1:flags=lanczos`;
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', input, '-vf', `${vf},palettegen=max_colors=64`, pal]);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', input, '-i', pal, '-lavfi', `${vf}[x];[x][1:v]paletteuse=dither=none`, '-loop', '0', output]);
console.log(`${output} ${(fs.statSync(output).size / 1048576).toFixed(2)} MB`);
