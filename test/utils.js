const R = require('ramda');
const createEventHandler = require('recompose').createEventHandler;


const createCache = () => ({
  items: R.range(0, 99)
    .reduce((items, idx) => (
      Object.assign(items, { [idx]: { $type: 'ref', value: ['item', `_${idx}`] } })
    ), { length: { $type: 'atom', value: 100 } }),
  item: R.range(0, 99)
    .reduce((item, idx) => (
      Object.assign(item, { [`_${idx}`]: { title: { $type: 'atom', value: `Item ${idx}` } } })
    ), {})
});

const createFalcorModel = (
  Model, { recycleJSON = true, cache = createCache() } = {}
) => {
  const {
    stream: change$,
    handler: graphChange
  } = createEventHandler();

  const model = new Model({
    cache,
    recycleJSON,
    onChange: graphChange
  });

  return { model, change$ };
};

const tapeResultObserver = (t) => {
  let idx = -1;

  return (expectedResults) => {
    idx += 1;

    return {
      next(props) {
        if (expectedResults[idx]) {
          t.deepEqual(props, expectedResults[idx]);
        } else {
          t.fail(`Test emitted more than expected ${expectedResults.length} times`);
        }
      },
      error(err) {
        t.fail(err);
      },
      complete() {
        t.end();
      }
    };
  };
};

module.exports.createCache = createCache;
module.exports.createFalcorModel = createFalcorModel;
module.exports.tapeResultObserver = tapeResultObserver;
