const range = (from = 0, to) => {
  const list = [];
  while (from <= to) {
    list.push(from);
    from += 1;
  }
  return list;
};


const expandPath = exports.expandPath = pathOrPathSet =>
  pathOrPathSet.reduce((paths, keyOrKeySet) => {
    if (Array.isArray(keyOrKeySet)) {
    // keySet, e.g. ['name', 'age']
      return keyOrKeySet.reduce((expandedPaths, key) =>
        [...expandedPaths, ...paths.map(path => [...path, key])],
      []);
    } else if (typeof keyOrKeySet === 'object') {
    // range, e.g. [{ from: 1, to: 3 }]
      return range(keyOrKeySet.from, keyOrKeySet.to).reduce((expandedPaths, key) =>
        [...expandedPaths, ...paths.map(path => [...path, key])],
      []);
    }
    // key
    return paths.map(path => [...path, keyOrKeySet]);
  }, [[]]);


exports.expandPaths = paths =>
  paths.reduce((expandedPaths, path) => [...expandedPaths, ...expandPath(path)], []);


const walkTree = exports.walkTree = (path, tree, graph = tree) => {
  if (path.length === 0) {
    return tree;
  } else if (path.length === 1) {
    return tree[path[0]];
  } else if (path[0] in tree && tree[path[0]].$type === 'ref') {
    // if encountering a ref, go back to the root graph and evaluate new path from there
    return walkTree([...tree[path[0]].value, ...path.slice(1)], graph);
  } else if (path[0] in tree) {
    return walkTree(path.slice(1), tree[path[0]], graph);
  }
  return undefined;
};
