const test = require('tape');
const { Observable } = require('rxjs/Observable');
require('rxjs/add/observable/of');
require('rxjs/add/observable/throw');
require('rxjs/add/operator/delay');
const { Model } = require('@graphistry/falcor/dist/falcor.all.min');
// const {
//   Model: NetflixModel
// } = require('falcor/dist/falcor.browser.min');


test('Retrieves jsonGraph from remote', (t) => {
  t.plan(1);
  const dataSource = {
    get: () => {
      return Observable.of({
        paths: [['items', { to: 1 }, 'title']],
        jsonGraph: {
          items: {
            0: { $type: 'ref', value: ['item', 'a'] },
            1: { $type: 'ref', value: ['item', 'b'] }
          },
          item: {
            a: { title: 'Item A' },
            b: { title: 'Item B' }
          }
        }
      }).delay(100);
    }
  };

  const model = new Model({
    cache: {},
    source: dataSource
  });

  model.get(['items', { to: 1 }, 'title'])
    .subscribe({
      next(jsonEnvelope) {
        t.deepEqual(jsonEnvelope.json.toJSON(), {
          items: {
            0: { title: 'Item A' },
            1: { title: 'Item B' }
          }
        });
      },
      error(err) {
        t.fail(err);
      },
      complete() {
        t.end();
      }
    });
});


test('Retrieves jsonGraph from remote and cache', (t) => {
  t.plan(1);
  const dataSource = {
    get: () => {
      return Observable.of({
        paths: [['items', 1, 'title']],
        jsonGraph: {
          items: {
            1: { $type: 'ref', value: ['item', 'b'] }
          },
          item: {
            b: { title: 'Item B' }
          }
        }
      }).delay(100);
    }
  };

  const model = new Model({
    cache: {
      items: {
        0: { $type: 'ref', value: ['item', 'a'] }
      },
      item: {
        a: { title: 'Item A' }
      }
    },
    source: dataSource
  });

  model.get(['items', { to: 1 }, 'title'])
    .subscribe({
      next(jsonEnvelope) {
        t.deepEqual(jsonEnvelope.json.toJSON(), {
          items: {
            0: { title: 'Item A' },
            1: { title: 'Item B' }
          }
        });
      },
      error(err) {
        t.fail(err);
      },
      complete() {
        t.end();
      }
    });
});


test('Progressively retrieves jsonGraph from remote and cache', (t) => {
  t.plan(2);
  const dataSource = {
    get: () => {
      return Observable.of({
        paths: [['items', 1, 'title']],
        jsonGraph: {
          items: {
            1: { $type: 'ref', value: ['item', 'b'] }
          },
          item: {
            b: { title: 'Item B' }
          }
        }
      }).delay(100);
    }
  };

  const model = new Model({
    cache: {
      items: {
        0: { $type: 'ref', value: ['item', 'a'] }
      },
      item: {
        a: { title: 'Item A' }
      }
    },
    source: dataSource
  });


  let i = -1;

  model.get(['items', { to: 1 }, 'title']).progressively()
    .subscribe({
      next(jsonEnvelope) {
        i++;
        if (i === 0) {
          t.deepEqual(jsonEnvelope.json.toJSON(), {
            items: {
              0: { title: 'Item A' }
            }
          });
        } else if (i === 1) {
          t.deepEqual(jsonEnvelope.json.toJSON(), {
            items: {
              0: { title: 'Item A' },
              1: { title: 'Item B' }
            }
          });
        } else {
          t.fail('emitted too many times');
        }

      },
      error(err) {
        t.fail(err);
      },
      complete() {
        t.end();
      }
    });
});


test('Merges incomplete response with cache', (t) => {
  t.plan(1);
  const dataSource = {
    get: () => {
      return Observable.of({
        // NOTE - paths must match what's coming back, not what was requested
        // e.g. the below doesn't work
        // paths: [['items', { to: 1 }, 'title']],
        paths: [['items', 0],['items', 1, 'title']],
        jsonGraph: {
          items: {
            0: { $type: 'ref', value: ['item', 'a'] },
            1: { $type: 'ref', value: ['item', 'b'] }
          },
          item: {
            b: { title: 'Item B' }
          }
        }
      }).delay(100);
    }
  };

  const model = new Model({
    cache: {
      item: {
        a: { title: 'Item A' }
      }
    },
    source: dataSource
  })
    .batch()
    .boxValues()
    .treatErrorsAsValues();

  model.get(['items', { to: 1 }, 'title']).progressively()
    .subscribe({
      next(jsonEnvelope) {
        t.deepEqual(jsonEnvelope.json.toJSON(), {
          items: {
            0: { title: { $type: 'atom', value: 'Item A' } },
            1: { title: { $type: 'atom', value: 'Item B' } }
          }
        });
      },
      error(err) {
        t.fail(err);
      },
      complete() {
        t.end();
      }
    });
});


test('Emits errors to all requests when batched request returns an error', (t) => {
  t.plan(4);
  const dataSource = {
    get: () => {
      return Observable.throw({
        status: 500
      }).delay(100);
    }
  };

  const model = new Model({
    cache: {},
    source: dataSource
  })
    .batch()
    .boxValues()
    .treatErrorsAsValues();

  model.get(['items', 0, 'title']).progressively()
    .subscribe({
      next(jsonEnvelope) {
        t.deepEqual(jsonEnvelope.json.toJSON(), {
          items: {
            0: { title: { $type: 'error', value: { status: 500 } } }
          }
        });
      },
      error(err) {
        t.deepEqual(err, { $type: 'error', value: { status: 500 } });
      },
      complete() {
        t.fail();
      }
    });

  model.get(['items', 1, 'title']).progressively()
    .subscribe({
      next(jsonEnvelope) {
        t.deepEqual(jsonEnvelope.json.toJSON(), {
          items: {
            1: { title: { $type: 'error', value: { status: 500 } } }
          }
        });
      },
      error(err) {
        t.deepEqual(err, { $type: 'error', value: { status: 500 } });
      },
      complete() {
        t.fail();
      }
    });
});
