const {
  Observable
} = require('rxjs/Observable');
require('rxjs/add/observable/from');
require('rxjs/add/operator/startWith');
require('rxjs/add/operator/combineLatest');
const { createEventHandler } = require('recompose');


exports.default = (stateName, stateUpdaterName, initialState) => {
  const { handler, stream } = createEventHandler();

  return props$ => props$
    .combineLatest(
      Observable.from(stream).startWith(initialState),
      (props, state) => Object.assign({}, props, { [stateName]: state, [stateUpdaterName]: handler })
    );
};