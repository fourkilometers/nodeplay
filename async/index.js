function series(tasks) {
  return new Promise((resolve, rejcet) => {
    let i = 0;
    const result = [];
    const generator = generatorWrapper(tasks);
    generator.next();

    function* generatorWrapper(tasks) {
      for (; i < tasks.length; i++) {
        const fn = tasks[i];
        yield fn(iterateeCallback);
      }
      resolve(result);
    }

    function iterateeCallback(err, value) {
      if (err) {
        generator.return(err);
        rejcet(err);
      } else {
        result[i] = value;
        generator.next();
      }
    }
  });
}

module.exports = {
  series,
};
