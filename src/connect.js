/* eslint-disable max-len, no-underscore-dangle */
const {
  hoistStatics,
  compose,
  setDisplayName,
  wrapDisplayName,
  mapPropsStream
} = require('recompose');
const {
  Observable
} = require('rxjs/Observable');
require('rxjs/add/observable/from');
require('rxjs/add/operator/distinctUntilChanged');
require('rxjs/add/operator/merge');
require('rxjs/add/operator/withLatestFrom');
require('rxjs/add/operator/let');
require('rxjs/add/operator/switchMap');
require('rxjs/add/operator/startWith');
require('rxjs/add/operator/map');
require('rxjs/add/operator/last');
require('rxjs/add/operator/catch');
require('rxjs/add/operator/auditTime');
require('rxjs/add/operator/delay');
var {
  animationFrame
} = require('rxjs/scheduler/animationFrame');


/**
 * @param {(props) => paths | paths} paths
 * @param {Object} falcorModel
 * @param {Observable<>} change$
 * @param {Object} options
 */
const connectFalcorStream = exports.connectFalcorStream = (
  paths,
  falcorModel,
  change$,
  {
    errorHandler = (props, error) => Observable.of(Object.assign({}, props, { graphFragment: {}, graphFragmentStatus: 'error', error })),
    prefixStream = props$ => props$
  } = {}
) => {
  const _models = {};

  return (props$) => {
    const _props$ = Observable.from(props$);

    const graphQueryResponse$ = _props$
      // .distinctUntilChanged((prev, next) => equals(
      //   typeof paths === 'function' ? paths(prev) : paths,
      //   typeof paths === 'function' ? paths(next) : paths
      // ))
      .merge(Observable.from(change$).withLatestFrom(_props$, (_, props) => props))
      .let(prefixStream)
      .switchMap((props) => {
        const _paths = typeof paths === 'function' ? paths(props) : paths;

        if (_paths === null) {
          return Observable.of(Object.assign({}, props, { graphFragment: {}, graphFragmentStatus: 'complete' }));
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
          // .distinctUntilKeyChanged('version') or .distinctUntilChanged((prev, next) => prev.graphFrag)
          .map(graphFragment => ({ graphFragment, graphFragmentStatus: 'next' }))
          .merge(graphQuery$.last().map(graphFragment => ({ graphFragment, graphFragmentStatus: 'complete' })))
          .catch((err, caught) => errorHandler(props, err, caught));
      });

    return _props$
      .map(props => Object.assign({}, props, { graphFragment: {}, graphFragmentStatus: 'next' }))
      .merge(graphQueryResponse$.withLatestFrom(_props$, (graphQuery, props) => Object.assign({}, props, graphQuery)))
      .auditTime(0, animationFrame);
  };
};


/**
 * @param {(props) => paths | paths} paths
 * @param {Object} falcorModel
 * @param {Observable<>} change$
 * @param {Object} options
 */
exports.default = (paths, falcorModel, change$, options) => WrappedComponent =>
  hoistStatics(compose(
    setDisplayName(wrapDisplayName(WrappedComponent, 'FalcorConnect')),
    mapPropsStream(connectFalcorStream(paths, falcorModel, change$, options))
  ))(WrappedComponent);
