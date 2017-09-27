require('rxjs/add/operator/map');


exports.default = projection => props$ =>
  props$.map((props) => Object.assign({}, projection(props), props));
