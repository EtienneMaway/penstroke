// expect: text runs off the board
scene({ beats: [{ say: 'Too long.', draw: p => { write('this label is much too long for the board to hold at this size', 60, 200, p, { size: 60 }); } }] });
