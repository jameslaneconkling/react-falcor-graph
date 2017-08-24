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
    let state = {};

    const unsubscribe = store.subscribe(() => {
      const newState = store.getState();

      if (newState !== state) {
        state = newState;
        observer.next(newState);
      }
    });

    return { unsubscribe };
  }
});


/**
 * @param {Object} store
 * @param {(state, props) -> props} mapState
 * @param {(dispatch, props) -> props} mapDispatch
 *
 * @returns {Observable<props> -> Observable<props>}
 */
exports.default = (store, mapState, mapDispatch) => props$ => {
  const store$ = observableFromStore(store);

  return props$
    .distinctUntilChanged()
    .combineLatest(Observable.from(store$))
    .map(([props, state]) => ([
      props,
      mapState(state, props),
      mapDispatch(store.dispatch, props)
    ]))
    .distinctUntilChanged((
      [prevProps, prevStateProps, prevDispatchProps],
      [nextProps, nextStateProps, nextDispatchProps]
    ) => (
      prevProps === nextProps &&
      prevStateProps === nextStateProps &&
      prevDispatchProps === nextDispatchProps
    ))
    .map((props, stateProps, dispatchProps) => Object.assign({}, stateProps, dispatchProps));
};
