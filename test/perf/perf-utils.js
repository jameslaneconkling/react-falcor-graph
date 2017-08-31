const { observable } = require('rxjs/symbol/observable');



exports.model4To5 = model => ({
  get: (...args) => ({
    progressively: () => ({
      subscribe(observer) {
        const subscription = model.get(...args)
          .progressively()
          .subscribe({
            onNext(data) { observer.next(data); },
            onError(data) { observer.error(data); },
            onCompleted(data) { observer.complete(data); }
          });

        return {
          unsubscribe: () => subscription.dispose()
        };
      },
      [observable]() {
        return this;
      }
    })
  })
});


const createPerfTests = exports.createPerfTests = ([head, ...rest]) => {
  if (head) {
    console.log(head.name);

    head.body()
      // .do(({ t1, t2 }) => console.log(`\t${t2 - t1}ms`))
      .repeat(head.options && head.options.iterations || 500)
      .reduce(({ runningSum, count }, { t1, t2 }) => ({
        runningSum: runningSum + (t2 - t1),
        count: count + 1
      }), { runningSum: 0, count: 0 })
      .delay(0)
      .subscribe({
        next: ({ runningSum, count }) => console.log(`\tAverage Time: ${Math.round((runningSum / count) * 10) / 10}ms\n`),
        complete: () => {
          typeof global.gc === 'function' && global.gc();
          createPerfTests(rest);
        }
      });
  }
};
