const tape = require('tape');
const {
  walkTree,
  expandPath,
  expandPaths
} = require('../../src/utils');


tape('walkTree - Should return the value in the tree at the specified value', (t) => {
  t.plan(1);

  const tree = {
    people: { 1: { name: 'Tom', age: 28 } }
  };
  const path = ['people', 1, 'name'];
  const expected = 'Tom';

  t.equal(walkTree(path, tree), expected);
});


tape('walkTree - Should return a subset of the tree if path does not resolve to value', (t) => {
  t.plan(1);

  const tree = {
    people: { 1: { name: 'Tom', age: 28 } }
  };
  const path = ['people', 1];
  const expected = { name: 'Tom', age: 28 };

  t.deepEqual(walkTree(path, tree), expected);
});


tape('walkTree - Should return undefined if the path does exist in the tree', (t) => {
  t.plan(1);

  const tree = {
    people: { 1: { name: 'Tom', age: 28 } }
  };
  const path = ['people', 2, 'name'];
  const expected = undefined;

  t.equal(walkTree(path, tree), expected);
});


tape('walkTree - Should return full tree if path is empty', (t) => {
  t.plan(1);

  const tree = {
    people: { 1: { name: 'Tom', age: 28 } }
  };
  const path = [];
  const expected = {
    people: { 1: { name: 'Tom', age: 28 } }
  };

  t.deepEqual(walkTree(path, tree), expected);
});


tape('walkTree - Should follow refs', (t) => {
  t.plan(1);

  const tree = {
    people: {
      1: { $type: 'ref', value: ['peopleById', '_1'] }
    },
    peopleById: {
      _1: { name: 'Tom' }
    }
  };
  const path = ['people', 1, 'name'];
  const expected = 'Tom';

  t.equal(walkTree(path, tree), expected);
});


tape('expandPath - Should expand a simple path into a list of paths', (t) => {
  t.plan(1);

  const path = ['people', 1, 'age'];
  const expected = [['people', 1, 'age']];

  t.deepEqual(expandPath(path), expected);
});


tape('expandPath - Should expand a path with a single keySet of length 2 into a list of 2 paths', (t) => {
  t.plan(1);

  const path = ['people', 1, ['age', 'name']];
  const expected = [
    ['people', 1, 'age'],
    ['people', 1, 'name']
  ];

  t.deepEqual(expandPath(path), expected);
});


tape('expandPath - Should expand a path with two keySets of length 2 and 3 into a list of 6 paths', (t) => {
  t.plan(1);

  const path = ['people', [1, 2, 4], ['age', 'name']];
  const expected = [
    ['people', 1, 'age'],
    ['people', 2, 'age'],
    ['people', 4, 'age'],
    ['people', 1, 'name'],
    ['people', 2, 'name'],
    ['people', 4, 'name']
  ];

  t.deepEqual(expandPath(path), expected);
});


tape('expandPath - Should expand a path with range from key into a list of paths', (t) => {
  t.plan(1);

  const path = ['people', { to: 2 }, 'age'];
  const expected = [
    ['people', 0, 'age'],
    ['people', 1, 'age'],
    ['people', 2, 'age']
  ];

  t.deepEqual(expandPath(path), expected);
});


tape('expandPath - Should expand a path with range and keySet into a list of paths', (t) => {
  t.plan(1);

  const path = ['people', { from: 1, to: 3 }, ['age', 'name']];
  const expected = [
    ['people', 1, 'age'],
    ['people', 2, 'age'],
    ['people', 3, 'age'],
    ['people', 1, 'name'],
    ['people', 2, 'name'],
    ['people', 3, 'name']
  ];

  t.deepEqual(expandPath(path), expected);
});


tape('expandPaths - Should expand two simple paths into a list of 2 paths', (t) => {
  t.plan(1);

  const paths = [
    ['people', 1, 'age'],
    ['people', 1, 'name']
  ];
  const expected = [
    ['people', 1, 'age'],
    ['people', 1, 'name']
  ];

  t.deepEqual(expandPaths(paths), expected);
});


tape('expandPaths - Should expand two pathSets into a list of paths', (t) => {
  t.plan(1);

  const paths = [
    ['people', 1, ['age', 'name']],
    ['people', [3, 4], 'name']
  ];
  const expected = [
    ['people', 1, 'age'],
    ['people', 1, 'name'],
    ['people', 3, 'name'],
    ['people', 4, 'name']
  ];

  t.deepEqual(expandPaths(paths), expected);
});


tape('expandPaths - Should expand two pathSets with ranges into a list of paths', (t) => {
  t.plan(1);

  const paths = [
    ['people', 1, ['age', 'name']],
    ['people', { from: 3, to: 4 }, 'name']
  ];
  const expected = [
    ['people', 1, 'age'],
    ['people', 1, 'name'],
    ['people', 3, 'name'],
    ['people', 4, 'name']
  ];

  t.deepEqual(expandPaths(paths), expected);
});
