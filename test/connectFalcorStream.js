const test = require('tape');
const { Observable } = require('rxjs/Observable');
require('rxjs/add/observable/of');
const { Model } = require('@graphistry/falcor/dist/falcor.all.min');
const {
  createFalcorModel,
  tapeResultObserver
} = require('./utils');
const { connectFalcorStream } = require('../src');


test('Should only emit complete graphFragment for path in cache', (t) => {
  t.plan(1);
  const paths = ({ id }) => [['items', id, 'title']];
  const expectedResults = [
    {
      graphFragment: { json: { items: { 2: { title: 'Item 2' } } } },
      graphFragmentStatus: 'complete',
      id: 2
    }
  ];

  const { model, change$ } = createFalcorModel(Model);

  connectFalcorStream(paths, model, change$)(Observable.of({ id: 2 }))
    .subscribe(tapeResultObserver(t)(expectedResults));
});


test('Should only emit once for multiple identical props', (t) => {
  t.plan(1);
  const paths = ({ id }) => [['items', id, 'title']];
  const expectedResults = [
    {
      graphFragment: { json: { items: { 2: { title: 'Item 2' } } } },
      graphFragmentStatus: 'complete',
      id: 2
    }
  ];

  const { model, change$ } = createFalcorModel(Model);

  connectFalcorStream(paths, model, change$)(Observable.of({ id: 2 }, { id: 2 }))
    .subscribe(tapeResultObserver(t)(expectedResults));
});
