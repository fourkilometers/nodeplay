const { series } = require("../async");
const { describe, it } = require("mocha");
const assert = require("assert");

describe("series", () => {
  it("functions should run in given order", function (done) {
    series([
      function (callback) {
        setTimeout(() => {
          callback(null, 1);
        }, 1000);
      },
      function (callback) {
        setTimeout(() => {
          callback(null, 2);
        }, 100);
      },
    ]).then((res) => {
      assert.strictEqual(res[0], 1);
      assert.strictEqual(res[1], 2);
      done();
    });
  });

  it("should interupt when error occur", function (done) {
    const error = "this is error";
    series([
      function (callback) {
        setTimeout(() => {
          callback(error, 1);
        }, 1000);
      },
      function (callback) {
        setTimeout(() => {
          callback(null, 2);
        }, 100);
      },
    ])
      .then(() => {
        done();
      })
      .catch((e) => {
        assert.strictEqual(e, error);
        done();
      });
  });
});

// series([
//   function (callback) {
//     setTimeout(() => {
//       console.log("running task1");

//       callback("12", 1);
//     }, 1000);
//   },
//   function (callback) {
//     setTimeout(() => {
//       console.log("running task2");

//       callback(null, 2);
//     }, 500);
//   },
// ])
//   .then((res) => {
//     console.log(res);
//   })
//   .catch((err) => {
//     console.error(err);
//   });
