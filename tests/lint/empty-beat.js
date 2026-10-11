// expect: draws nothing
scene({ beats: [
  { say: 'Something is drawn.', draw: p => { write('hello', 100, 200, p, { size: 48 }); } },
  { say: 'And now nothing is.', draw: p => {} },
] });
