const { series, auto } = require("../async");
const { describe, it } = require("mocha");
const assert = require("assert").strict;

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

describe("auto", function () {
  it("basic", function (done) {
    const callOrder = [];
    auto({
      get_data: function (callback) {
        setTimeout(() => {
          callOrder.push("get_data");
          callback(null, "data");
        }, 100);
      },
      make_folder: function (callback) {
        callOrder.push("make_folder");
        callback(null, "folder");
      },
      write_file: [
        "get_data",
        "make_folder",
        function (results, callback) {
          callOrder.push("write_file");
          callback(null, "filename");
        },
      ],
      email_link: [
        "write_file",
        function (results, callback) {
          callOrder.push("email_link");
          callback(null, {
            file: results.write_file,
            email: "user@example.com",
          });
        },
      ],
    })
      .then(function (results) {
        assert.strictEqual(
          JSON.stringify(callOrder),
          JSON.stringify([
            "make_folder",
            "get_data",
            "write_file",
            "email_link",
          ])
        );
        assert.strictEqual(
          JSON.stringify(results),
          JSON.stringify({
            make_folder: "folder",
            get_data: "data",
            write_file: "filename",
            email_link: {
              file: "filename",
              email: "user@example.com",
            },
          })
        );

        done();
      })
      .catch((e) => {
        done(e);
      });
  });
});
