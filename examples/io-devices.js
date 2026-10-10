// A lesson on I/O devices and the I/O system. Board 1: the devices. Board 2: the OS layer that manages them.
scene({
  beats: [
    { say: "Let's talk about I/O devices, and the I/O system.", draw: p => {
        write('I/O devices and I/O systems', 60, 85, seg(p, 0, .8), { size: 56, color: C.yellow });
        stroke(curve([58, 104], [760, 102], [400, 112]), seg(p, .8, 1), { color: C.yellow, width: 4 });
    } },
    { say: 'A computer has a brain, the CPU and memory.', draw: p => {
        icon('brain', 640, 240, seg(p, 0, .3), { size: 90, color: C.purple });
        stroke(box(500, 310, 280, 140), seg(p, .3, .6), { color: C.purple });
        write('CPU', 640, 372, seg(p, .6, .8), { size: 48, color: C.purple, center: true });
        write('+ MEMORY', 640, 418, seg(p, .8, 1), { size: 30, center: true });
    } },
    { say: 'Input devices send data in, like a keyboard or a mouse.', draw: p => {
        icon('keyboard', 150, 240, seg(p, 0, .25), { size: 80, color: C.blue });
        icon('mouse', 250, 240, seg(p, .25, .4), { size: 70, color: C.blue });
        write('INPUT', 200, 330, seg(p, .4, .6), { size: 40, color: C.blue, center: true });
        write('keyboard, mouse', 200, 376, seg(p, .6, .8), { size: 28, center: true });
        arrow([325, 355], [492, 375], seg(p, .8, 1), { color: C.blue, ctrl: [410, 345] });
    } },
    { say: 'Output devices show data out, like a screen or a printer.', draw: p => {
        arrow([788, 375], [955, 355], seg(p, 0, .35), { color: C.orange, ctrl: [870, 345] });
        icon('computer', 1020, 240, seg(p, .35, .55), { size: 80, color: C.orange });
        icon('printer', 1130, 240, seg(p, .55, .7), { size: 70, color: C.orange });
        write('OUTPUT', 1080, 330, seg(p, .7, .85), { size: 40, color: C.orange, center: true });
        write('screen, printer', 1080, 376, seg(p, .85, 1), { size: 28, center: true });
    } },
    { say: 'And storage devices, like a disk, keep it safe.', draw: p => {
        arrow([610, 458], [610, 548], seg(p, 0, .25), { color: C.pink });
        arrow([670, 548], [670, 458], seg(p, .25, .5), { color: C.pink });
        write('STORAGE', 640, 598, seg(p, .5, .7), { size: 40, color: C.pink, center: true });
        write('disk, SSD', 640, 640, seg(p, .7, .85), { size: 28, center: true });
        icon('drive', 470, 610, seg(p, .85, 1), { size: 80, color: C.pink });
    } },
    { clear: true, say: 'But every device speaks differently.', draw: p => {
        write('The I/O system', 60, 85, seg(p, 0, .8), { size: 56, color: C.yellow });
        stroke(curve([58, 104], [560, 102], [300, 112]), seg(p, .8, 1), { color: C.yellow, width: 4 });
    } },
    { say: 'So the operating system adds an I/O system,', draw: p => {
        stroke(box(460, 290, 360, 80), seg(p, 0, .5), { color: C.purple });
        write('I/O SYSTEM', 640, 342, seg(p, .5, 1), { size: 40, color: C.purple, center: true });
    } },
    { say: 'a layer that manages every device.', draw: p => {
        write('manages everything', 860, 340, seg(p, 0, 1), { size: 32, color: C.purple });
    } },
    { say: 'Programs ask it for data,', draw: p => {
        stroke(box(460, 150, 360, 80), seg(p, 0, .4), { color: C.blue });
        write('PROGRAMS', 640, 202, seg(p, .4, .7), { size: 40, color: C.blue, center: true });
        arrow([640, 234], [640, 286], seg(p, .7, 1), { color: C.white });
    } },
    { say: 'drivers translate for each device,', draw: p => {
        arrow([640, 374], [640, 426], seg(p, 0, .25), { color: C.white });
        stroke(box(460, 430, 360, 80), seg(p, .25, .6), { color: C.orange });
        write('DRIVERS', 640, 482, seg(p, .6, .85), { size: 40, color: C.orange, center: true });
        write('translate', 860, 480, seg(p, .85, 1), { size: 32, color: C.orange });
    } },
    { say: 'and the devices do the real work.', draw: p => {
        arrow([640, 514], [640, 566], seg(p, 0, .25), { color: C.white });
        stroke(box(460, 570, 360, 80), seg(p, .25, .6), { color: C.pink });
        write('DEVICES', 640, 622, seg(p, .6, .85), { size: 40, color: C.pink, center: true });
        write('real hardware', 860, 620, seg(p, .85, 1), { size: 32, color: C.pink });
    } },
    { say: 'So a program can use any device in one simple way.', draw: p => {
        write('one simple way', 230, 330, seg(p, 0, .4), { size: 38, color: C.green, center: true });
        write('to use any device', 230, 380, seg(p, .4, .85), { size: 32, color: C.green, center: true });
        check(120, 440, seg(p, .85, 1), { color: C.green });
    } },
  ],
});
