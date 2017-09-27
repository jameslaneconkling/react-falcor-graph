const {
  Observable
} = require('rxjs/Observable');
require('rxjs/add/observable/from');
require('rxjs/add/observable/of');
require('rxjs/add/observable/empty');
require('rxjs/add/observable/merge');
require('rxjs/add/operator/first');
require('rxjs/add/operator/skip');
require('rxjs/add/operator/share');
require('rxjs/add/operator/take');
require('rxjs/add/operator/last');
require('rxjs/add/operator/merge');
require('rxjs/add/operator/concat');
require('rxjs/add/operator/throttleTime');
require('rxjs/add/operator/repeatWhen');
require('rxjs/add/operator/let');
require('rxjs/add/operator/switchMap');
require('rxjs/add/operator/startWith');
require('rxjs/add/operator/map');
require('rxjs/add/operator/catch');
require('rxjs/add/operator/auditTime');
const {
  isPaths
} = require('./utils');


/**
 * @param {props -> paths | paths | null | Error} paths
 * @param {Object} falcorModel
 * @param {Observable<>} graphChange$
 * @param {Object} options
 *
 * @returns {Observable<props> -> Observable<props>}
 */
exports.default = (
  paths,
  falcorModel,
  graphChange$,
  {
    errorHandler = (error, props) => Observable.of(Object.assign({}, props, { graphFragment: {}, graphFragmentStatus: 'error', error }))
  } = {}
) => {
  const _models = {};

  return (props$) => (
    Observable.from(props$)
      .switchMap((props) => {
        const _paths = typeof paths === 'function' ? paths(props) : paths;

        if (!_paths) {
          return Observable.of(Object.assign({}, props, { graphFragment: {}, graphFragmentStatus: 'complete' }));
        } else if (_paths instanceof Error) {
          return Observable.of(Object.assign({}, props, { graphFragment: {}, graphFragmentStatus: 'error', error: _paths.message }));
        }

        // validate input
        if (!isPaths(_paths)) {
          console.error('Expected an array of paths, e.g [["todos", 0, "title"],["todos", "length"]].  Received:', _paths);
          return Observable.of(Object.assign({}, props, {
            graphFragment: {},
            graphFragmentStatus: 'error',
            error: `Expected an array of paths, e.g [["todos", 0, "title"],["todos", "length"]].  Received ${JSON.stringify(_paths)}`
          }));
        } else if (falcorModel._recycleJSON && (props.id === undefined || props.id === null)) {
          console.error('If using FalcorModel.recycleJSON, must also pass a unique \'id\' property');
          return Observable.of(Object.assign({}, props, {
            graphFragment: {},
            graphFragmentStatus: 'error',
            error: 'If using FalcorModel.recycleJSON, must also pass a unique \'id\' property'
          }));
        }

        let model;
        if (!falcorModel._recycleJSON) {
          model = falcorModel;
        } else if (!_models[props.id]) {
          model = _models[props.id] = falcorModel._clone({ _seed: {} });
        } else {
          model = _models[props.id];
        }

        const graphQuery$ = Observable.from(model.get(..._paths).progressively());

        return Observable.merge(
          graphQuery$
            .skip(1)
            .map((graphFragment) => {
              const graphFragmentStatus = graphFragment.json && graphFragment.json.$__status === 'resolved' ? 'complete' : 'next';

              return Object.assign({}, props, { graphFragment, graphFragmentStatus });
            })
            .catch((err, caught) => errorHandler(err, props, caught)),
          graphQuery$
            .take(1)
            .merge(Observable.of({}))
            .map((graphFragment) => {
              const graphFragmentStatus = graphFragment.json && graphFragment.json.$__status === 'resolved' ? 'complete' : 'next';

              return Object.assign({}, props, { graphFragment, graphFragmentStatus });
            })
            .catch(() => Observable.empty())
            .throttleTime(0)
        )
          .repeatWhen(() => graphChange$);

        // Netflix model implementation
        // const graphQuery$ = Observable.from(model.get(..._paths).progressively());

        // return Observable.merge(
        //   graphQuery$
        //     .startWith({})
        //     .map(graphFragment => Object.assign({}, props, { graphFragment, graphFragmentStatus: 'next' }))
        //     .catch((err, caught) => errorHandler(err, props, caught)),
        //   graphQuery$
        //     .last()
        //     .catch(() => Observable.empty())
        //     .map(graphFragment => Object.assign({}, props, { graphFragment, graphFragmentStatus: 'complete' }))
        // )
        //   .repeatWhen(() => graphChange$)
        //   .auditTime(0); // audit time screws everything up: latency perf tests, input cursors jumping to end in input
      })
  );
};
