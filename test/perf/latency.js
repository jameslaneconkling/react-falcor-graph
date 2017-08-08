const { Observable } = require('rxjs/Observable');
require('rxjs/add/observable/of');
require('rxjs/add/observable/interval');
require('rxjs/add/operator/map');
require('rxjs/add/operator/take');
require('rxjs/add/operator/do');
require('rxjs/add/operator/let');

const {
  Model
} = require('@graphistry/falcor/dist/falcor.all.min');
const { createFalcorModel } = require('../utils');
const {
  connectFalcorStream
} = require('../../src');


const createPerfTest = (recycleJSON) => {
  const paths = ({ from, to }) => [['items', { from, to }, 'title']];
  const { model, change$ } = createFalcorModel(Model, { recycleJSON });
  const innerConnect = connectFalcorStream(paths, model, change$);
  const props$ = Observable.of(
    { id: 1, from: 0, to: 99 }
  );

  let t1;

  return () => {
    props$
      .do(() => t1 = new Date())
      .let(props$ => innerConnect(props$))
      .do(() => console.log('result', new Date() - t1))
      .subscribe();
  };
};

const test = createPerfTest(false)();
// for (let i = 0; i < 3; i += 1) {
//   test();
// }

const testRecycled = createPerfTest(true)();
// for (let i = 0; i < 3; i += 1) {
//   testRecycled();
// }
