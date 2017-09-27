/* eslint-disable new-parens, prefer-arrow-callback, func-names, no-shadow */
const Benchmark = require('benchmark');
const { Observable } = require('rxjs/Observable');
require('rxjs/add/observable/of');
require('rxjs/add/observable/interval');
require('rxjs/add/operator/map');
require('rxjs/add/operator/take');
const {
  Model
} = require('@graphistry/falcor/dist/falcor.all.min');
const {
  createFalcorModel,
  createItemsCache
} = require('../unit/test-utils');
const { withGraphFragment } = require('../../src/');


const createPerfTests = () => {
  const paths = ({ from, to }) => [['items', { from, to }, 'title']];
  const { model, change$ } = createFalcorModel(Model, { recycleJSON: false, cache: createItemsCache(200) });

  const from = { 0: 0, 1: 99 };
  const to = { 0: 100, 1: 199 };
  let id = 0;

  const innerConnect1 = withGraphFragment(paths, model, change$)(
    Observable.of({ id: 0, from: 0, to: 49 })
  );
  const innerConnect2 = withGraphFragment(paths, model, change$)(
    Observable.of({ id, from: from[id], to: to[id] })
  );

  return [
    {
      defer: true,
      name: '                               connect 100 paths from cache:',
      fn(deferred) {
        innerConnect1.subscribe({
          next() { deferred.resolve(); }
        });
      },
      onError(e) { console.log(e); }
    },
    {
      defer: true,
      name: '                           connect changing paths from cache:',
      fn(deferred) {
        innerConnect2.subscribe({
          next() {
            deferred.resolve();
            id = (id + 1) % 2;
          }
        });
      },
      onError(e) { console.log(e); }
    }
  ];
};

const createPerfTestsRecycled = () => {
  const paths = ({ from, to }) => [['items', { from, to }, 'title']];
  const { model, change$ } = createFalcorModel(Model, { recycleJSON: false, cache: createItemsCache(200) });

  const from = { 0: 0, 1: 99 };
  const to = { 0: 100, 1: 199 };
  let id = 0;

  const innerConnect1 = withGraphFragment(paths, model, change$)(
    Observable.of({ id: 0, from: 0, to: 49 })
  );
  const innerConnect2 = withGraphFragment(paths, model, change$)(
    Observable.of({ id, from: from[id], to: to[id] })
  );

  return [
    {
      defer: true,
      name: '                    connect 100 paths from cache [recycled]:',
      fn(deferred) {
        innerConnect1.subscribe({
          next() { deferred.resolve(); }
        });
      },
      onError(e) { console.log(e); }
    },
    {
      defer: true,
      name: '                connect changing paths from cache [recycled]:',
      fn(deferred) {
        innerConnect2.subscribe({
          next() {
            deferred.resolve();
            id = (id + 1) % 2;
          }
        });
      },
      onError(e) { console.log(e); }
    }
  ];
};

const suite = [
  ...createPerfTests(),
  ...createPerfTestsRecycled()
]
  .reduce((suite, perfTest) => (
    suite.add(perfTest) || suite
  ), new Benchmark.Suite);


suite
  .on('cycle', function (event) {
    console.log(String(event.target));
  })
  .run();
