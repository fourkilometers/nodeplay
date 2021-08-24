const Buffer = require("buffer").Buffer;

function getHttpParser() {
  let httpMessage = {
    header: {},
  };
  let currentLine = 0;
  let bodyStart = false;
  let body = null;
  let end = false;
  let currentTcpPacketNum = -1;
  return function parse(chunk) {
    currentTcpPacketNum++;
    let lineStart = 0,
      lineEnd = 0;
    while (lineEnd < chunk.length) {
      if (
        lineEnd - lineStart > 0 &&
        chunk[lineEnd] === 0x0a &&
        chunk[lineEnd - 1] === 0x0d
      ) {
        //按行读取
        const length = lineEnd - lineStart + 1;
        let lineBuf = Buffer.alloc(length);

        chunk.copy(lineBuf, 0, lineStart, lineEnd + 1);

        lineBuf = removeCRLF(lineBuf); //去掉换行符
        if (currentLine === 0) {
          parseStarttLine(lineBuf);
        } else if (lineBuf.length === 0) {
          //空白行代表结束或者http报文的body开始
          const method = httpMessage.method.toLowerCase();
          if ((method === "post" || method === "put") && bodyStart === false) {
            //只有POST和PUT方法可能有body，其它http方法均不带body
            bodyStart = true;
          } else {
            end = true;
            break;
          }
        } else if (!bodyStart) {
          parseHeaders(lineBuf);
        }
        lineStart = lineEnd + 1;
        currentLine++;
      } else if (bodyStart) {
        let bodyLength;
        if (currentTcpPacketNum > 0) {
          //如果当前请求分包传输且不是第一个包
          bodyLength = chunk.length;
          lineStart = 0;
        } else {
          bodyLength = chunk.length - lineStart;
        }
        const lastLineBuf = Buffer.alloc(bodyLength);
        chunk.copy(lastLineBuf, 0, lineStart, chunk.length);

        body = body ? Buffer.concat([body, lastLineBuf]) : lastLineBuf;
        //post和put请求需要携带content-length信息，没有将无法判断报文在哪里结束
        const contentLength = parseInt(httpMessage.header["content-length"]);

        if (contentLength && body.length === contentLength) {
          end = true;
        }
        httpMessage.body = body;
        break;
      }
      lineEnd++;
    }

    return end ? httpMessage : null;
  };

  function parseStarttLine(chunk) {
    const requestLine = chunk.toString("utf-8");
    const arr = requestLine.split(" ");
    httpMessage.method = arr[0];
    httpMessage.url = arr[1];
    httpMessage.version = arr[2];
  }

  function parseHeaders(chunk) {
    const headerLine = chunk.toString("utf-8");
    const arr = headerLine.split(": ");
    const key = arr[0].toLowerCase();
    httpMessage.header[key] = arr[1];
  }
}

function removeCRLF(buf) {
  const length = buf.length;
  const newBuf = Buffer.alloc(length - 2);
  buf.copy(newBuf, 0, 0, length - 2);
  return newBuf;
}

module.exports = getHttpParser;
