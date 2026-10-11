// expect: phone UI covers
scene({ size: [720, 1280], beats: [{ say: 'Too low.', draw: p => { write('under the app', 360, 1180, p, { size: 50, center: true }); } }] });
