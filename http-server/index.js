const net = require("net");
const Stream = require("stream");
const getHttpParser = require("./http-request-parser");
const { generateResponse } = require("./http-response-generator");

function createHttpServer(requestListener) {
  const server = net.createServer((connection) => {
    console.log("client connected");
    connection.on("end", () => {
      console.log("client disconnected");
    });

    const httpRequest = new HttpRequest(connection);
    httpRequest.once("request", function (args) {
      requestListener(args, new HttpResponse(connection));
    });
  });

  server.on("error", (err) => {
    console.error("error:", err);
  });

  return server;
}

function HttpRequest(socket) {
  this.socket = socket;
  this.socket.setTimeout(1000);
  const parse = getHttpParser();

  this.socket.on("data", (chunk) => {
    const result = parse(chunk);
    if (result) {
      this.emit("request", result);
    }
  });
}

function HttpResponse(socket) {
  this.socket = socket;
  this.headers = {};
  this.statusCode = 200;
}
HttpResponse.prototype.setHeader = function (name, value) {
  this.headers[name] = value;
};

HttpResponse.prototype.end = function (data, callback) {
  const buf = generateResponse(this, data);
  this.socket.write(buf);
  this.socket.end(callback);
  this.socket.destroy();
};

HttpRequest.prototype = new Stream.Readable();

module.exports = createHttpServer;
