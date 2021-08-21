const net = require("net");
const EventEmitter = require("events");
const Buffer = require("buffer").Buffer;

const RESP_SIMPLE_STRING = "+";
const RESP_ERRORS = "-";
const RESP_INTEGERS = ":";
const RESP_BULK_STRING = "$";
const RESP_ARRAYS = "*";

class RedisClient extends EventEmitter {
  constructor(host = "127.0.0.1", port = 6379, options = {}) {
    super();

    const { username, password } = options;
    this.commondQueue = [];
    this.socket = net.connect({
      port,
      host,
      family: 4,
      onread: {
        buffer: Buffer.alloc(4 * 1024),
      },
    });

    this.socket.on("connect", () => {
      console.log("connected!!");
      this.emit("connect");
      if (password) {
        this.sendCommand("auth", username, password);
      }
    });
    this.socket.on("close", function () {
      this.emit("end");
    });
    this.socket.on("error", (error) => {
      this.emit("error", error);
    });

    this.socket.on("data", (resBuffer) => {
      const parsed = parseReply(resBuffer);
      while (this.commondQueue.length > 0 && parsed.length > 0) {
        const item = this.commondQueue.shift();
        const res = parsed.shift();
        item.handle(res);
      }
    });
  }

  disconnect() {
    this.socket.off();
  }
  sendCommand(command, key, value, callback) {
    if (!command) {
      throw new Error("command name is required");
    }
    command = command.toUpperCase();
    let commandLine = command;
    if (key !== undefined) {
      commandLine += " " + key;
    }
    if (value !== undefined) {
      commandLine += " " + value;
    }
    this.socket.write(commandLine + "\n\r", "utf8", () => {
      this.commondQueue.push({
        command,
        key,
        value,
        handle: callback,
      });
    });
  }
  get(key, callback) {
    this.sendCommand("get", key, undefined, callback);
  }
  set(key, value, callback) {
    this.sendCommand("set", key, value, callback);
  }
}

function parseReply(replyBuffer) {
  const result = [];
  const reply = replyBuffer.toString();
  const segments = reply.split("\r\n");
  for (let i = 0; i < segments.length - 1; i++) {
    const text = segments[i];
    const firstbyte = text[0];

    switch (firstbyte) {
      case RESP_SIMPLE_STRING:
        result.push(text.substring(1));
        break;
      case RESP_ERRORS:
        result.push(text.substring(1));
        break;
      case RESP_INTEGERS:
        result.push(parseInt(text.substring(1)));
        break;
      case RESP_BULK_STRING:
        result.push(segments[++i]);
        break;
      case RESP_ARRAYS:
        var arrayLength = parseInt(text.substring(1));
        var index = 0;
        var arr = new Array(arrayLength);
        while (index < arrayLength) {
          i += 2;
          arr[index] = segments[i];
          index++;
        }
        result.push(arr);
        break;
      default:
        throw new Error("Wrong response type");
    }
  }

  return result;
}

module.exports = RedisClient;
