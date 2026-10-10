// A gallery of every built-in icon. icon(name, cx, cy, p, { size, color }) draws one centred on (cx, cy).
scene({
  beats: [
    { dur: 5, draw: p => {
        write('Icons', 60, 70, seg(p, 0, .1), { size: 48, color: C.yellow });
        const names = Object.keys(ICONS), cols = 6, tints = [C.blue, C.orange, C.pink, C.green, C.purple, C.yellow];
        names.forEach((n, i) => {
          const c = i % cols, r = Math.floor(i / cols), x = 130 + c * 204, y = 190 + r * 150;
          const a = .1 + .9 * i / names.length, b = a + .9 / names.length;
          icon(n, x, y, seg(p, a, b), { size: 80, color: tints[i % tints.length] });
          write(n, x, y + 68, seg(p, a, b), { size: 24, center: true });
        });
    } },
  ],
});
