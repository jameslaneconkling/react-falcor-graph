/* global document */
import React                  from 'react';
import { render }             from 'react-dom';
import {
  compose,
  withProps,
  mapProps,
  createEventHandler
}                             from 'recompose';
import {
  Model
}                             from '@graphistry/falcor';
import {
  connectFalcor
}                             from '../../src';


const {
  stream: change$,
  handler: graphChange
} = createEventHandler();
const model = new Model({
  cache: {
    items: {
      0: { $type: 'ref', value: ['item', 'a'] }
    },
    item: {
      a: { title: 'Item A' }
    }
  },
  onChange: graphChange
});

const paths = ({ id }) => [['items', id, 'title']];

const App = ({ id, itemTitle, graphFragmentStatus }) => (
  <div>
    <div>ID: {id}</div>
    <div>Status: {graphFragmentStatus}</div>
    <div>Title: {itemTitle} </div>
  </div>
);

const ConnectedApp = compose(
  withProps(() => ({ id: 0 })),
  connectFalcor(paths, model, change$),
  mapProps(({ graphFragment, id, ...rest }) => ({
    ...rest,
    id,
    itemTitle: graphFragment.json ? graphFragment.json.items[id].title : ''
  }))
)(App);


render((
  <ConnectedApp />
), document.getElementById('app'));
