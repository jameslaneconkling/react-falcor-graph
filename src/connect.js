/* eslint-disable max-len, no-underscore-dangle */
const {
  hoistStatics,
  compose,
  setDisplayName,
  wrapDisplayName,
  mapPropsStream
} = require('recompose');
const withGraphFragment = require('./withGraphFragment');


/**
 * @param {(props) => paths | paths} paths
 * @param {Object} falcorModel
 * @param {Observable<>} graphChange$
 * @param {Object} options
 */
exports.default = (paths, falcorModel, graphChange$, options) => WrappedComponent =>
  hoistStatics(compose(
    setDisplayName(wrapDisplayName(WrappedComponent, 'FalcorConnect')),
    mapPropsStream(withGraphFragment(paths, falcorModel, graphChange$, options))
  ))(WrappedComponent);
