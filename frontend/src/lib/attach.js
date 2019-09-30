//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import get from 'lodash/get'

export const ReadyStateEnum = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
}

const ChannelEnum = {
  STD_IN: 0,
  STD_OUT: 1,
  STD_ERR: 2,
  ERR: 3,
  RESIZE: 4
}

const BufferEnum = {
  CHANNEL_INDEX: 0,
  DATA_INDEX: 1
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
        const channel = buffer[BufferEnum.CHANNEL_INDEX]
        const data = decoder.decode(buffer.slice(BufferEnum.DATA_INDEX))
        switch (channel) {
          case ChannelEnum.STD_OUT:
          case ChannelEnum.STD_ERR:
            displayData(data)
            break
          case ChannelEnum.ERR:
            try {
              const errorData = JSON.parse(data)
              if (get(errorData, 'status') === 'Success') {
                return // just ignore success message
              }
              console.error('On error channel:', errorData)
            } catch (err) {
              console.error('On error channel:', data)
            }
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
    if (socket.readyState !== ReadyStateEnum.OPEN) {
      return
    }
    const length = Buffer.byteLength(data)
    const buffer = Buffer.alloc(length + 1)
    buffer.writeUInt8(channel, BufferEnum.CHANNEL_INDEX)
    buffer.write(data, BufferEnum.DATA_INDEX, 'binary')
    socket.send(buffer)
  }

  term.__sendResize = ({ cols: Width, rows: Height }) => {
    sendData(ChannelEnum.RESIZE, JSON.stringify({ Width, Height }))
  }

  term.__sendData = data => {
    sendData(ChannelEnum.STD_IN, data)
  }

  term.__resizeHandler = size => {
    term.__sendResize(size)
    term.scrollToBottom()
  }

  term._core.register(addSocketListener(socket, 'message', term.__getMessage))

  if (bidirectional) {
    term._core.register(term.onData(term.__sendData))
  }

  term._core.register(addSocketListener(socket, 'close', () => detach(term, socket)))
  term._core.register(addSocketListener(socket, 'error', () => detach(term, socket)))

  term.fit()
  // force resize
  term.__sendResize({ cols: 1, rows: 1 })
  term.__sendResize({ cols: term.cols, rows: term.rows })

  term.onResize(term.__resizeHandler)

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
