// A draw-over-UI tutorial in 4 beats. Copy this for product walkthroughs.
// The stills are Playwright captures at a 1280x720 viewport (deviceScaleFactor 1.5), so CSS pixels
// are board units. Every rectangle below is a getBoundingClientRect() value read while capturing,
// passed through view() untouched. With a capture of another width, change the 1280.
// Labels float in empty space, so they are placed in board units (1280x720) directly.
const page = view(1280);

const codeBtn = { x: 827, y: 265, w: 109, h: 32 };
const cloneUrl = { x: 552, y: 390, w: 332, h: 32 }, copyBtn = { x: 888, y: 390, w: 32, h: 32 };   // measured again with the menu open

scene({
  rate: 150, gap: 0.6,   // tutorial pace: slower voice, more air between beats
  beats: [
    { bg: 'shots/repo.jpg', say: 'On the repo page, press the green Code button.', draw: p => {
        stroke(ring(page.r(codeBtn), 10), seg(p, .3, .65), { color: C.yellow });
        write('1. Press Code', 560, 222, seg(p, .65, .92), { size: 40, color: C.yellow });
        arrow([800, 232], page.p(846, 256), seg(p, .92, 1), { color: C.yellow });
    } },

    { bg: 'shots/clone.jpg', say: 'A menu opens, with a link to the code.', draw: p => {
        stroke(around(page.r(cloneUrl), 5), seg(p, .35, 1), { color: C.blue });
    } },
    { say: 'Press the two squares to copy it.', draw: p => {
        stroke(ring(page.r(copyBtn), 7), seg(p, 0, .35), { color: C.pink });
        write('2. Copy it', 640, 338, seg(p, .35, .8), { size: 34, color: C.pink });
        arrow([800, 344], page.p(892, 384), seg(p, .8, 1), { color: C.pink });
    } },
    { say: 'Then paste it to Claude Code, and ask for your first video.', draw: p => {
        write('3. Paste it to Claude Code', 300, 222, seg(p, .1, .8), { size: 40, color: C.green });
    } },
  ],
});
