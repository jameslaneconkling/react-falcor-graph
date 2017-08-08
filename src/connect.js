/* eslint-disable max-len, no-underscore-dangle */
import hoistStatics           from 'recompose/hoistStatics';
import compose                from 'recompose/compose';
import setDisplayName         from 'recompose/setDisplayName';
import wrapDisplayName        from 'recompose/wrapDisplayName';
import mapPropsStream         from 'recompose/mapPropsStream';
import { Observable }         from 'rxjs/Observable';
import                             'rxjs/add/observable/from';
import                             'rxjs/add/operator/distinctUntilChanged';
import                             'rxjs/add/operator/merge';
import                             'rxjs/add/operator/withLatestFrom';
import                             'rxjs/add/operator/let';
import                             'rxjs/add/operator/switchMap';
import                             'rxjs/add/operator/startWith';
import                             'rxjs/add/operator/map';
import                             'rxjs/add/operator/last';
import                             'rxjs/add/operator/catch';
import                             'rxjs/add/operator/auditTime';

import                             'rxjs/add/operator/delay';
import { animationFrame }     from 'rxjs/scheduler/animationFrame';


/**
 * @param {(props) => paths | paths} paths
 * @param {Object} falcorModel
 * @param {Observable<>} change$
 * @param {Object} options
 */
export const connectFalcorStream = (
  paths,
  falcorModel,
  change$,
  {
    errorHandler = (props, error) => Observable.of({ ...props, graphFragment: {}, graphFragmentStatus: 'error', error }),
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
          return Observable.of({ ...props, graphFragment: {}, graphFragmentStatus: 'complete' });
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
      .map(props => ({ ...props, graphFragment: {}, graphFragmentStatus: 'next' }))
      .merge(graphQueryResponse$.withLatestFrom(_props$, (graphQuery, props) => ({ ...props, ...graphQuery })))
      .auditTime(0, animationFrame);
  };
};


/**
 * @param {(props) => paths | paths} paths
 * @param {Object} falcorModel
 * @param {Observable<>} change$
 * @param {Object} options
 */
export default (paths, falcorModel, change$, options) => WrappedComponent =>
  hoistStatics(compose(
    setDisplayName(wrapDisplayName(WrappedComponent, 'FalcorConnect')),
    mapPropsStream(connectFalcorStream(paths, falcorModel, change$, options))
  ))(WrappedComponent);
