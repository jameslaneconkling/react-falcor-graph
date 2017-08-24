const R = require('ramda');
const {
  createEventHandler
} = require('recompose');


const createItemsCache = exports.createItemsCache = (length) => ({
  items: R.range(0, length - 1)
    .reduce((items, idx) => (
      Object.assign(items, { [idx]: { $type: 'ref', value: ['item', `_${idx}`] } })
    ), { length: { $type: 'atom', value: length } }),
  item: R.range(0, length - 1)
    .reduce((item, idx) => (
      Object.assign(item, { [`_${idx}`]: { title: { $type: 'atom', value: `Item ${idx}` } } })
    ), {})
});

exports.createFalcorModel = (
  Model, { recycleJSON = true, cache = createItemsCache(100) } = {}
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

exports.tapeResultObserver = (t) => {
  let idx = -1;

  return (expectedResults) => ({
    next(props) {
      idx += 1;
      if (expectedResults[idx]) {
        t.deepEqual(props, expectedResults[idx], `emission ${idx} should match expected output`);
      } else {
        t.fail(`test emitted more than expected ${expectedResults.length} times: \n${JSON.stringify(props)}`);
      }
    },
    error(err) {
      t.fail(`test emitted error ${JSON.stringify(err)}`);
    }
  });
};

exports.onlyCalledNTimes = n => {
  let i = 1;
  return (t) => {
    if (i > n) {
      t.fail(`test ran more than ${n} times`);
    }
    i += 1;
  };
};
