// The agent loop drawn for a phone: a 720x1280 board that fills a TikTok, Reel or Short exactly.
//   node scripts/render.js examples/ai-agents-vertical.js out.mp4 --preset tiktok
// Keep ink inside x 50..670 and y 150..1010: phone UI covers the rest. Title 52+, labels 30+.
scene({
  size: [720, 1280],
  beats: [
    { say: 'What is an AI agent?', draw: p => {
        write('What is an AI agent?', 60, 190, seg(p, 0, .8), { size: 54, color: C.yellow });
        stroke(curve([58, 210], [560, 208], [310, 218]), seg(p, .8, 1), { color: C.yellow, width: 4 });
    } },
    { say: "It's software that uses a language model to think,", draw: p => {
        stroke(oval(360, 340, 190, 78), seg(p, 0, .4), { color: C.blue });
        write('1. THINK', 360, 338, seg(p, .4, .7), { size: 46, color: C.blue, center: true });
        write('language model', 360, 382, seg(p, .7, 1), { size: 30, center: true });
    } },
    { say: 'picks a tool, and acts.', draw: p => {
        arrow([360, 422], [360, 486], seg(p, 0, .3), { color: C.white });
        stroke(oval(360, 560, 190, 78), seg(p, .25, .55), { color: C.orange });
        write('2. ACT', 360, 558, seg(p, .55, .75), { size: 46, color: C.orange, center: true });
        write('uses a tool', 360, 602, seg(p, .75, 1), { size: 30, center: true });
    } },
    { say: 'Then it looks at the result,', draw: p => {
        arrow([360, 642], [360, 706], seg(p, 0, .3), { color: C.white });
        stroke(oval(360, 780, 190, 78), seg(p, .25, .55), { color: C.pink });
        write('3. OBSERVE', 360, 778, seg(p, .55, .75), { size: 46, color: C.pink, center: true });
        write('checks the result', 360, 822, seg(p, .75, 1), { size: 30, center: true });
    } },
    { say: 'and repeats until the goal is done.', draw: p => {
        arrow([545, 815], [562, 365], seg(p, 0, .35), { color: C.white, ctrl: [715, 590] });
        write('repeat until', 360, 930, seg(p, .35, .65), { size: 40, color: C.yellow, center: true });
        write('goal done', 330, 990, seg(p, .65, .9), { size: 48, color: C.green, center: true });
        check(470, 950, seg(p, .9, 1));
    } },
  ],
});
