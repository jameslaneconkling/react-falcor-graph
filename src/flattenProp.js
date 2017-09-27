require('rxjs/add/operator/map');


exports.default = propName => props$ =>
  props$.map(props => Object.assign({}, props, props[propName]));
