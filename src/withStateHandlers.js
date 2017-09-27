const {
  Observable
} = require('rxjs/Observable');
require('rxjs/add/observable/from');
require('rxjs/add/operator/startWith');
require('rxjs/add/operator/combineLatest');
const { createEventHandler } = require('recompose');
const { mapValues } = require('./utils');


exports.default = (initialState, stateHandlers) => {
  const { handler: setState, stream: state$ } = createEventHandler();
  let _state;
  let _props;
  const cachedHandlers = mapValues(
    handler => (...args) => {
      const newStateFragment = handler(_state, _props)(...args);
      newStateFragment !== undefined && setState(Object.assign(_state, newStateFragment));
    },
    stateHandlers
  );

  return props$ => props$
    .combineLatest(
      Observable.from(state$).startWith(undefined),
      (props, state = typeof initialState === 'function' ? initialState(props) : initialState) => {
        _props = props;
        _state = state;
        return Object.assign({}, props, state, cachedHandlers);
      }
    );
};
