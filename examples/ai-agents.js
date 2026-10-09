// A 12-second lesson: the agent loop. Copy this file as the starting point for a new scene.
// Each beat = one spoken clause + what the pen draws while it is being said.
scene({
  beats: [
    { say: 'What is an AI agent?', draw: p => {
        write('What is an AI agent?', 60, 85, seg(p, 0, .8), { size: 56, color: C.yellow });
        stroke(curve([58, 104], [590, 102], [320, 112]), seg(p, .8, 1), { color: C.yellow, width: 4 });
    } },
    { say: "It's software that uses a language model to think,", draw: p => {
        stroke(oval(300, 330, 155, 82), seg(p, 0, .4), { color: C.blue });
        write('1. THINK', 300, 328, seg(p, .4, .7), { size: 40, color: C.blue, center: true });
        write('language model', 300, 364, seg(p, .7, 1), { size: 26, center: true });
    } },
    { say: 'picks a tool, and acts.', draw: p => {
        arrow([455, 290], [825, 290], seg(p, 0, .3), { ctrl: [640, 215] });
        stroke(oval(980, 330, 155, 82), seg(p, .25, .55), { color: C.orange });
        write('2. ACT', 980, 328, seg(p, .55, .75), { size: 40, color: C.orange, center: true });
        write('uses a tool', 980, 364, seg(p, .75, 1), { size: 26, center: true });
    } },
    { say: 'Then it looks at the result,', draw: p => {
        arrow([965, 420], [818, 592], seg(p, 0, .3), { ctrl: [945, 545] });
        stroke(oval(640, 600, 175, 76), seg(p, .25, .55), { color: C.pink });
        write('3. OBSERVE', 640, 598, seg(p, .55, .75), { size: 40, color: C.pink, center: true });
        write('checks the result', 640, 634, seg(p, .75, 1), { size: 26, center: true });
    } },
    { say: 'and repeats until the goal is done.', draw: p => {
        arrow([462, 592], [318, 420], seg(p, 0, .3), { ctrl: [338, 545] });
        write('repeat until', 640, 405, seg(p, .3, .6), { size: 34, color: C.yellow, center: true });
        write('goal done', 620, 455, seg(p, .6, .9), { size: 42, color: C.green, center: true });
        check(738, 418, seg(p, .9, 1));
    } },
  ],
});
