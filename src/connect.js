const {
  hoistStatics,
  compose,
  setDisplayName,
  wrapDisplayName,
  mapPropsStream
} = require('recompose');
const withGraphFragment = require('./withGraphFragment');
const withReduxStore = require('./withReduxStore');


/**
 * @param {(props) => paths | paths} paths
 * @param {Object} falcorModel
 * @param {Observable<>} graphChange$
 * @param {Object} options
 *
 * @returns {Component -> Component}
 */
exports.connectFalcor = (paths, falcorModel, graphChange$, options) => WrappedComponent =>
  hoistStatics(compose(
    setDisplayName(wrapDisplayName(WrappedComponent, 'FalcorConnect')),
    mapPropsStream(withGraphFragment(paths, falcorModel, graphChange$, options))
  ))(WrappedComponent);

/**
 * @param {Object} store
 * @param {(state, props) -> props} mapState
 * @param {(dispatch, props) -> props} mapDispatch
 *
 * @returns {Component -> Component}
 */
exports.connectRedux = (store, mapState, mapDispatch) => WrappedComponent =>
  hoistStatics(compose(
    setDisplayName(wrapDisplayName(WrappedComponent, 'ReduxConnect')),
    mapPropsStream(withReduxStore(store, mapState, mapDispatch))
  ))(WrappedComponent);