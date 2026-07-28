//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { useLogger } from '@/composables/useLogger'

export const WsReadyStateEnum = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
}

const ChannelEnum = {
  STD_IN: 0,
  STD_OUT: 1,
  STD_ERR: 2,
  ERR: 3,
  RESIZE: 4,
}

const BufferEnum = {
  CHANNEL_INDEX: 0,
  DATA_INDEX: 1,
}

export class K8sAttachAddon {
  constructor (socket, options = {}) {
    const {
      logger = useLogger(),
      bidirectional = false,
      pingIntervalSeconds = 30,
    } = options
    this._socket = socket
    this._logger = logger
    // always set binary type to arraybuffer, we do not handle blobs
    this._socket.binaryType = 'arraybuffer'
    this._bidirectional = bidirectional
    this._disposables = []
    this._pingIntervalSeconds = pingIntervalSeconds
    this._resizeIntervalId = undefined
    this._resizeCounter = 0
  }

  _forceResize (terminal) {
    const { cols, rows } = terminal
    if (!cols || !rows) {
      return
    }
    this._resizeCounter += 1
    this._sendResize({ cols, rows: rows - 1 })
    this._sendResize({ cols, rows })
    if (this._resizeCounter >= 5) {
      this._clearForceResize()
    }
  }

  _clearForceResize () {
    this._resizeCounter = 0
    clearInterval(this._resizeIntervalId)
    this._resizeIntervalId = undefined
  }

  activate (terminal) {
    this._disposables.push(
      addSocketListener(this._socket, 'message', ev => {
        this._messageHandler(terminal, ev)
      }),
    )

    if (this._bidirectional) {
      this._disposables.push(terminal.onData(data => this._sendData(ChannelEnum.STD_IN, data)))
    }

    this._disposables.push(addSocketListener(this._socket, 'close', () => this.dispose()))
    this._disposables.push(addSocketListener(this._socket, 'error', () => this.dispose()))
    this._disposables.push(addSocketListener(this._socket, 'open', () => {
      // force resize until stdout arrives or attempts are exhausted
      this._resizeCounter = 0
      this._resizeIntervalId = setInterval(() => {
        this._forceResize(terminal)
      }, 200)
      this._forceResize(terminal)
    }))

    terminal.onResize(size => {
      this._sendResize(size)
      terminal.scrollToBottom()
    })

    this.pingIntervalId = setInterval(() => {
      if (this._socket.readyState === WsReadyStateEnum.CONNECTING || this._socket.readyState === WsReadyStateEnum.CLOSED) {
        this._logger.info('Websocket closing or already closed. Stopping ping')
        clearInterval(this.pingIntervalId)
        return
      }
      this._sendData(ChannelEnum.STD_IN, '') // send empty message to prevent socket connection from getting closed
    }, this._pingIntervalSeconds * 1000)
    this._disposables.push({ dispose: () => clearInterval(this.pingIntervalId) })
  }

  dispose () {
    this._clearForceResize()
    this._disposables.forEach(d => d.dispose())
  }

  _messageHandler (terminal, ev) {
    if (!(typeof ev.data === 'object' && ev.data instanceof ArrayBuffer)) {
      this._logger.error(`Cannot handle "${typeof ev.data}" websocket message.`)
      return
    }

    const buffer = new Uint8Array(ev.data)
    if (buffer.length <= 1) {
      return
    }

    const channel = buffer[BufferEnum.CHANNEL_INDEX]
    const data = buffer.slice(BufferEnum.DATA_INDEX)
    switch (channel) {
      case ChannelEnum.STD_OUT:
      case ChannelEnum.STD_ERR:
        this._clearForceResize()
        terminal.write(data)
        break
      case ChannelEnum.ERR:
        try {
          const decoder = new TextDecoder()
          const err = JSON.parse(decoder.decode(data)) || {}
          if (err.status === 'Success') {
            return // just ignore success message
          }
          this._logger.error('On error channel:', err)
        } catch {
          this._logger.error('On error channel:', data)
        }
        break
      default:
        this._logger.error('Unsupported websocket channel:', channel)
    }
  }

  _sendResize ({ cols: Width, rows: Height }) {
    this._sendData(ChannelEnum.RESIZE, JSON.stringify({ Width, Height }))
  }

  _sendData (channel, data) {
    if (this._socket.readyState !== WsReadyStateEnum.OPEN) {
      return
    }
    const encoder = new TextEncoder()
    this._socket.send(new Uint8Array([
      channel,
      ...encoder.encode(data),
    ]))
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
    },
  }
}
