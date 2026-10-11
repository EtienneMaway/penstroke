// expect: none
scene({ beats: [
  { say: 'One idea.', draw: p => { stroke(oval(400, 300, 150, 80), seg(p, 0, .5), { color: C.blue }); write('IDEA', 400, 310, seg(p, .5, 1), { size: 44, color: C.blue, center: true }); } },
  { say: 'Leads to another.', draw: p => { arrow([560, 300], [800, 300], p); } },
] });
