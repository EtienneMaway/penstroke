// The camera: a beat's `cam` zooms to a region and a later `cam: false` pulls back. One wide board, four small things,
// and the viewer is taken to each in turn. `cam: { rect: [x, y, w, h] }` fits a region; `{ x, y, zoom }` is a centre and a magnification.
scene({
  beats: [
    { say: 'Here is what happens when you open a web page.', draw: p => {
        write('Opening a web page', 60, 85, seg(p, 0, .8), { size: 56, color: C.yellow });
        stroke(curve([58, 104], [640, 102], [350, 112]), seg(p, .8, 1), { color: C.yellow, width: 4 });
    } },
    { say: 'You type an address.', cam: { rect: [70, 150, 280, 250] }, draw: p => {
        icon('person', 200, 250, seg(p, 0, .6), { size: 110, color: C.blue });
        write('YOU', 200, 360, seg(p, .6, 1), { size: 40, color: C.blue, center: true });
    } },
    { say: 'The request travels across the internet.', cam: { rect: [190, 130, 560, 280] }, draw: p => {
        arrow([290, 250], [520, 250], seg(p, 0, .4), { color: C.white });
        icon('cloud', 640, 250, seg(p, .4, .8), { size: 120, color: C.orange });
        write('INTERNET', 640, 360, seg(p, .8, 1), { size: 36, color: C.orange, center: true });
    } },
    { say: 'A server builds the page.', cam: { rect: [900, 130, 300, 280] }, draw: p => {
        arrow([740, 250], [940, 250], seg(p, 0, .3), { color: C.white });
        icon('server', 1050, 250, seg(p, .3, .8), { size: 120, color: C.purple });
        write('SERVER', 1050, 360, seg(p, .8, 1), { size: 36, color: C.purple, center: true });
    } },
    { say: 'It asks the database for what to show.', cam: { rect: [900, 380, 300, 280] }, draw: p => {
        arrow([1050, 395], [1050, 470], seg(p, 0, .3), { color: C.white });
        icon('database', 1050, 540, seg(p, .3, .8), { size: 110, color: C.pink });
        write('DATABASE', 1050, 640, seg(p, .8, 1), { size: 34, color: C.pink, center: true });
    } },
    { say: 'And the answer makes the whole trip back to you.', cam: false, draw: p => {
        arrow([950, 560], [240, 560], seg(p, 0, .7), { color: C.green, ctrl: [600, 620] });
        write('the page', 600, 665, seg(p, .7, 1), { size: 40, color: C.green, center: true });
    } },
  ],
});
