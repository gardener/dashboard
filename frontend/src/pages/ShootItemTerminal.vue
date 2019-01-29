<!--
Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 -->

<template>
  <v-layout ref="layout" v-resize="onResize" column fill-height class="position-relative">
    <v-snackbar
      v-model="snackbarTop"
      :timeout="0"
      :absolute="true"
      :auto-height="true"
      :top="true"
    >
      {{ snackbarText }}
      <v-btn flat color="cyan darken-2" @click="retry()">
        Retry
      </v-btn>
      <v-btn flat color="cyan darken-2" @click="hideSnackbar()">
        Close
      </v-btn>
    </v-snackbar>
    <v-snackbar
      v-model="errorSnackbarBottom"
      :timeout="0"
      :absolute="true"
      :auto-height="true"
      :bottom="true"
      color="red"
    >
      {{ snackbarText }}
      <v-btn flat @click="hideSnackbar()">
        Close
      </v-btn>
    </v-snackbar>
    <v-flex ref="container" class="terminal-container"></v-flex>
  </v-layout>
</template>

<script>
import 'xterm/dist/xterm.css'

import { mapState } from 'vuex'
import { Terminal } from 'xterm'
import { createTerminal, heartbeat } from '@/utils/api'
import { encodeURIComponents } from '@/utils'
import get from 'lodash/get'
import ora from 'ora'
import * as attach from '@/lib/attach'
import * as fit from 'xterm/dist/addons/fit/fit'
import * as search from 'xterm/dist/addons/search/search'
import * as webLinks from 'xterm/dist/addons/webLinks/webLinks'
import * as winptyCompat from 'xterm/dist/addons/winptyCompat/winptyCompat'

Terminal.applyAddon(attach)
Terminal.applyAddon(fit)
Terminal.applyAddon(search)
Terminal.applyAddon(webLinks)
Terminal.applyAddon(winptyCompat)

function encodeBase64 (input) {
  return Buffer.from(input, 'utf8').toString('base64')
}

function encodeBase64Url (input) {
  let output = encodeBase64(input)
  output = output.replace(/=/g, '')
  output = output.replace(/\+/g, '-')
  output = output.replace(/\//g, '_')
  return output
}

function protocols ({ token: bearer }) {
  const protocols = ['v4.channel.k8s.io']
  protocols.unshift(`base64url.bearer.authorization.k8s.io.${encodeBase64Url(bearer)}`)

  return protocols
}

function uri (terminalData) {
  const { namespace, container, server, pod } = encodeURIComponents(terminalData)
  return `wss://${server}/api/v1/namespaces/${namespace}/pods/${pod}/attach?container=${container}&stdin=true&stdout=true&tty=true`
}

export default {
  name: 'shoot-item-terminal',
  data () {
    return {
      close: () => {},
      snackbarTop: false,
      errorSnackbarBottom: false,
      snackbarText: '',
      spinner: undefined
    }
  },
  computed: {
    ...mapState([
      'cfg'
    ]),
    pingIntervalSeconds () {
      return get(this.cfg, 'terminal.pingIntervalSeconds')
    }
  },
  methods: {
    onResize (size) {
      if (this.term) {
        this.term.fit()
      }
    },
    hideSnackbar () {
      this.snackbarTop = false
      this.errorSnackbarBottom = false
    },
    showSnackbarTop (text) {
      this.snackbarTop = true
      this.setSnackbarTextAndStopSpinner(text)
    },
    showErrorSnackbarBottom (text) {
      this.errorSnackbarBottom = true
      this.setSnackbarTextAndStopSpinner(text)
    },
    setSnackbarTextAndStopSpinner (text) {
      if (this.spinner) {
        this.spinner.stop()
      }
      this.snackbarText = text
    },
    async createTerminal () {
      const user = this.$store.state.user
      const { namespace, name, target } = this.$route.params
      const { data } = await createTerminal({ name, namespace, target, user })

      return data
    },
    async heartbeat () {
      const user = this.$store.state.user
      const { namespace, name, target } = this.$route.params
      return heartbeat({ name, namespace, user, target })
    },
    async retry () {
      this.snackbarTop = false
      return this.connect()
    },
    async connect () {
      this.spinner.start()

      try {
        const terminalData = await this.createTerminal()

        let connected = false
        let tries = 0
        const RETRY_TIMEOUT_SECONDS = 3
        const MAX_TRIES = 60 / RETRY_TIMEOUT_SECONDS

        const attachTerminal = () => {
          tries++
          const ws = new WebSocket(uri(terminalData), protocols(terminalData))
          ws.binaryType = 'arraybuffer'
          let reconnectTimeoutId
          let heartbeatIntervalId

          ws.onopen = async () => {
            this.term.attach(ws)

            this.spinner.stop()
            this.hideSnackbar()
            connected = true
            tries = 0

            heartbeatIntervalId = setInterval(async () => {
              try {
                await this.heartbeat()
              } catch (err) {
                console.error('heartbeat failed:', err)
              }
            }, 60 * 1000)
          }
          ws.onclose = error => {
            this.close()
            const wasConnected = connected
            connected = false

            if (error.code === 1000) { // CLOSE_NORMAL
              this.showSnackbarTop('Terminal connection lost')
              return
            }
            if (tries >= MAX_TRIES) {
              this.showSnackbarTop('Could not connect to terminal')
              return
            }

            let timeoutSeconds
            if (wasConnected) {
              timeoutSeconds = 0
              // do not start spinner as this would clear the console
              console.log(`Websocket connection lost (code ${error.code}). Trying to reconnect..`)
            } else { // Try again later
              timeoutSeconds = RETRY_TIMEOUT_SECONDS
              this.spinner.start()
              console.log(`Pod not yet ready. Reconnecting in ${timeoutSeconds} seconds..`)
            }
            reconnectTimeoutId = setTimeout(() => attachTerminal(), timeoutSeconds * 1000)
          }

          this.close = () => {
            clearTimeout(reconnectTimeoutId)
            clearInterval(heartbeatIntervalId)

            if (ws.readyState === attach.ReadyStateEnum.OPEN || ws.readyState === attach.ReadyStateEnum.CONNCTING) {
              ws.close()
            }
            this.term.detach(ws)
          }
        }
        attachTerminal()
      } catch (err) {
        this.showErrorSnackbarBottom(get(err, 'response.data.message', err.message))
      }
    }
  },
  async mounted () {
    const term = this.term = new Terminal()
    term.open(this.$refs.container)
    term.winptyCompatInit()
    term.webLinksInit()
    term.focus()
    this.$nextTick(() => {
      term.fit()
    })

    this.spinner = ora({
      stream: {
        write: chunk => this.term.write(chunk.toString()),
        isTTY: () => true,
        clearLine: () => this.term.write('\x1bc'), // TODO reset line only
        cursorTo: to => {}
      },
      text: 'Connecting',
      spinner: 'dots'
    })

    this.connect()
  },
  beforeDestroy () {
    this.close()
  }
}
</script>

<style lang="styl" scoped>
  .position-relative
    position: relative !important
  .terminal-container {
      background: #212121;
      height: 100%;
      width: 100%;
      margin: 0;
  }
  .terminal {
    font-family: "DejaVu Sans Mono", "Everson Mono", FreeMono, Menlo, Terminal, monospace, "Apple Symbols";
    height: 100%;
    width: 100%;
  }
</style>
