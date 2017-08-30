/* eslint-disable no-console */
const { observable } = require('rxjs/symbol/observable');
const { Observable } = require('rxjs/Observable');
require('rxjs/add/observable/of');
require('rxjs/add/operator/map');
require('rxjs/add/operator/do');
require('rxjs/add/operator/let');
require('rxjs/add/operator/concat');
require('rxjs/add/operator/filter');
require('rxjs/add/operator/reduce');
require('rxjs/add/operator/delay');
require('rxjs/add/operator/repeat');
const {
  Model: GraphistryModel
} = require('@graphistry/falcor/dist/falcor.all.min');
const {
  Model: NetflixModel
} = require('falcor/dist/falcor.browser.min');
const {
  createItemsCache
} = require('../unit/test-utils');
const {
  withGraphFragment
} = require('../../src');

if (!global.gc) {
  console.warn('Manual garbage collection not enabled.  For more accurate results, please run script with the --expose-gc flag');
}


const model4To5 = model => ({
  get: (...args) => ({
    progressively: () => ({
      subscribe(observer) {
        const subscription = model.get(...args)
          .progressively()
          .subscribe({
            onNext(data) { observer.next(data); },
            onError(data) { observer.error(data); },
            onCompleted(data) { observer.complete(data); }
          });

        return {
          unsubscribe: () => subscription.dispose()
        };
      },
      [observable]() {
        return this;
      }
    })
  })
});


const createPerfTests = ([head, ...rest]) => {
  if (head) {
    console.log(head.name);

    head.body()
      // .do(({ t1, t2 }) => console.log(`\t${t2 - t1}ms`))
      .repeat(head.options && head.options.iterations || 100)
      .reduce(({ runningSum, count }, { t1, t2 }) => ({
        runningSum: runningSum + (t2 - t1),
        count: count + 1
      }), { runningSum: 0, count: 0 })
      .subscribe({
        next: ({ runningSum, count }) => console.log(`\tAverage Time: ${Math.round((runningSum / count) * 10) / 10}ms\n`),
        complete: () => {
          typeof global.gc === 'function' && global.gc();
          createPerfTests(rest);
        }
      });
  }
};


createPerfTests([
  {
    name: 'Request Static Graph of 100 Paths',
    body: () => {
      const model = new GraphistryModel({
        cache: createItemsCache(200),
        recycleJSON: false
      });

      const paths = ({ from, to }) => [['items', { from, to }, 'title']];

      const props$ = Observable.of({ id: 1, from: 0, to: 99 });

      return props$
        .map(props => Object.assign(props, { t1: new Date() }))
        .let(props$ =>
          withGraphFragment(paths, model, props$.delay(0))(props$)
        )
        .map(props => Object.assign(props, { t2: new Date() }));
    }
  },
  {
    name: 'Request Static Graph of 100 Paths [recycled]',
    body: () => {
      const model = new GraphistryModel({
        cache: createItemsCache(200),
        recycleJSON: true
      });

      const paths = ({ from, to }) => [['items', { from, to }, 'title']];

      const props$ = Observable.of({ id: 1, from: 0, to: 99 });

      return props$
        .map(props => Object.assign(props, { t1: new Date() }))
        .let(props$ =>
          withGraphFragment(paths, model, props$.delay(0))(props$)
        )
        .map(props => Object.assign(props, { t2: new Date() }));
    }
  },
  {
    name: 'Request Static Graph of 100 Paths [Netflix]',
    body: () => {
      const model = model4To5(new NetflixModel({
        cache: createItemsCache(200),
      }));


      const paths = ({ from, to }) => [['items', { from, to }, 'title']];

      const props$ = Observable.of({ id: 1, from: 0, to: 99 });

      return props$
        .map(props => Object.assign(props, { t1: new Date() }))
        .let(props$ =>
          withGraphFragment(paths, model, props$.delay(0))(props$)
        )
        .map(props => Object.assign(props, { t2: new Date() }));
    }
  },
  {
    name: 'Request Dynamic Graph of 100 Paths',
    body: () => {
      let tick = false;

      const model = new GraphistryModel({
        cache: createItemsCache(200),
        recycleJSON: false
      });

      const paths = ({ from, to }) => [['items', { from, to }, 'title']];

      const props$ = Observable.of(null)
        .map(() => {
          tick = !tick;
          return tick ?
            { id: 1, from: 0, to: 99 } :
            { id: 2, from: 100, to: 199 };
        });

      return props$
        .map(props => Object.assign(props, { t1: new Date() }))
        .let(props$ =>
          withGraphFragment(paths, model, props$.delay(0))(props$)
        )
        .map(props => Object.assign(props, { t2: new Date() }));
    }
  },
  {
    name: 'Request Dynamic Graph of 100 Paths [recycled]',
    body: () => {
      let tick = false;

      const model = new GraphistryModel({
        cache: createItemsCache(200),
        recycleJSON: true
      });

      const paths = ({ from, to }) => [['items', { from, to }, 'title']];

      const props$ = Observable.of(null)
        .map(() => {
          tick = !tick;
          return tick ?
            { id: 1, from: 0, to: 99 } :
            { id: 2, from: 100, to: 199 };
        });

      return props$
        .map(props => Object.assign(props, { t1: new Date() }))
        .let(props$ =>
          withGraphFragment(paths, model, props$.delay(0))(props$)
        )
        .map(props => Object.assign(props, { t2: new Date() }));
    }
  },
  {
    name: 'Request Dynamic Graph of 100 Paths [Netflix]',
    body: () => {
      let tick = false;

      const model = model4To5(new NetflixModel({
        cache: createItemsCache(200),
      }));

      const paths = ({ from, to }) => [['items', { from, to }, 'title']];

      const props$ = Observable.of(null)
        .map(() => {
          tick = !tick;
          return tick ?
            { id: 1, from: 0, to: 99 } :
            { id: 2, from: 100, to: 199 };
        });

      return props$
        .map(props => Object.assign(props, { t1: new Date() }))
        .let(props$ =>
          withGraphFragment(paths, model, props$.delay(0))(props$)
        )
        .map(props => Object.assign(props, { t2: new Date() }));
    }
  }
]);
