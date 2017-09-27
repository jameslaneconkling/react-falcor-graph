const test = require('tape');
const { Observable } = require('rxjs/Observable');
require('rxjs/add/observable/of');
require('rxjs/add/operator/concat');
require('rxjs/add/operator/delay');
require('rxjs/add/operator/distinctUntilChanged');
require('rxjs/add/operator/scan');
require('rxjs/add/operator/do');

const {
  createStore
} = require('redux');
const {
  tapeResultObserver,
  once
} = require('./test-utils');
const { withReduxStore } = require('../../src');
const { omit } = require('../../src/utils');
const { shallowEquals } = require('../../src/withReduxStore');


// test.skip('Should pass state and props to mapProps');
test('Should merge single emission with selection from store', (t) => {
  t.plan(1);

  const initialState = {
    items: [1, 2, 3]
  };
  const store = createStore((state = initialState) => state);
  const mapState = state => ({ items: state.items });

  const expectedResults = [
    {
      id: 0,
      items: [1, 2, 3]
    }
  ];

  withReduxStore(store, mapState)(Observable.of({ id: 0 }))
    .subscribe(tapeResultObserver(t)(expectedResults));
});


test('Should merge changing emissions with selection from store', (t) => {
  t.plan(2);

  const initialState = {
    items: {
      a: { title: 'Item A' },
      b: { title: 'Item B' }
    }
  };

  const store = createStore((state = initialState) => state);
  const mapState = (state, { id }) => ({ item: state.items[id] });

  const expectedResults = [
    {
      id: 'a',
      item: { title: 'Item A' }
    },
    {
      id: 'b',
      item: { title: 'Item B' }
    }
  ];

  withReduxStore(store, mapState)(
    Observable.of({ id: 'a' })
      .concat(Observable.of({ id: 'b' }).delay(50))
  )
    .subscribe(tapeResultObserver(t)(expectedResults));
});


test('Should emit when store changes', (t) => {
  t.plan(2);

  const initialState = {
    items: {
      a: { title: 'Item A' },
      b: { title: 'Item B' }
    }
  };

  const reducer = (state = initialState, action) => {
    if (action.type === 'EDIT_A') {
      return {
        items: Object.assign({}, state.items, { a: { title: 'Item A edit' } })
      };
    }
    return state;
  };
  const store = createStore(reducer);
  const mapState = (state, { id }) => ({ item: state.items[id] });

  const expectedResults = [
    {
      id: 'a',
      item: { title: 'Item A' }
    },
    {
      id: 'a',
      item: { title: 'Item A edit' }
    }
  ];

  setTimeout(() => {
    store.dispatch({ type: 'EDIT_A' });
  }, 50);

  withReduxStore(store, mapState)(
    Observable.of({ id: 'a' })
  )
    .subscribe(tapeResultObserver(t)(expectedResults));
});


test('Should not emit when paired with distinctUntilChanged', (t) => {
  t.plan(1);

  const initialState = {
    items: {
      a: { title: 'Item A' },
      b: { title: 'Item B' }
    }
  };

  const reducer = (state = initialState, action) => {
    if (action.type === 'EDIT_B') {
      return {
        items: Object.assign({}, state.items, { b: { title: 'Item B edit' } })
      };
    }
    return state;
  };
  const store = createStore(reducer);
  const mapState = (state, { id }) => ({ item: state.items[id] });

  const expectedResults = [
    {
      id: 'a',
      item: { title: 'Item A' }
    }
  ];

  setTimeout(() => {
    store.dispatch({ type: 'EDIT_B' });
  }, 50);

  withReduxStore(store, mapState)(
    Observable.of({ id: 'a' })
  )
    .distinctUntilChanged(shallowEquals)
    .subscribe(tapeResultObserver(t)(expectedResults));
});


test('Dispatch handlers should return higher order function that receives dispatch, props, and stateSelection, and that dispatch actions on store', (t) => {
  t.plan(2);

  const initialState = {
    items: {
      a: { title: 'Item A' },
      b: { title: 'Item B' }
    }
  };
  const reducer = (state = initialState, action) => {
    if (action.type === 'UPDATE_TITLE') {
      return {
        items: Object.assign({}, state.items, { [action.id]: { title: action.newTitle } })
      };
    }
    return state;
  };
  const store = createStore(reducer);
  const mapState = (state, { id }) => ({ item: state.items[id] });
  const dispatchHandlers = {
    updateTitle: (dispatch, { id }, state) => appendToTitle => dispatch({ type: 'UPDATE_TITLE', id, newTitle: `${state.item.title} ${appendToTitle}` })
  };
  const expectedResults = [
    {
      id: 'a',
      item: { title: 'Item A' }
    },
    {
      id: 'a',
      item: { title: 'Item A edited' }
    }
  ];

  withReduxStore(store, mapState, dispatchHandlers)(
    Observable.of({ id: 'a' })
  )
    .do(once(({ updateTitle }) => setTimeout(() => updateTitle('edited'), 0)))
    .map(props => omit(['updateTitle'], props))
    .subscribe(tapeResultObserver(t)(expectedResults));
});


test('Dispatch handlers should be referentially equivalent across emissions', (t) => {
  t.plan(1);

  const initialState = {
    items: [1, 2, 3]
  };
  const store = createStore((state = initialState) => state);
  const mapState = state => ({ items: state.items });
  const dispatchHandlers = {
    dispatchHandler: () => () => {}
  };

  withReduxStore(store, mapState, dispatchHandlers)(
    Observable.of({ id: 'a' })
      .concat(Observable.of({ id: 'a' }).delay(50))
  )
    .scan((prev, next) => {
      t.equal(prev.dispatchHandler, next.dispatchHandler);
      return next;
    })
    .subscribe();
});
