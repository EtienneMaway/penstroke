// expect: an arrow runs through an icon
scene({ beats: [
  { say: 'An icon.', draw: p => { icon('server', 400, 300, p, { size: 120 }); } },
  { say: 'And an arrow across it.', draw: p => { arrow([150, 300], [700, 300], p); } },
] });
