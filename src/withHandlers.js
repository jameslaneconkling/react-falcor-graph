const { mapHashMap } = require('./utils');
require('rxjs/add/operator/map');


exports.default = (handlers) => {
  let _props;

  const cachedHandlers = mapHashMap(handlers, handler => (...args) => handler(_props)(...args));

  return props$ => props$
    .map((props) => {
      _props = props;
      return Object.assign({}, props, cachedHandlers);
    });
};
