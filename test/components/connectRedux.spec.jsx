/* eslint-disable react/prop-types */
import React                from 'react';
import renderer             from 'react-test-renderer';
import {
  createStore
}                           from 'redux';
import { connectRedux }     from '../../src';


test('connectRedux render component with ', () => {
  const App = ({ id, item }) => (
    <div>Id: {id} - {item.title}</div>
  );

  const store = createStore((state = {
    items: {
      a: { title: 'Item A' }
    }
  }) => state);
  const mapState = (state, { id }) => ({ item: state.items[id] });
  const mapDispatch = () => ({});

  const ConnectedApp = connectRedux(
    store, mapState, mapDispatch
  )(App);


  const tree = renderer.create(<ConnectedApp id="a" />).toJSON();

  expect(tree).toMatchSnapshot();
});
