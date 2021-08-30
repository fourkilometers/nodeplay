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

function auto(tasks) {
  let result = {};
  const tasksLen = Object.keys(tasks).length;
  const tsort_queue = [];

  const indegrees = {}; //入度，记录每个任务依赖的前置任务
  const edges = {}; //图的边，记录task流向
  for (const key in tasks) {
    const task = tasks[key];
    if (task instanceof Array) {
      indegrees[key] = task.length - 1;
      for (let i = 0; i < task.length - 1; i++) {
        const pre = task[i];
        if (!edges[pre]) {
          edges[pre] = [];
        }
        edges[pre].push(key);
      }
    } else if (typeof task === "function") {
      tsort_queue.push(key);
    } else {
      throw new Error("Task '" + key + "' is not valid");
    }
  }

  let tsSortIndex = 0;
  const task_queue = tsort_queue.slice();
  const indegreesCount = Object.assign({}, indegrees);

  //先检测有没有闭环
  while (tsort_queue.length > 0) {
    const taskName = tsort_queue.pop();
    tsSortIndex++;
    edges[taskName] &&
      edges[taskName].forEach((t) => {
        indegreesCount[t]--;
        if (indegreesCount[t] === 0) {
          tsort_queue.push(t);
        }
      });
  }

  if (tsSortIndex !== tasksLen) {
    throw new Error("auto cannot execute tasks due to a recursive dependency");
  }

  let remainTasks = tasksLen;
  return new Promise((resolve, rejcet) => {
    task_queue.forEach((taskName) => {
      runTask(taskName, true);
    });

    function runTask(taskName, isStart) {
      const taskFn =
        typeof tasks[taskName] === "function"
          ? tasks[taskName]
          : tasks[taskName][tasks[taskName].length - 1];
      try {
        if (isStart) {
          taskFn(iterateeCallback.bind(null, taskName));
        } else {
          taskFn(result, iterateeCallback.bind(null, taskName));
        }
      } catch (error) {
        rejcet(error);
      }
    }

    function iterateeCallback(taskName, error, value) {
      result[taskName] = value;
      remainTasks--;

      if (remainTasks === 0) {
        resolve(result);
        return;
      }

      const nextTasks = edges[taskName];
      if (!nextTasks) {
        return;
      }

      nextTasks.forEach((nextTaskName) => {
        indegrees[nextTaskName]--;

        if (indegrees[nextTaskName] && indegrees[nextTaskName] > 0) {
          return;
        } else {
          runTask(nextTaskName);
        }
      });
    }
  });
}

module.exports = {
  series,
  auto,
};
