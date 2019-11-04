//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License")
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

const WsReadyStateEnum = {
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

class K8sAttachAddon {
  constructor (socket, options = {}) {
    this._socket = socket
    // always set binary type to arraybuffer, we do not handle blobs
    this._socket.binaryType = 'arraybuffer'
    this._bidirectional = options.bidirectional || false
    this._disposables = []

    this._pingIntervalSeconds = options.pingIntervalSeconds || 30
  }

  activate (terminal) {
    this._disposables.push(
      addSocketListener(this._socket, 'message', ev => {
        this._messageHandler(terminal, ev)
      })
    )

    if (this._bidirectional) {
      this._disposables.push(terminal.onData(data => this._sendData(data)))
    }

    this._disposables.push(addSocketListener(this._socket, 'close', () => this.dispose()))
    this._disposables.push(addSocketListener(this._socket, 'error', () => this.dispose()))
    this._disposables.push(addSocketListener(this._socket, 'open', () => {
      // force resize
      this._sendResize({ cols: 1, rows: 1 })
      this._sendResize({ cols: terminal.cols, rows: terminal.rows })
    }))

    terminal.onResize(size => {
      this._sendResize(terminal, size)
      terminal.scrollToBottom()
    })

    this.pingIntervalId = setInterval(() => {
      if (this._socket.readyState === WsReadyStateEnum.CONNECTING || this._socket.readyState === WsReadyStateEnum.CLOSED) {
        console.log('Websocket closing or already closed. Stopping ping')
        clearTimeout(this.pingIntervalId)
        return
      }
      this._sendData('') // send empty message to prevent socket connection from getting closed
    }, this._pingIntervalSeconds * 1000)
    this._disposables.push({ dispose: () => clearTimeout(this.pingIntervalId) })
  }

  dispose () {
    this._disposables.forEach(d => d.dispose())
  }

  _messageHandler (terminal, ev) {
    if (!this.decoder) {
      this.decoder = new TextDecoder()
    }
    if (typeof ev.data === 'object' && ev.data instanceof ArrayBuffer) {
      const buffer = Buffer.from(ev.data)
      if (buffer.length > 1) {
        const channel = buffer[BufferEnum.CHANNEL_INDEX]
        const data = this.decoder.decode(buffer.slice(BufferEnum.DATA_INDEX))
        switch (channel) {
          case ChannelEnum.STD_OUT:
          case ChannelEnum.STD_ERR:
            terminal.write(data)
            break
          case ChannelEnum.ERR:
            try {
              const errorData = JSON.parse(data) || {}
              if (errorData.status === 'Success') {
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

  _sendResize ({ cols: Width, rows: Height }) {
    this._sendDataOnChannel(ChannelEnum.RESIZE, JSON.stringify({ Width, Height }))
  }

  _sendData (data) {
    this._sendDataOnChannel(ChannelEnum.STD_IN, data)
  }

  _sendDataOnChannel (channel, data) {
    if (this._socket.readyState !== WsReadyStateEnum.OPEN) {
      return
    }
    const length = Buffer.byteLength(data)
    const buffer = Buffer.alloc(length + 1)
    buffer.writeUInt8(channel, BufferEnum.CHANNEL_INDEX)
    buffer.write(data, BufferEnum.DATA_INDEX, 'binary')
    this._socket.send(buffer)
  }
}

function addSocketListener (socket, type, handler) {
  socket.addEventListener(type, handler)
  return {
    dispose: () => {
      if (!handler) {
        // Already disposed
        return
      }
      socket.removeEventListener(type, handler)
    }
  }
}

module.exports = { K8sAttachAddon, WsReadyStateEnum }
