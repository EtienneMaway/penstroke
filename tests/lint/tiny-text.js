// expect: too small
scene({ beats: [{ say: 'Fine print.', draw: p => { write('this is far too small to read', 100, 200, p, { size: 14 }); } }] });
