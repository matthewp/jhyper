import '../lib/jhyper';

QUnit.module('Hyper.off()');

QUnit.test('Removes all events', assert => {
    let el = $('<div>');
    let count = 0;
    let h = el.hyper();
    h.on('foo').run(() => { count++; });
    el.trigger('foo');
    assert.equal(count, 1);
    h.off();
    el.trigger('foo');
    assert.equal(count, 1);
});