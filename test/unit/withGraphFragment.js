const test = require('tape');
const { Observable } = require('rxjs/Observable');
require('rxjs/add/observable/of');
require('rxjs/add/observable/throw');
require('rxjs/add/observable/timer');
require('rxjs/add/observable/never');
require('rxjs/add/operator/delay');
require('rxjs/add/operator/concat');
require('rxjs/add/operator/do');
require('rxjs/add/operator/debounceTime');
const { Model } = require('@graphistry/falcor/dist/falcor.all.min');
// const { Model } = require('falcor');
const {
  createEventHandler
} = require('recompose');
const { withGraphFragment } = require('../../src');


const tapeResultObserver = (t, recycleJSON) => {
  let idx = -1;

  return (expectedResults) => ({
    next(props) {
      idx += 1;
      if (expectedResults[idx]) {
        if (recycleJSON) {
          t.deepEqual(props, expectedResults[idx], `emission ${idx + 1} should match expected output`);
        } else {
          t.deepEqual(
            Object.assign({}, props, { graphFragment: props.graphFragment.json ? { json: props.graphFragment.json.toJSON() } : props.graphFragment }),
            expectedResults[idx],
            `emission ${idx + 1} should match expected output`
          );
        }
      } else {
        t.fail(`test emitted ${idx + 1} times; expected ${expectedResults.length} emissions. \nExtra emit: ${JSON.stringify(props)}`);
      }
    },
    error(err) {
      t.fail(`test emitted error: ${err.message || err}`);
    }
  });
};



const RECYCLEJSON = true;

test('Should emit next and complete status for path to remote graph fragment', (t) => {
  t.plan(2);
  const {
    stream: change$,
    handler: graphChange
  } = createEventHandler();

  const model = new Model({
    source: {
      get: () => {
        return Observable.of({
          paths: [['items', 0, 'title']],
          jsonGraph: {
            items: {
              0: { $type: 'ref', value: ['item', 'a'] }
            },
            item: {
              a: { title: { $type: 'atom', value: 'Item A' } }
            }
          }
        }).delay(100);
      }
    },
    recycleJSON: RECYCLEJSON,
    onChange: graphChange
  });

  const paths = ({ id }) => [['items', id, 'title']];

  const expectedResults = [
    {
      graphFragment: {},
      graphFragmentStatus: 'next',
      id: 0
    },
    {
      graphFragment: { json: { items: { 0: { title: 'Item A' } } } },
      graphFragmentStatus: 'complete',
      id: 0
    }
  ];


  withGraphFragment(paths, model, change$)(Observable.of({ id: 0 }))
    .subscribe(tapeResultObserver(t, RECYCLEJSON)(expectedResults));
});


test('Should emit complete graphFragment for path in cache', (t) => {
  t.plan(1);
  const {
    stream: change$,
    handler: graphChange
  } = createEventHandler();

  const model = new Model({
    cache: {
      items: {
        0: { $type: 'ref', value: ['item', 'a'] }
      },
      item: {
        a: { title: 'Item A' }
      }
    },
    recycleJSON: RECYCLEJSON,
    onChange: graphChange
  });

  const paths = ({ id }) => [['items', id, 'title']];

  const expectedResults = [
    {
      graphFragment: { json: { items: { 0: { title: 'Item A' } } } },
      graphFragmentStatus: 'complete',
      id: 0
    }
  ];


  withGraphFragment(paths, model, change$)(Observable.of({ id: 0 }))
    .subscribe(tapeResultObserver(t, RECYCLEJSON)(expectedResults));
});


test('Should emit progressively for query in local cache and remote service', (t) => {
  t.plan(2);
  const {
    stream: change$,
    handler: graphChange
  } = createEventHandler();

  const model = new Model({
    source: {
      get: () => Observable.of({
        paths: [['items', 1, 'title']],
        jsonGraph: {
          items: {
            1: { $type: 'ref', value: ['item', 'b'] }
          },
          item: {
            b: { title: 'Item B' }
          }
        }
      }).delay(100)
    },
    cache: {
      items: {
        0: { $type: 'ref', value: ['item', 'a'] }
      },
      item: {
        a: { title: 'Item A' }
      }
    },
    recycleJSON: RECYCLEJSON,
    onChange: graphChange
  });

  const paths = () => [['items', [0, 1], 'title']];

  const expectedResults = [
    {
      graphFragment: { json: { items: { 0: { title: 'Item A' } } } },
      graphFragmentStatus: 'next',
      id: 2
    },
    {
      graphFragment: { json: { items: { 0: { title: 'Item A' }, 1: { title: 'Item B' } } } },
      graphFragmentStatus: 'complete',
      id: 2
    }
  ];


  withGraphFragment(paths, model, change$)(Observable.of({ id: 2 }))
    .subscribe(tapeResultObserver(t, RECYCLEJSON)(expectedResults));
});


/**
 * NOTE - this test tests behavior where each path in query resolves partially or wholly
 * it is superceded by the below skipped test which tests new paths that partially resolve
 * _and_ new paths that don't resolve.  Second case doesn't work in falcor
 * see: https://github.com/graphistry/falcor/issues/15
 */
test('Should emit next when path changes and new path partially resolves', (t) => {
  t.plan(4);
  const {
    stream: change$,
    handler: graphChange
  } = createEventHandler();

  let i = 0;
  const model = new Model({
    source: {
      get: () => {
        i += 1;
        if (i === 1) {
          return Observable.of({
            paths: [['items', 0, 'title'],['items', 'length']],
            jsonGraph: {
              items: {
                0: { $type: 'ref', value: ['item', 'a'] },
                length: 50
              },
              item: {
                a: { title: 'Item A' }
              }
            }
          }).delay(100);
        } else if (i === 2) {
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

        return Observable.throw('Shouldn\'t run');
      }
    },
    recycleJSON: RECYCLEJSON,
    onChange: graphChange
  });

  const paths = ({ keys }) => [['items', keys, 'title'], ['items', 'length']];

  const expectedResults = [
    {
      graphFragment: {},
      graphFragmentStatus: 'next',
      keys: [0],
      id: 0
    },
    {
      graphFragment: { json: { items: { 0: { title: 'Item A' }, length: 50 } } },
      graphFragmentStatus: 'complete',
      keys: [0],
      id: 0
    },
    {
      graphFragment: { json: { items: { 0: { title: 'Item A' }, length: 50 } } },
      graphFragmentStatus: 'next',
      keys: [0, 1],
      id: 0
    },
    {
      graphFragment: { json: { items: { 0: { title: 'Item A' }, 1: { title: 'Item B' }, length: 50 } } },
      graphFragmentStatus: 'complete',
      keys: [0, 1],
      id: 0
    }
  ];


  withGraphFragment(paths, model, change$)(
    Observable.of({ id: 0, keys: [0] })
      .concat(Observable.of({ id: 0, keys: [0, 1] }).delay(200))
  )
    .subscribe(tapeResultObserver(t, RECYCLEJSON)(expectedResults));
});



/**
 * NOTE - this fails when recycleJSON is false
 * see: https://github.com/graphistry/falcor/issues/15
 */
test('Should emit next when props change updates path where updated path both partially resolves and does not resolve at all', (t) => {
  t.plan(6);
  const {
    stream: change$,
    handler: graphChange
  } = createEventHandler();

  let i = 0;
  const model = new Model({
    source: {
      get: () => {
        i += 1;
        if (i === 1) {
          return Observable.of({
            paths: [['items', 0, 'title'],['items', 'length']],
            jsonGraph: {
              items: {
                0: { $type: 'ref', value: ['item', 'a'] },
                length: 50
              },
              item: {
                a: { title: 'Item A' }
              }
            }
          }).delay(100);
        } else if (i === 2) {
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
        } else if (i === 3) {
          return Observable.of({
            paths: [['items', 2, 'title']],
            jsonGraph: {
              items: {
                2: { $type: 'ref', value: ['item', 'c'] }
              },
              item: {
                c: { title: 'Item C' }
              }
            }
          }).delay(100);
        }

        return Observable.throw('Shouldn\'t run');
      }
    },
    recycleJSON: RECYCLEJSON,
    onChange: graphChange
  });

  const paths = ({ keys }) => [['items', keys, 'title'], ['items', 'length']];

  const expectedResults = [
    {
      graphFragment: {},
      graphFragmentStatus: 'next',
      keys: [0],
      id: 0
    },
    {
      graphFragment: { json: { items: { 0: { title: 'Item A' }, length: 50 } } },
      graphFragmentStatus: 'complete',
      keys: [0],
      id: 0
    },
    {
      graphFragment: { json: { items: { 0: { title: 'Item A' }, length: 50 } } },
      graphFragmentStatus: 'next',
      keys: [0, 1],
      id: 0
    },
    {
      graphFragment: { json: { items: { 0: { title: 'Item A' }, 1: { title: 'Item B' }, length: 50 } } },
      graphFragmentStatus: 'complete',
      keys: [0, 1],
      id: 0
    },
    {
      graphFragment: { json: { items: { length: 50 } } },
      graphFragmentStatus: 'next',
      keys: [2],
      id: 0
    },
    {
      graphFragment: { json: { items: { 2: { title: 'Item C' }, length: 50 } } },
      graphFragmentStatus: 'complete',
      keys: [2],
      id: 0
    },
  ];


  withGraphFragment(paths, model, change$)(
    Observable.of({ id: 0, keys: [0] })
      .concat(Observable.of({ id: 0, keys: [0, 1] }).delay(200))
      .concat(Observable.of({ id: 0, keys: [2] }).delay(200))
  )
    .subscribe(tapeResultObserver(t, RECYCLEJSON)(expectedResults));
});


test('Should handle paths passed as array', (t) => {
  t.plan(1);
  const {
    stream: change$,
    handler: graphChange
  } = createEventHandler();

  const model = new Model({
    cache: {
      items: {
        0: { $type: 'ref', value: ['item', 'a'] }
      },
      item: {
        a: { title: 'Item A' }
      }
    },
    recycleJSON: RECYCLEJSON,
    onChange: graphChange
  });

  const paths = [['items', 0, 'title']];

  const expectedResults = [
    {
      graphFragment: { json: { items: { 0: { title: 'Item A' } } } },
      graphFragmentStatus: 'complete',
      id: 0
    }
  ];


  withGraphFragment(paths, model, change$)(Observable.of({ id: 0 }))
    .subscribe(tapeResultObserver(t, RECYCLEJSON)(expectedResults));
});


test('Should handle null paths', (t) => {
  t.plan(1);
  const {
    stream: change$,
    handler: graphChange
  } = createEventHandler();

  const model = new Model({
    recycleJSON: RECYCLEJSON,
    onChange: graphChange
  });

  const paths = null;

  const expectedResults = [
    {
      graphFragment: {},
      graphFragmentStatus: 'complete',
      id: 0
    }
  ];


  withGraphFragment(paths, model, change$)(Observable.never().startWith({ id: 0 }))
    .subscribe(tapeResultObserver(t, RECYCLEJSON)(expectedResults));
});


test('Should emit when props change', (t) => {
  t.plan(3);
  const {
    stream: change$,
    handler: graphChange
  } = createEventHandler();

  const model = new Model({
    source: {
      get: () => Observable.of({
        paths: [['items', 0, 'title']],
        jsonGraph: {
          items: {
            0: { $type: 'ref', value: ['item', 'a'] }
          },
          item: {
            a: { title: { $type: 'atom', value: 'Item A' } }
          }
        }
      }).delay(100)
    },
    recycleJSON: RECYCLEJSON,
    onChange: graphChange
  });

  const paths = ({ id }) => [['items', id, 'title']];
  const expectedResults = [
    {
      graphFragment: {},
      graphFragmentStatus: 'next',
      id: 0,
      some: 'thing'
    },
    {
      graphFragment: { json: { items: { 0: { title: 'Item A' } } } },
      graphFragmentStatus: 'complete',
      id: 0,
      some: 'thing'
    },
    {
      graphFragment: { json: { items: { 0: { title: 'Item A' } } } },
      graphFragmentStatus: 'complete',
      id: 0,
      some: 'other thing'
    }
  ];

  withGraphFragment(paths, model, change$)(
    Observable.of({ id: 0, some: 'thing' }).concat(
      Observable.of({ id: 0, some: 'other thing' }).delay(200)
    )
  )
    .subscribe(tapeResultObserver(t, RECYCLEJSON)(expectedResults));
});


test('Should emit when props change before request resolves', (t) => {
  t.plan(3);
  const {
    stream: change$,
    handler: graphChange
  } = createEventHandler();

  // const onlyCalledOnce = onlyCalledNTimes(1);
  const model = new Model({
    source: {
      get: () => {
        // TODO - this should not result in multiple queries against the server,
        // the first of which gets cancelled, even though they request the same data
        // onlyCalledOnce(t);

        return Observable.of({
          paths: [['items', 0, 'title']],
          jsonGraph: {
            items: {
              0: { $type: 'ref', value: ['item', 'a'] }
            },
            item: {
              a: { title: { $type: 'atom', value: 'Item A' } }
            }
          }
        }).delay(100);
      }
    },
    recycleJSON: RECYCLEJSON,
    onChange: graphChange
  });

  const paths = ({ id }) => [['items', id, 'title']];
  const expectedResults = [
    {
      graphFragment: {},
      graphFragmentStatus: 'next',
      id: 0,
      some: 'thing'
    },
    {
      graphFragment: {},
      graphFragmentStatus: 'next',
      id: 0,
      some: 'other thing'
    },
    {
      graphFragment: { json: { items: { 0: { title: 'Item A' } } } },
      graphFragmentStatus: 'complete',
      id: 0,
      some: 'other thing'
    }
  ];

  withGraphFragment(paths, model, change$)(
    Observable.of({ id: 0, some: 'thing' }).concat(
      Observable.of({ id: 0, some: 'other thing' }).delay(50)
    )
  )
    .subscribe(tapeResultObserver(t, RECYCLEJSON)(expectedResults));
});


test('Should emit progressively when datasource streams multiple parts of response', (t) => {
  t.plan(4);
  const {
    stream: change$,
    handler: graphChange
  } = createEventHandler();

  const model = new Model({
    source: {
      get: () => {
        return Observable.of({
          paths: [['items', 0, 'title']],
          jsonGraph: {
            items: {
              0: { $type: 'ref', value: ['item', 'a'] }
            },
            item: {
              a: { title: { $type: 'atom', value: 'Item A' } }
            }
          }
        })
          .delay(100)
          .concat(Observable.of({
            paths: [['items', 1, 'title']],
            jsonGraph: {
              items: {
                1: { $type: 'ref', value: ['item', 'b'] }
              },
              item: {
                b: { title: { $type: 'atom', value: 'Item B' } }
              }
            }
          }).delay(100))
          .concat(Observable.of({
            paths: [['items', 2, 'title']],
            jsonGraph: {
              items: {
                2: { $type: 'ref', value: ['item', 'c'] }
              },
              item: {
                c: { title: { $type: 'atom', value: 'Item C' } }
              }
            }
          }).delay(100));
      }
    },
    recycleJSON: RECYCLEJSON,
    onChange: graphChange
  });

  const paths = () => [['items', { to: 2 }, 'title']];
  const expectedResults = [
    {
      graphFragment: {},
      graphFragmentStatus: 'next',
      id: 0
    },
    {
      graphFragment: {
        json: {
          items: {
            0: { title: 'Item A' }
          }
        }
      },
      graphFragmentStatus: 'next',
      id: 0
    },
    {
      graphFragment: {
        json: {
          items: {
            0: { title: 'Item A' },
            1: { title: 'Item B' },
          }
        }
      },
      graphFragmentStatus: 'next',
      id: 0
    },
    {
      graphFragment: {
        json: {
          items: {
            0: { title: 'Item A' },
            1: { title: 'Item B' },
            2: { title: 'Item C' }
          }
        }
      },
      graphFragmentStatus: 'complete',
      id: 0
    },
  ];

  withGraphFragment(paths, model, change$)(Observable.of({ id: 0 }))
    .subscribe(tapeResultObserver(t, RECYCLEJSON)(expectedResults));
});


test('Should detect changes to the graph', (t) => {
  t.plan(4);
  const {
    stream: change$,
    handler: graphChange
  } = createEventHandler();

  const model = new Model({
    source: {
      get: () => Observable.of({
        paths: [['items', 0, 'title']],
        jsonGraph: {
          items: {
            0: { $type: 'ref', value: ['item', 'a'] }
          },
          item: {
            a: { title: { $type: 'atom', value: 'Item A' } }
          }
        }
      }).delay(50),
      set: () => Observable.of({
        paths: [['items', 0, 'title']],
        jsonGraph: {
          items: {
            0: { $type: 'ref', value: ['item', 'a'] }
          },
          item: {
            a: { title: { $type: 'atom', value: 'Item A edited' } }
          }
        }
      }).delay(50)
    },
    recycleJSON: RECYCLEJSON,
    onChange: graphChange
  });

  const paths = ({ id }) => [['items', id, 'title']];

  /**
   * The extra emission here
   * setValue() emits immediately as it updates the cache,
   * and when the request resolves
   */
  const expectedResults = [
    {
      graphFragment: {},
      graphFragmentStatus: 'next',
      id: 0
    },
    {
      graphFragment: { json: { items: { 0: { title: 'Item A' } } } },
      graphFragmentStatus: 'complete',
      id: 0
    },
    {
      graphFragment: { json: { items: { 0: { title: 'Item A edited' } } } },
      graphFragmentStatus: 'complete',
      id: 0
    },
    {
      graphFragment: { json: { items: { 0: { title: 'Item A edited' } } } },
      graphFragmentStatus: 'complete',
      id: 0
    }
  ];

  setTimeout(() => {
    model.setValue(['items', 0, 'title'], 'Item A edited')
      .subscribe();
  }, 100);

  withGraphFragment(paths, model, change$)(Observable.of({ id: 0 }))
    .subscribe(tapeResultObserver(t, RECYCLEJSON)(expectedResults));
});


test('Should handle queries whose nodes expire immediately', (t) => {
  t.plan(2);
  const {
    stream: change$,
    handler: graphChange
  } = createEventHandler();

  const model = new Model({
    source: {
      get: () => {
        return Observable.of({
          paths: [['items', 0, 'title']],
          jsonGraph: {
            items: {
              0: { $type: 'ref', value: ['item', 'a'], $expires: 0 }
            },
            item: {
              a: { title: { $type: 'atom', value: 'Item A', $expires: 0 } }
            }
          }
        }).delay(100);
      }
    },
    recycleJSON: RECYCLEJSON,
    onChange: graphChange
  });

  const paths = ({ id }) => [['items', id, 'title']];

  const expectedResults = [
    {
      graphFragment: {},
      graphFragmentStatus: 'next',
      id: 0
    },
    {
      graphFragment: { json: { items: { 0: { title: 'Item A' } } } },
      graphFragmentStatus: 'complete',
      id: 0
    }
  ];


  withGraphFragment(paths, model, change$)(Observable.of({ id: 0 }))
    .subscribe(tapeResultObserver(t, RECYCLEJSON)(expectedResults));
});


test.skip('Should modify query stream via prefixStream without modifying prop stream', (t) => {
  t.plan(4);
  const {
    stream: change$,
    handler: graphChange
  } = createEventHandler();

  const model = new Model({
    cache: {
      items: {
        0: { $type: 'ref', value: ['item', 'a'] }
      },
      item: {
        a: { title: 'Item A' }
      }
    },
    recycleJSON: RECYCLEJSON,
    onChange: graphChange
  });

  const paths = [['items', 0, 'title']];

  const expectedResults = [
    {
      graphFragment: {},
      graphFragmentStatus: 'next',
      some: 'thing1',
      id: 0
    },
    {
      graphFragment: {},
      graphFragmentStatus: 'next',
      some: 'thing2',
      id: 0
    },
    {
      graphFragment: {},
      graphFragmentStatus: 'next',
      some: 'thing3',
      id: 0
    },
    {
      graphFragment: { json: { items: { 0: { title: 'Item A' } } } },
      graphFragmentStatus: 'complete',
      some: 'thing3',
      id: 0
    }
  ];

  const props$ = Observable.of({ some: 'thing1', id: 0 })
    .concat(Observable.of({ some: 'thing2', id: 0 }).delay(50))
    .concat(Observable.of({ some: 'thing3', id: 0 }).delay(50))
    .concat(Observable.never());


  withGraphFragment(paths, model, change$, {
    prefixStream: query$ => query$.debounceTime(60)
  })(props$)
    .subscribe(tapeResultObserver(t, RECYCLEJSON)(expectedResults));
});


test.skip('Should not modify query stream via prefixStream if path is null', (t) => {
  t.plan(4);
  const {
    stream: change$,
    handler: graphChange
  } = createEventHandler();

  const model = new Model({
    cache: {
      items: {
        2: { $type: 'ref', value: ['item', 'c'] }
      },
      item: {
        c: { title: 'Item C' }
      }
    },
    recycleJSON: RECYCLEJSON,
    onChange: graphChange
  });

  // simulate debounced autocomplete
  const paths = ({ id }) => id === null ? null : [['items', id, 'title']];

  const expectedResults = [
    {
      graphFragment: {},
      graphFragmentStatus: 'complete',
      id: null
    },
    {
      graphFragment: {},
      graphFragmentStatus: 'next',
      id: 1,
    },
    {
      graphFragment: {},
      graphFragmentStatus: 'next',
      id: 2,
    },
    {
      graphFragment: { json: { items: { 2: { title: 'Item C' } } } },
      graphFragmentStatus: 'complete',
      id: 2
    },
    {
      graphFragment: {},
      graphFragmentStatus: 'complete',
      id: null
    }
  ];

  const props$ = Observable.of({ id: null })
    .concat(Observable.of({ id: 1 }).delay(50))
    .concat(Observable.of({ id: 2 }).delay(50))
    .concat(Observable.of({ id: null }).delay(100))
    .concat(Observable.never());


  withGraphFragment(paths, model, change$, {
    prefixStream: query$ => query$.debounceTime(60)
  })(props$)
    .subscribe(tapeResultObserver(t, RECYCLEJSON)(expectedResults));
});


test('Should emit single error', (t) => {
  t.plan(2);
  const {
    stream: change$,
    handler: graphChange
  } = createEventHandler();

  const model = new Model({
    source: {
      get: () => Observable.timer(100)
        .concat(Observable.throw({
          status: 500
        }))
    },
    recycleJSON: RECYCLEJSON,
    onChange: graphChange
  })
    .batch()
    .boxValues()
    .treatErrorsAsValues();

  const paths = ({ id }) => [['items', id, 'title']];

  const expectedResults = [
    {
      graphFragment: {},
      graphFragmentStatus: 'next',
      id: 0
    },
    {
      graphFragment: {},
      graphFragmentStatus: 'error',
      id: 0,
      error: { $type: 'error', value: { status: 500 } }
    }
  ];


  withGraphFragment(paths, model, change$)(Observable.of({ id: 0 }))
    .subscribe(tapeResultObserver(t, RECYCLEJSON)(expectedResults));
});


test.skip('Should continue emitting after error emission', (t) => {
  t.plan(3);
  const {
    stream: change$,
    handler: graphChange
  } = createEventHandler();

  const model = new Model({
    source: {
      get: () => Observable.timer(50)
        .concat(Observable.throw({
          status: 500
        }))
    },
    recycleJSON: RECYCLEJSON,
    onChange: graphChange
  })
    .batch()
    .boxValues()
    .treatErrorsAsValues();

  const paths = ({ id }) => [['items', id, 'title']];

  const expectedResults = [
    {
      graphFragment: {},
      graphFragmentStatus: 'next',
      id: 0
    },
    {
      graphFragment: {},
      graphFragmentStatus: 'error',
      id: 0,
      error: { $type: 'error', value: { status: 500 } }
    },
    {
      graphFragment: {},
      graphFragmentStatus: 'error',
      id: 0,
      some: 'thing',
      error: { $type: 'error', value: { status: 500 } }
    }
  ];


  withGraphFragment(paths, model, change$)(
    Observable.of({ id: 0 })
      .concat(Observable.of({ id: 0, some: 'thing' }).delay(100))
  )
    .subscribe(tapeResultObserver(t, RECYCLEJSON)(expectedResults));
});


test('Should emit errors to all requests when batched request returns an error', (t) => {
  t.plan(4);
  const dataSource = {
    get: () => Observable.timer(100)
      .concat(Observable.throw({
        status: 500
      }))
  };

  const {
    stream: change$,
    handler: graphChange
  } = createEventHandler();

  const model = new Model({
    cache: {},
    source: dataSource,
    recycleJSON: RECYCLEJSON,
    onChange: graphChange
  })
    // .batch()
    // .boxValues()
    .treatErrorsAsValues();
    // TODO - why does this output a pathValue rather than a sentinel when treatErrorsAsValues() is not flagged
    // e.g. { id: 1, graphFragment: {}, graphFragmentStatus: 'error', error: [ { path: [ 'items', 1, 'title' ], value: { $type: 'error', value: { status: 500 } } } ] }

  const paths = ({ id }) => [['items', id, 'title']];

  const expectedResults0 = [
    {
      graphFragment: {},
      graphFragmentStatus: 'next',
      id: 0,
    },
    {
      graphFragment: {},
      graphFragmentStatus: 'error',
      id: 0,
      error: { $type: 'error', value: { status: 500 } }
    }
  ];

  const expectedResults1 = [
    {
      graphFragment: {},
      graphFragmentStatus: 'next',
      id: 1,
    },
    {
      graphFragment: {},
      graphFragmentStatus: 'error',
      id: 1,
      error: { $type: 'error', value: { status: 500 } }
    }
  ];

  withGraphFragment(paths, model, change$)(Observable.of({ id: 0 }))
    .subscribe(tapeResultObserver(t)(expectedResults0));

  withGraphFragment(paths, model, change$)(Observable.of({ id: 1 }))
    .subscribe(tapeResultObserver(t)(expectedResults1));
});


/**
 * If the same props are emitted multiple times w/o the graph changing,
 * the stream should just emit those props immediately w/ the previous graphFragment and
 * graphFragment status, w/o bothing to query the model
 */
test.skip('Should not run a second query when identical paths are passed after previous query has resolved', (t) => {
  // this supersedes 'Should emit when props change'
  t.fail('todo');
});


/**
 * Running a query while an identical request is in flight results in a second, redundant request
 * while the first request is cancelled
 * ideally, the second query would see that a request is already pending for the graphFragment it wants
 * even better would be if part of a query is already in flight, it would issue a request only for the diff
 */
test.skip('Should not issue a new request when identical paths are passed before previous query has resolved', (t) => {
  // this supersedes 'Should emit when props change before request resolves'
  t.fail('todo');
});


test.skip('Should handle node invalidation via model.call()', (t) => {
  t.fail('todo');
});
