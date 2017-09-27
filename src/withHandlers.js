require('rxjs/add/operator/map');
const { mapValues } = require('./utils');


exports.default = (handlers) => {
  let _props;

  const cachedHandlers = mapValues(handler => (...args) => handler(_props)(...args), handlers);

  return props$ => props$
    .map((props) => {
      _props = props;
      return Object.assign({}, props, cachedHandlers);
    });
};
