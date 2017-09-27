const {
  Observable
} = require('rxjs/Observable');
require('rxjs/add/observable/from');
require('rxjs/add/operator/startWith');
require('rxjs/add/operator/combineLatest');
const { createEventHandler } = require('recompose');


exports.default = (stateName, dispatchName, reducer, initialState) => {
  const { handler: setState, stream: state$ } = createEventHandler();
  let _state;
  const dispatch = action => setState(reducer(_state, action));

  return props$ => props$
    .combineLatest(
      Observable.from(state$).startWith(undefined),
      (props, state = typeof initialState === 'function' ? initialState(props) : initialState) => {
        _state = state;
        return Object.assign({}, props, { [stateName]: state, [dispatchName]: dispatch });
      }
    );
};
