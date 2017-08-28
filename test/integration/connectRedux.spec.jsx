/* eslint-disable react/prop-types */
import React                from 'react';
import {
  shallow
}                           from 'enzyme';
import {
  createStore
}                           from 'redux';
import { connectRedux }     from '../../src';

const Empty = () => {};
const createSpyComponent = () => {
  let propsOverTime = [];

  const Spy = (props) => {
    propsOverTime.push(props);
    return <Empty />;
  };

  Spy.propsOverTime = propsOverTime;

  return Spy;
};

test('connectRedux renders component with parent props merged with props selected from redux store', () => {
  const SpyComponent = createSpyComponent();
  const store = createStore((state = {
    items: {
      a: { title: 'Item A' }
    }
  }) => state);
  const mapState = (state, { id }) => ({ title: state.items[id].title });
  const mapDispatch = () => {};

  const ConnectedComponent = connectRedux(
    store, mapState, mapDispatch
  )(SpyComponent);


  shallow(<ConnectedComponent id="a" />);

  expect(SpyComponent.propsOverTime).toEqual([{ id: 'a', title: 'Item A' }]);
});
