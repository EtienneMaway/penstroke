// expect: an arrow runs through
scene({ beats: [
  { say: 'A label.', draw: p => { write('IN THE WAY', 400, 300, p, { size: 48, center: true }); } },
  { say: 'And an arrow across it.', draw: p => { arrow([150, 295], [800, 295], p); } },
] });
