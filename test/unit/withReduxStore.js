const test = require('tape');
const { Observable } = require('rxjs/Observable');
require('rxjs/add/observable/of');
require('rxjs/add/operator/concat');
require('rxjs/add/operator/delay');
const {
  createStore
} = require('redux');
const {
  tapeResultObserver
} = require('./test-utils');
const { withReduxStore } = require('../../src');


test('Should merge single emission with store', (t) => {
  t.plan(1);

  const initialState = {
    items: [1, 2, 3]
  };
  const store = createStore((state = initialState) => state);
  const mapState = state => ({ items: state.items });
  const mapDispatch = () => ({});

  const expectedResults = [
    {
      id: 0,
      items: [1, 2, 3]
    }
  ];

  withReduxStore(store, mapState, mapDispatch)(Observable.of({ id: 0 }))
    .subscribe(tapeResultObserver(t)(expectedResults));
});


test('Should merge changing emissions with store', (t) => {
  t.plan(2);

  const initialState = {
    items: {
      a: { title: 'Item A' },
      b: { title: 'Item B' }
    }
  };

  const store = createStore((state = initialState) => state);
  const mapState = (state, { id }) => ({ item: state.items[id] });
  const mapDispatch = () => ({});

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

  withReduxStore(store, mapState, mapDispatch)(
    Observable.of({ id: 'a' })
      .concat(Observable.of({ id: 'b' }).delay(50))
  )
    .subscribe(tapeResultObserver(t)(expectedResults));
});


test('Should not emit when selections from redux store are equal', (t) => {
  t.plan(1);

  const initialState = {
    items: {
      a: { title: 'Item A' },
      b: { title: 'Item B' }
    }
  };

  const store = createStore((state = initialState) => state);
  const mapState = (state, { id }) => ({ item: state.items[id] });
  const mapDispatch = () => ({});

  const expectedResults = [
    {
      id: 'a',
      item: { title: 'Item A' }
    }
  ];

  withReduxStore(store, mapState, mapDispatch)(
    Observable.of({ id: 'a' })
      .concat(Observable.of({ id: 'a' }).delay(50))
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
        items: Object.assign(state.items, { a: { title: 'Item A edit' } })
      };
    }
    return state;
  };
  const store = createStore(reducer);
  const mapState = (state, { id }) => ({ item: state.items[id] });
  const mapDispatch = () => ({});

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

  withReduxStore(store, mapState, mapDispatch)(
    Observable.of({ id: 'a' })
  )
    .subscribe(tapeResultObserver(t)(expectedResults));
});


test('Should not emit when store changes but selector result remains the same', (t) => {
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
        items: Object.assign(state.items, { b: { title: 'Item B edit' } })
      };
    }
    return state;
  };
  const store = createStore(reducer);
  const mapState = (state, { id }) => ({ item: state.items[id] });
  const mapDispatch = () => ({});

  const expectedResults = [
    {
      id: 'a',
      item: { title: 'Item A' }
    }
  ];

  setTimeout(() => {
    store.dispatch({ type: 'EDIT_B' });
  }, 50);

  withReduxStore(store, mapState, mapDispatch)(
    Observable.of({ id: 'a' })
  )
    .subscribe(tapeResultObserver(t)(expectedResults));
});
