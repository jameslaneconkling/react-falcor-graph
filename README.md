# React Falcor Bindings

A simple rxjs-powered Higher Order Component to bind React views to the Falcor graph.

The intent is to allow for GraphQL/Relay-esque declarative data fetching at the component level, without requiring an entire framework for support.  This means the HOC bindings should play well along side other data model frameworks like Redux.

React Falcor plays well with [redux](http://redux.js.org/), [recompose](https://github.com/acdlite/recompose), and [redux-observable](redux-observable.js.org).

The HOC works by running queries against a falcor model, and merging the result stream into a component's props, specifically by injecting the props `graphFragment` (containing the query result) and `graphFragmentStatus` (containing the string `next`, `complete` or `error`).  Because falcor queries use a streaming interface, the component will render incremental results as they appear, and should pair well with a Web Socket or similar transport API.


```javascript
const TodosList = ({ from, to, graphFragment, graphFragmentStatus }) => {
  if (graphFragmentStatus === 'error') {
    return <h2>Error loading search</h2>;
  }

  return (
    <div>
      <h1>My Todos {graphfragmentStatus === 'next' && <LoadingSpinner />}</h1>
      <div>Showing {from} to {to} of {graphFragment.todos.length} todos</div>
      <ul>
        {graphFragment.todos.map(result => (
           <li>
             <h3>{result.label}</h3>
             <p>{result.description}</p>
           </li>
        ))}
      </ul>
    </div>
  );
};

const TodosListContainer = compose(
  connectFalcor(({ from, to }) => (
    ['todos', { from, to }, ['label', 'description']],
    ['todos', 'length']
  )),
  mapProps(({ graphFragment, ...rest }) => ({
    ...rest,
    todos: graphFragment.json ? graphFragment.json.todos : []
  }))
)(TodosList);
```

## Redux Integration

Because React Falcor makes no assumptions about the existence of additional state management frameworks, integrating with frameworks such as Redux is straightforward.  This can be useful if you choose not to store parts of your application state, such as view state, in the Falcor Graph.  For example, consider a paginated list:

```javascript
const TodosListContainer = compose(
  connect(
    state => ({
      from: state.todos.from,
      to: state.todos.to
    }),
    dispatch => ({
      pageUp: () => dispatch({ type: 'PAGE_UP' }),
      pageDown: () => dispatch({ type: 'PAGE_DOWN' })
    })
  )
  connectFalcor(({ from, to }) => (
    ['todos', { from, to }, ['label', 'description']],
    ['todos', 'length']
  )),
  mapProps(({ graphFragment, ...rest }) => ({
    ...rest,
    todos: graphFragment.json ? graphFragment.json.todos : []
  }))
)(TodosList);
```

React Falcor also exposes `withFalcorGraph` and `withReduxStore` for interacting directly with a stream of props, you can implement a more efficient version of the above using `recompose/mapPropsStream`.  This approach applies the container composition over an observable stream, rather than over components, reducing the overhead from the creation of intermediary components.  For example, the above container (using `connect()`, `connectFalcor()`, and `mapProps()` HOCs), creates three components.  The following equivalent approach using Observable streams only creates one component.

```javascript
const mapProps = state => ({
  from: state.todos.from,
  to: state.todos.to
});

const mapDispatch = dispatch => ({
  pageUp: () => dispatch({ type: 'PAGE_UP' }),
  pageDown: () => dispatch({ type: 'PAGE_DOWN' })
});

const TodosListContainer = mapPropsStream(props$ =>
  props$
    .let(withReduxStore(mapProps, mapDispatch))
    .let(withFalcorGraph(({ from, to }) => (
      ['todos', { from, to }, ['label', 'description']],
      ['todos', 'length']
    )))
    .map(({ graphFragment, ...rest }) => ({
      ...rest,
      todos: graphFragment.json ? graphFragment.json.todos : []
    }))
)(TodosList)
```

This approach can also be used to recreate the functionality of other common HOCs, like `recompose/withState`, `recompose/pure`, `recompose/branch` and others.  For example, here's an approach to emulating `withState`:

```javascript
const mapProps = state => ({ status: state.todos.status });

const mapDispatch = (dispatch, { newTodoLabel }) => ({
  createNewTodo: () => dispatch({ type: 'CREATE_NEW_TODO', newTodoLabel })
});

const CreateNewTodoFormContainer = mapPropsStream(props$ => {
  const { handler: setInputFieldValue, stream: inputFieldValue$ } = createEventHandler();

  props$
    .combineLatest(inputFieldValue$, (props, newTodoLabel) => ({ ...props, newTodoLabel }))
    .let(withReduxStore(mapProps, mapDispatch))
    .map(({ newTodoLabel, ...rest }) => ({
      ...rest,
      newTodoLabel,
      formIsValid: newTodoLabel.trim() !== ''
      onInputChange: e => setInputFieldValue(e.target.value)
    }))
})(CreateNewTodoForm)
```


### See Also
[graphistry/falcor-react-schema](https://github.com/graphistry/falcor/tree/master/packages/falcor-react-schema).

### License
ISC
