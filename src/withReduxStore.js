const { observable } = require('rxjs/symbol/observable');
const {
  Observable
} = require('rxjs/Observable');
require('rxjs/add/observable/from');
require('rxjs/add/operator/combineLatest');
require('rxjs/add/operator/distinctUntilChanged');
require('rxjs/add/operator/map');


/**
 * @param {Object} store
 *
 * @returns {Observable<state>}
 */
const observableFromStore = exports.observableFromStore = store => ({
  subscribe: (observer) => {
    let state = store.getState();

    const unsubscribe = store.subscribe(() => {
      const newState = store.getState();

      if (newState !== state) {
        state = newState;
        observer.next(newState);
      }
    });

    observer.next(state);

    return { unsubscribe };
  },
  [observable]() {
    return this;
  }
});


/**
 * @param {Object} first
 * @param {Object} second
 *
 * @returns {Boolean}
 */
const shallowEquals = exports.shallowEquals = (first, second) => {
  if (first === second) {
    return true;
  }

  const firstKeys = Object.keys(first);
  const secondKeys = Object.keys(second);

  if (firstKeys.length !== secondKeys.length) {
    return false;
  }

  for (let i = 0; i < firstKeys.length; i++) {
    if (first[firstKeys[i]] !== second[firstKeys[i]]) {
      return false;
    }
  }

  return true;
};


/**
 * @param {Object} store
 * @param {(state, props) -> props} mapState
 * @param {(dispatch, props) -> props} mapDispatch
 *
 * @returns {Observable<props> -> Observable<props>}
 */
exports.default = (store, mapState, mapDispatch) => props$ => {
  const store$ = observableFromStore(store);

  // NOTE - how will this handle nested connected components?
  // see react-redux's approach: parent connected components update
  // state tree fully before children receive subscription update
  return Observable.from(props$)
    .combineLatest(
      Observable.from(store$),
      (props, state) => ([props, mapState(state, props)])
    )
    .distinctUntilChanged(([prevProps, prevStateProps], [props, stateProps]) =>
      shallowEquals(prevProps, props) &&
      shallowEquals(prevStateProps, stateProps)
    )
    .map(([props, stateProps]) => Object.assign({}, props, stateProps, mapDispatch(store.dispatch, props)));
};
