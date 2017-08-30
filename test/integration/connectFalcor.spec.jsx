/* eslint-disable react/prop-types */
import React                from 'react';
import {
  mount
}                           from 'enzyme';
import {
  createEventHandler
}                           from 'recompose';
import {
  Model
}                           from '@graphistry/falcor/dist/falcor.all.min';
import {
  connectFalcor
}                           from '../../src';

const Empty = () => null;
const createSpyComponent = () => {
  let propsOverTime = [];

  const Spy = (props) => {
    propsOverTime.push(props);
    return <Empty />;
  };

  Spy.propsOverTime = propsOverTime;

  return Spy;
};

xtest('connectFalcor renders component with graphFragment', done => {
  expect.assertions(1);
  const Component = createSpyComponent();
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

  const ConnectedComponent = connectFalcor(
    paths, model, change$
  )(Component);

  mount(<ConnectedComponent id={0} />);

  expect(Component.propsOverTime).toEqual([
    { id: 0, graphFragment: { json: {} }, graphFragmentStatus: 'next' },
    { id: 0, graphFragment: { json: {} }, graphFragmentStatus: 'complete' }
  ]);

  done();
});
