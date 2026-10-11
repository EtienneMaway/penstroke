// expect: none
// The layout helpers on a phone-shaped board: a column of three nodes, joined, with a title. Must stay inside the safe zone.
scene({ size: [720, 1280], beats: [
  { say: 'Start.', draw: p => title('Three steps', p) },
  { say: 'One.', draw: p => { const [a] = col(3); node(a, p, { label: '1. FIRST', sub: 'do this', color: C.blue }); } },
  { say: 'Two.', draw: p => { const [a, b] = col(3);
      connect(inkOf(a, { label: '1. FIRST', sub: 'do this' }), inkOf(b, { icon: 'server', label: 'SECOND' }), seg(p, 0, .3));
      node(b, seg(p, .3, 1), { icon: 'server', label: 'SECOND', color: C.orange }); } },
  { say: 'Three.', draw: p => { const [, b, c] = col(3);
      connect(inkOf(b, { icon: 'server', label: 'SECOND' }), inkOf(c, { shape: 'box', label: '3. THIRD' }), seg(p, 0, .3));
      node(c, seg(p, .3, 1), { shape: 'box', label: '3. THIRD', color: C.pink }); } },
] });
