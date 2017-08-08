## React Falcor Bindings

A simple rxjs-powered Higher Order Component to bind React views to the Falcor graph.

The intent is to allow for GraphQL/Relay-esque declarative data fetching at the component level, without requiring an entire framework for support.  This means the HOC bindings should play well along side other data model frameworks like Redux.

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

Inspired in part by [graphistry/falcor-react-schema](https://github.com/graphistry/falcor/tree/master/packages/falcor-react-schema).

### License
ISC
