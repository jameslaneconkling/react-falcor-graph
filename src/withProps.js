require('rxjs/add/operator/map');


exports.default = projection => props$ =>
  props$.map((props) => Object.assign({}, props, projection(props)));
