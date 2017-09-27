const { observable } = require('rxjs/symbol/observable');
const {
  Observable
} = require('rxjs/Observable');
require('rxjs/add/observable/from');
require('rxjs/add/observable/combineLatest');
require('rxjs/add/operator/distinctUntilChanged');
require('rxjs/add/operator/withLatestFrom');
require('rxjs/add/operator/startWith');
const {
  mapValues
} = require('./utils');


/**
 * @param {Object} store
 *
 * @returns {Observable<state>}
 */
const observableFromStore = exports.observableFromStore = store => ({
  subscribe: (observer) => {
    const unsubscribe = store.subscribe(() => observer.next(store.getState()));

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
exports.shallowEquals = (first, second) => {
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

const strictEquals = exports.strictEquals = (first, second) => first === second;


/**
 * @param {Object} store
 * @param {(state, props) -> props} mapState
 * @param {{ [string]: (dispatch, props, state) => void }} dispatchHandlers
 *
 * @returns {Observable<props> -> Observable<props>}
 */
exports.default = (store, mapState = state => state, dispatchHandlers = {}) => props$ => {
  let _props;
  let _stateSelection;
  const cachedDispatchHandlers = mapValues(handler => (...args) => handler(store.dispatch, _props, _stateSelection)(...args), dispatchHandlers);

  // NOTE - how will this handle nested connected components?
  // see react-redux's approach: parent connected components update
  // state tree fully before children receive subscription update
  return Observable.combineLatest(
    Observable.from(props$),
    Observable.from(observableFromStore(store))
      .startWith(store.getState())
      .distinctUntilChanged(strictEquals),
    (props, state) => {
      _props = props;
      _stateSelection = mapState(state, props);

      return Object.assign({}, props, _stateSelection, cachedDispatchHandlers);
    }
  );
};
