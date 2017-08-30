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
    errorHandler = (error, props) => Observable.of(Object.assign({}, props, { graphFragment: {}, graphFragmentStatus: 'error', error })),
    prefixStream = props$ => props$,
    auditTime = 0
  } = {}
) => {
  const _models = {};

  return (props$) => {
    const _props$ = Observable.from(props$);

    const graphQueryResponse$ = _props$
      .let(prefixStream)
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

        const graphQuery$ = Observable.from(model.get(..._paths).progressively());

        return graphQuery$
          .map((graphFragment) => {
            const graphFragmentStatus = graphFragment.json.$__status === 'pending' ? 'next' : 'complete';

            return Object.assign({}, props, { graphFragment, graphFragmentStatus });
          })
          .catch((err, caught) => errorHandler(err, props, caught))
          .repeatWhen(() => graphChange$);
      });

    return _props$
      .map(props => Object.assign({}, props, { graphFragment: {}, graphFragmentStatus: 'next' }))
      .merge(graphQueryResponse$)
      .auditTime(auditTime);
  };
};
