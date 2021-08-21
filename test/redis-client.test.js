const assert = require("assert");
const RedisClient = require("../redis-client");
const { describe, it } = require("mocha");

let client = new RedisClient("127.0.0.1", 6379, {});

client.on("error", function (error) {
  console.error(error);
});

describe("test commands", function () {
  it("should get a same string", function (done) {
    client.set("k1", "Hello", function () {});
    client.get("k1", function (res) {
      assert.strictEqual(res, "Hello");
      done();
    });
  });

  it("should get empty string when the key not exist", function (done) {
    client.get("k2", function (res) {
      assert.strictEqual(res, "");
      done();
    });
  });
});
