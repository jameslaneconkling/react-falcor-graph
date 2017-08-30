const {
  Observable
} = require('rxjs/Observable');
require('rxjs/add/observable/from');
require('rxjs/add/observable/of');
require('rxjs/add/observable/empty');
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
        } else if (!isPaths(_paths)) {
          console.error('Expected an array of paths, e.g [["todos", 0, "title"],["todos", "length"]].  Received:', _paths);
          return Observable.of(Object.assign({}, props, {
            graphFragment: {},
            graphFragmentStatus: 'error',
            error: `Expected an array of paths, e.g [["todos", 0, "title"],["todos", "length"]].  Received ${JSON.stringify(_paths)}`
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

        return Observable.from(model.get(..._paths).progressively())
          .map((graphFragment) => {
            const graphFragmentStatus = graphFragment.json.$__status === 'pending' ? 'next' : 'complete';

            return Object.assign({}, props, { graphFragment, graphFragmentStatus });
          })
          .catch((err, caught) => errorHandler(err, props, caught))
          .let(graphQuery$ => graphQuery$
            .merge(
              Observable.of(Object.assign({}, props, { graphFragment: {}, graphFragmentStatus: 'next' }))
            )
            .throttleTime(0)
          )
          .repeatWhen(() => graphChange$);
      })
  );
};
