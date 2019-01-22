export const ReadyStateEnum = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
}

export function attach (term, socket, pingIntervalSeconds = 30, bidirectional, buffered) {
  bidirectional = typeof bidirectional === 'undefined' ? true : bidirectional
  term.__socket = socket

  term.__flushBuffer = () => {
    term.write(term.__attachSocketBuffer)
    term.__attachSocketBuffer = null
  }

  term.__pushToBuffer = (data) => {
    if (term.__attachSocketBuffer) {
      term.__attachSocketBuffer += data
    } else {
      term.__attachSocketBuffer = data
      setTimeout(term.__flushBuffer, 10)
    }
  }

  let decoder

  term.__getMessage = function (ev) {
    if (!decoder) {
      decoder = new TextDecoder()
    }
    if (typeof ev.data === 'object' && ev.data instanceof ArrayBuffer) {
      const buffer = Buffer.from(ev.data)
      if (buffer.length > 1) {
        const channel = buffer[0]
        const data = decoder.decode(buffer.slice(1))
        switch (channel) {
          case 1:
          case 2:
            displayData(data)
            break
          case 3:
            window['console']['error'](JSON.parse(data))
            break
          default:
            throw Error('Unsupported message!')
        }
      }
    } else {
      throw Error(`Cannot handle "${typeof ev.data}" websocket message.`)
    }
  }

  function displayData (str, data) {
    if (buffered) {
      term.__pushToBuffer(str || data)
    } else {
      term.write(str || data)
    }
  }

  function sendData (channel, data) {
    if (socket.readyState !== 1) {
      return
    }
    const length = Buffer.byteLength(data)
    const buffer = Buffer.alloc(length + 1)
    buffer.writeUInt8(channel, 0)
    buffer.write(data, 1, 'binary')
    socket.send(buffer)
  }

  term.__sendResize = ({ cols: Width, rows: Height }) => {
    sendData(4, JSON.stringify({ Width, Height }))
  }

  term.__sendData = data => {
    sendData(0, data)
  }

  term.__resizeHandler = size => {
    term.__sendResize(size)
    term.scrollToBottom()
  }

  term._core.register(addSocketListener(socket, 'message', term.__getMessage))

  if (bidirectional) {
    term._core.register(term.addDisposableListener('data', term.__sendData))
  }

  term._core.register(addSocketListener(socket, 'close', () => detach(term, socket)))
  term._core.register(addSocketListener(socket, 'error', () => detach(term, socket)))

  term.fit()
  // force resize
  term.__sendResize({ cols: 1, rows: 1 })
  term.__sendResize({ cols: term.cols, rows: term.rows })

  term.on('resize', term.__resizeHandler)

  term.pingIntervalId = setInterval(function ping () {
    if (socket.readyState === ReadyStateEnum.CONNECTING || socket.readyState === ReadyStateEnum.CLOSED) {
      console.log('Websocket closing or already closed. Stopping ping')
      clearTimeout(term.pingIntervalId)
      return
    }
    term.__sendData('') // send empty message to prevent socket connection from getting closed
  }, pingIntervalSeconds * 1000)
}

function addSocketListener (socket, type, handler) {
  socket.addEventListener(type, handler)
  return {
    dispose () {
      if (handler) {
        socket.removeEventListener(type, handler)
        handler = null
      }
    }
  }
}

export function detach (term, socket) {
  clearTimeout(term.pingIntervalId)
  term.off('data', term.__sendData)
  term.off('resize', term.__resizeHandler)
  socket = typeof socket === 'undefined' ? term.__socket : socket
  delete term.__socket
}

export function apply (terminalConstructor) {
  terminalConstructor.prototype.attach = function (socket, pingIntervalSeconds, bidirectional, buffered) {
    attach(this, socket, pingIntervalSeconds, bidirectional, buffered)
  }

  terminalConstructor.prototype.detach = function (socket) {
    detach(this, socket)
  }
}
