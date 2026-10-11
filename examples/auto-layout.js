// The agent loop again, with no coordinates. row() spreads three cells, node() draws a labelled shape that sizes its own
// text, connect() joins two things edge to edge, title() sizes its own underline. Compare with ai-agents.js.
scene({
  beats: [
    { say: 'What is an AI agent?', draw: p => title('What is an AI agent?', p) },
    { say: "It's software that uses a language model to think,", draw: p => {
        const [think] = row(3);
        node(think, p, { label: '1. THINK', sub: 'language model', color: C.blue });
    } },
    { say: 'picks a tool, and acts.', draw: p => {
        const [think, act] = row(3);
        connect(inkOf(think, { label: '1. THINK', sub: 'language model' }), inkOf(act, { label: '2. ACT', sub: 'uses a tool' }), seg(p, 0, .35));
        node(act, seg(p, .3, 1), { label: '2. ACT', sub: 'uses a tool', color: C.orange });
    } },
    { say: 'Then it looks at the result,', draw: p => {
        const [, act, observe] = row(3);
        connect(inkOf(act, { label: '2. ACT', sub: 'uses a tool' }), inkOf(observe, { label: '3. OBSERVE', sub: 'checks the result' }), seg(p, 0, .35));
        node(observe, seg(p, .3, 1), { label: '3. OBSERVE', sub: 'checks the result', color: C.pink });
    } },
    { say: 'and repeats until the goal is done.', draw: p => {
        const [think, , observe] = row(3);
        const a = inkOf(observe, { label: '3. OBSERVE', sub: 'checks the result' }), b = inkOf(think, { label: '1. THINK', sub: 'language model' });
        connect(a, b, seg(p, 0, .4), { around: 'below' });
        const w = textW('repeat until goal done', 40);   // measured, so the tick lands just after the last letter
        write('repeat until goal done', 640, 640, seg(p, .4, .9), { size: 40, color: C.green, center: true });
        check(640 + w / 2 + 20, 600, seg(p, .9, 1));
    } },
  ],
});
