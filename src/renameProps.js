require('rxjs/add/operator/map');
const { mapKeys } = require('./utils');


exports.default = nameMap => props$ =>
  props$.map(props => mapKeys((key) => nameMap[key] !== undefined ? nameMap[key] : key , props));
