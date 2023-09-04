import '../lib/jhyper';

QUnit.module('fetch');

QUnit.test('can return a URL', (assert) => {
  const done = assert.async(1);
  const fixture = $('#qunit-fixture');

  fixture
    .hyper()
    .on('click')
    .fetch(() => new URL('/fragments/stuff/', location.href))
    .then()
    .put()
    .into(fixture)
    .then()
    .when(() => $('#stuff').length)
    .trigger('done');

  fixture
    .hyper()
    .on('done')
    .run(() => {
      assert.ok(true);
    })
    .then()
    .run(done);
  fixture.trigger('click');
});
