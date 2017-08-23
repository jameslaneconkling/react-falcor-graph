const {
  Observable
} = require('rxjs/Observable');
require('rxjs/add/observable/from');
require('rxjs/add/observable/empty');
require('rxjs/add/operator/withLatestFrom');
require('rxjs/add/operator/last');
require('rxjs/add/operator/merge');
require('rxjs/add/operator/repeatWhen');
require('rxjs/add/operator/let');
require('rxjs/add/operator/switchMap');
require('rxjs/add/operator/startWith');
require('rxjs/add/operator/map');
require('rxjs/add/operator/catch');
require('rxjs/add/operator/auditTime');


/**
 * @param {(props) => paths | paths | null | Error} paths
 * @param {Object} falcorModel
 * @param {Observable<>} graphChange$
 * @param {Object} options
 */
exports.default = (
  paths,
  falcorModel,
  graphChange$,
  {
    errorHandler = error => Observable.of({ graphFragment: {}, graphFragmentStatus: 'error', error }),
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
        } else if (paths instanceof Error) {
          return Observable.of(Object.assign({}, props, { graphFragment: {}, graphFragmentStatus: 'error', error: paths.message }));
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
          .map(graphFragment => ({ graphFragment, graphFragmentStatus: 'next' }))
          .catch((err, caught) => errorHandler(err, props, caught))
          .merge(graphQuery$
            .last()
            .map(graphFragment => ({ graphFragment, graphFragmentStatus: 'complete' }))
            .catch(() => Observable.empty())
          )
          .repeatWhen(() => graphChange$);
      });

    return props$
      .map(props => Object.assign({}, props, { graphFragment: {}, graphFragmentStatus: 'next' }))
      .merge(graphQueryResponse$.withLatestFrom(props$, (response, props) => Object.assign({}, props, response)))
      .auditTime(auditTime);

    // Note - the more straightforward use of combineLatest fails when props$ fires rapidly
    // a situation with no test case yet
    // return Observable.combineLatest(
    //   _props$,
    //   graphQueryResponse$.startWith({ graphFragment: {}, graphFragmentStatus: 'next' }),
    //   (props, graphQueryResponse) => Object.assign({}, props, graphQueryResponse)
    // );
  };
};
