/* eslint-disable new-parens, prefer-arrow-callback, func-names */
const Benchmark = require('benchmark');
const {
  Model: GraphistryModel
} = require('@graphistry/falcor/dist/falcor.all.min');
// const {
//   Model: GraphistryModel
// } = require('@graphistry/falcor');
const {
  Model: NetflixModel
} = require('falcor/dist/falcor.browser.min');
// const {
//   Model: NetflixModel
// } = require('falcor');
const { createCache } = require('../utils');


const createFalcorPerfTests = () => {
  const netflixModel = new NetflixModel({
    cache: createCache()
  });
  const graphistryModel = new GraphistryModel({
    cache: createCache()
  });
  const graphistryModelRecycled = new GraphistryModel({
    cache: createCache(),
    recycleJSON: true
  });
  const paths = [['items', { to: 99 }, 'title']];

  return [
    {
      async: true,
      name: '                  @netflix/falcor: model.get() 100 paths from cache',
      fn() {
        netflixModel.get(...paths).subscribe();
      }
    },
    {
      async: true,
      name: '               @graphistry/falcor: model.get() 100 paths from cache',
      fn() {
        graphistryModel.get(...paths).subscribe();
      }
    },
    {
      async: true,
      name: '@graphistry/falcor (w/ recycling): model.get() 100 paths from cache',
      fn() {
        graphistryModelRecycled.get(...paths).subscribe();
      }
    }
  ];
};

const suite = createFalcorPerfTests()
  .reduce((suite, perfTest) => (
    suite.add(perfTest) || suite
  ), new Benchmark.Suite);


suite
  .on('cycle', function (event) {
    console.log(String(event.target));
  })
  .run({ async: true });
