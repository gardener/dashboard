<!--
Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
  <v-layout v-resize="onResize" column fill-height class="position-relative dark">
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
    <v-system-bar dark class="systemBar">
      <v-tooltip :disabled="!detailedConnectionStateText" top class="ml-2" style="min-width: 110px">
        <v-layout align-center justify-start row fill-height slot="activator">
          <icon-base width="18" height="18" viewBox="-2 -2 30 30" iconColor="#bdbdbd" class="mr-2">
            <connected v-if="terminalSession.connectionState === ConnectionState.CONNECTED"></connected>
            <disconnected v-else></disconnected>
          </icon-base>
          <span class="text-none grey--text text--lighten-1" style="font-size: 13px">{{connectionText}}</span>
        </v-layout>
        {{detailedConnectionStateText}}
      </v-tooltip>

      <v-tooltip v-if="imageShortText" top>
        <v-btn small flat slot="activator" @click="configure('imageBtn')" :loading="loading.imageBtn" class="text-none grey--text text--lighten-1 systemBarButton">
          <v-icon class="mr-2">mdi-layers-triple-outline</v-icon>
          <span>{{imageShortText}}</span>
        </v-btn>
        Image: {{terminalSession.image}}
      </v-tooltip>

      <v-tooltip v-if="privilegedMode !== undefined" top>
        <v-btn small flat slot="activator" @click="configure('secContextBtn')" :loading="loading.secContextBtn" class="text-none grey--text text--lighten-1 systemBarButton">
          <v-icon class="mr-2">mdi-shield-account</v-icon>
          <span>{{privilegedModeText}}</span>
        </v-btn>
        <strong>Privileged:</strong> {{terminalSession.privileged}}<br/>
        <strong>Host PID:</strong> {{terminalSession.hostPID}}<br/>
        <strong>Host Network:</strong> {{terminalSession.hostNetwork}}
      </v-tooltip>

      <v-tooltip v-if="terminalSession.node" top>
        <v-btn small flat slot="activator" @click="configure('nodeBtn')" :loading="loading.nodeBtn" class="text-none grey--text text--lighten-1 systemBarButton">
          <v-icon :size="14" class="mr-2">mdi-server</v-icon>
          <span>{{terminalSession.node}}</span>
        </v-btn>
        Node: {{terminalSession.node}}
      </v-tooltip>

      <v-spacer></v-spacer>

      <v-tooltip top>
        <v-btn small flat slot="activator" @click="configure('settingsBtn')" :loading="loading.settingsBtn" class="text-none grey--text text--lighten-1 systemBarButton">
          <v-icon>mdi-settings</v-icon>
        </v-btn>
        Settings
      </v-tooltip>

      <v-divider vertical></v-divider>

      <v-btn small flat class="text-none grey--text text--lighten-1 systemBarButton" @click="deleteTerminal">
        <v-icon class="mr-2">mdi-exit-to-app</v-icon>
        Exit
      </v-btn>
    </v-system-bar>
    <terminal-settings-dialog
      ref="settings"
      :image="defaultImage"
      :node="defaultNode"
      :privilegedMode="defaultPrivilegedMode"
      :nodes="config.nodes"
    ></terminal-settings-dialog>
    <confirm-dialog ref="confirmDialog"></confirm-dialog>
  </v-layout>
</template>

<script>
import 'xterm/dist/xterm.css'
import ora from 'ora'
import get from 'lodash/get'
import find from 'lodash/find'
import assign from 'lodash/assign'
import head from 'lodash/head'
import intersection from 'lodash/intersection'
import keys from 'lodash/keys'

import * as attach from '@/lib/attach'
import * as fit from 'xterm/lib/addons/fit/fit'
import * as search from 'xterm/lib/addons/search/search'
import * as webLinks from 'xterm/lib/addons/webLinks/webLinks'

import { mapState } from 'vuex'
import { Terminal } from 'xterm'
import { encodeURIComponents } from '@/utils'
import {
  createTerminal,
  deleteTerminal,
  heartbeat,
  terminalConfig
} from '@/utils/api'
import ConfirmDialog from '@/dialogs/ConfirmDialog'
import TerminalSettingsDialog from '@/dialogs/TerminalSettingsDialog'
import IconBase from '@/components/icons/IconBase'
import Connected from '@/components/icons/Connected'
import Disconnected from '@/components/icons/Disconnected'

Terminal.applyAddon(attach)
Terminal.applyAddon(fit)
Terminal.applyAddon(search)
Terminal.applyAddon(webLinks)

const ConnectionState = {
  DISCONNECTED: 0,
  PREPARING: 1,
  CONNECTING: 2,
  CONNECTED: 3
}

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

function remoteCommandAttachOrExecuteProtocols ({ token }) {
  const protocols = ['v4.channel.k8s.io']
  addBearerToken(protocols, token)

  return protocols
}

function watchPodProtocols ({ token }) {
  const protocols = ['garden'] // there must be at least one other subprotocol in addition to the bearer token
  addBearerToken(protocols, token)

  return protocols
}

function addBearerToken (protocols, bearer) {
  protocols.unshift(`base64url.bearer.authorization.k8s.io.${encodeBase64Url(bearer)}`)
  return protocols
}

function attachUri (terminalData) {
  const { namespace, container, server, pod } = encodeURIComponents(terminalData)
  return `wss://${server}/api/v1/namespaces/${namespace}/pods/${pod}/attach?container=${container}&stdin=true&stdout=true&tty=true`
}

function watchPodUri (terminalData) {
  const { namespace, server, pod } = encodeURIComponents(terminalData)
  return `wss://${server}/api/v1/namespaces/${namespace}/pods?fieldSelector=metadata.name%3D${pod}&watch=true`
}

function closeWsIfNotClosed (ws) {
  if (ws.readyState === attach.ReadyStateEnum.OPEN || ws.readyState === attach.ReadyStateEnum.CONNECTING) {
    ws.close()
  }
}

function getDetailedConnectionStateText (terminalContainerStatus) {
  const stateType = head(intersection(keys(get(terminalContainerStatus, 'state'), ['waiting', 'running', 'terminated'])))

  let text = ''
  if (!stateType) {
    return text
  }

  text = `Container is ${stateType}`

  const reason = get(terminalContainerStatus, ['state', stateType, 'reason'])
  if (!reason) {
    return text
  }

  return `${text}: ${reason}`
}

export default {
  name: 'shoot-item-terminal',
  components: {
    ConfirmDialog,
    TerminalSettingsDialog,
    IconBase,
    Connected,
    Disconnected
  },
  data () {
    return {
      snackbarTop: false,
      errorSnackbarBottom: false,
      snackbarText: '',
      spinner: undefined,
      loading: {
        imageBtn: false,
        secContextBtn: false,
        nodeBtn: false,
        settingsBtn: false
      },
      config: {
        image: undefined,
        nodes: []
      },
      selectedConfig: {},
      terminalSession: {},
      ConnectionState,
      detailedConnectionStateText: undefined
    }
  },
  computed: {
    ...mapState([
      'cfg'
    ]),
    defaultImage () {
      return this.terminalSession.image || this.config.image
    },
    defaultNode () {
      return this.terminalSession.node || get(head(this.config.nodes), 'data.kubernetesHostname')
    },
    defaultPrivilegedMode () {
      return this.privilegedMode || false
    },
    privilegedMode () {
      return this.terminalSession.privileged || this.terminalSession.hostPID || this.terminalSession.hostNetwork
    },
    connectionText () {
      switch (this.terminalSession.connectionState) {
        case ConnectionState.DISCONNECTED:
          return 'Disconnected'
        case ConnectionState.PREPARING:
          return 'Preparing'
        case ConnectionState.CONNECTING:
          return 'Connecting'
        case ConnectionState.CONNECTED:
          return 'Connected'
        default:
          return 'UNKNOWN'
      }
    },
    heartbeatIntervalSeconds () {
      return get(this.cfg, 'terminal.heartbeatIntervalSeconds', 60)
    },
    name () {
      const { name = undefined } = this.$route.params
      return name
    },
    privilegedModeText () {
      return this.privilegedMode ? 'Privileged' : 'Unprivileged'
    },
    imageShortText () {
      const image = this.terminalSession.image || ''
      return image.substring(image.lastIndexOf('/') + 1)
    },
    namespace () {
      const { namespace } = this.$route.params
      return namespace
    }
  },
  methods: {
    async deleteTerminal () {
      if (!await this.confirmDelete()) {
        return
      }
      const { namespace = undefined, name = undefined, target } = this.$route.params
      await deleteTerminal({ name, namespace, target })
      if (this.name) {
        return this.$router.push({ name: 'ShootItem', params: { namespace: this.namespace, name: this.name } })
      }
      return this.$router.push({ name: 'ShootList', params: { namespace: this.namespace } })
    },
    confirmDelete () {
      return this.$refs.confirmDialog.waitForConfirmation({
        confirmButtonText: 'Exit',
        captionText: 'Confirm Exit',
        messageHtml: 'Do you want to exit this terminal session? This will clean up all related resources.<br/><br/><i class="grey--text text--darken-2">Terminal sessions are automatically cleaned up if you navigate away or close the browser window.</i>'
      })
    },
    async configure (refName) {
      this.loading[refName] = true
      const { namespace = undefined, name = undefined, target } = this.$route.params
      try {
        const { data: config } = await terminalConfig({ name, namespace, target })

        assign(this.config, config)
      } catch (error) {
        this.errorMessage = error.message
      } finally {
        this.loading[refName] = false
      }

      const selectedConfig = await this.$refs.settings.confirmWithDialog()
      if (selectedConfig) {
        this.cancelConnectAndClose()

        this.selectedConfig = selectedConfig
        this.retry()
      }
    },
    onResize () {
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
      const { namespace = undefined, name = undefined, target } = this.$route.params
      const body = this.selectedConfig
      const { data } = await createTerminal({ name, namespace, target, body })

      return data
    },
    async heartbeat () {
      const { namespace = undefined, name = undefined, target } = this.$route.params
      return heartbeat({ name, namespace, target })
    },
    async retry () {
      this.snackbarTop = false
      return this.connect()
    },
    cancelConnectAndClose () {
      this.terminalSession.cancelConnect = true
      this.terminalSession.close()
    },
    async connect () {
      const terminalSession = this.terminalSession = {
        cancelConnect: false,
        close: () => {},
        connectionState: ConnectionState.DISCONNECTED,
        tries: 0,
        node: undefined,
        privileged: undefined,
        hostPID: undefined,
        hostNetwork: undefined,
        image: undefined
      }

      this.spinner.start()
      this.spinner.text = 'Preparing terminal session'
      terminalSession.connectionState = ConnectionState.PREPARING

      try {
        const terminalData = await this.createTerminal()

        const RETRY_TIMEOUT_SECONDS = 3
        const MAX_TRIES = 60 / RETRY_TIMEOUT_SECONDS

        const attachTerminal = async () => {
          if (terminalSession.cancelConnect) {
            return
          }

          terminalSession.tries++

          try {
            terminalSession.connectionState = ConnectionState.CONNECTING
            await this.waitUntilPodIsRunning(terminalData, 60)
          } catch (err) {
            console.error('failed to wait until pod is running', err)
            this.showSnackbarTop('Could not connect to terminal')
            terminalSession.connectionState = ConnectionState.DISCONNECTED
            return
          }
          if (terminalSession.cancelConnect) {
            return
          }

          const ws = new WebSocket(attachUri(terminalData), remoteCommandAttachOrExecuteProtocols(terminalData))
          ws.binaryType = 'arraybuffer'
          let reconnectTimeoutId
          let heartbeatIntervalId

          ws.onopen = async () => {
            if (terminalSession.cancelConnect) {
              terminalSession.close()
              return
            }
            this.term.attach(ws)

            this.spinner.stop()
            this.hideSnackbar()
            terminalSession.connectionState = ConnectionState.CONNECTED
            terminalSession.tries = 0

            heartbeatIntervalId = setInterval(async () => {
              try {
                await this.heartbeat()
              } catch (err) {
                console.error('heartbeat failed:', err)
              }
            }, this.heartbeatIntervalSeconds * 1000)
          }
          ws.onclose = error => {
            terminalSession.close()
            const wasConnected = terminalSession.connectionState === ConnectionState.CONNECTED
            terminalSession.connectionState = ConnectionState.DISCONNECTED

            if (terminalSession.cancelConnect) {
              return
            }

            if (error.code === 1000) { // CLOSE_NORMAL
              terminalSession.image = undefined
              terminalSession.privileged = undefined
              terminalSession.hostPID = undefined
              terminalSession.hostNetwork = undefined
              terminalSession.node = undefined
              this.showSnackbarTop('Terminal connection lost')
              return
            }
            if (terminalSession.tries >= MAX_TRIES) {
              this.showSnackbarTop('Could not connect to terminal')
              return
            }

            terminalSession.connectionState = ConnectionState.CONNECTING

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
            reconnectTimeoutId = setTimeout(async () => attachTerminal(), timeoutSeconds * 1000)
          }

          terminalSession.close = () => {
            clearTimeout(reconnectTimeoutId)
            clearInterval(heartbeatIntervalId)

            closeWsIfNotClosed(ws)
            this.term.detach(ws)

            terminalSession.close = () => {}
          }
        }
        return attachTerminal()
      } catch (err) {
        this.showErrorSnackbarBottom(get(err, 'response.data.message', err.message))
        terminalSession.connectionState = ConnectionState.DISCONNECTED
      }
    },
    async waitUntilPodIsRunning (terminalData, timeoutSeconds) {
      return new Promise((resolve, reject) => {
        const ws = new WebSocket(watchPodUri(terminalData), watchPodProtocols(terminalData))
        const isRunningTimeoutId = setTimeout(() => closeAndReject(ws, new Error(`Timed out after ${timeoutSeconds}s`)), timeoutSeconds * 1000)

        ws.addEventListener('message', ({ data: message }) => {
          let event
          try {
            event = JSON.parse(message)
          } catch (error) {
            console.error('could not parse message')
            return
          }
          const pod = event.object

          const containers = get(pod, 'spec.containers')
          const terminalContainer = find(containers, container => container.name === terminalData.container)
          this.terminalSession.image = get(terminalContainer, 'image')
          this.terminalSession.privileged = get(terminalContainer, 'securityContext.privileged', false)
          this.terminalSession.hostPID = get(pod, 'spec.hostPID', false)
          this.terminalSession.hostNetwork = get(pod, 'spec.hostNetwork', false)
          this.terminalSession.node = get(pod, 'spec.nodeName')

          const phase = get(pod, 'status.phase')
          switch (phase) {
            case 'Failed':
            case 'Terminating':
            case 'Completed':
              closeWsIfNotClosed(ws, new Error(`Pod is in phase ${phase}`))
              return
          }
          if (event.type === 'DELETED') {
            closeWsIfNotClosed(ws, new Error('pod deleted'))
            return
          }

          const containerStatuses = get(pod, 'status.containerStatuses')
          const terminalContainerStatus = find(containerStatuses, status => status.name === terminalData.container)
          const isContainerReady = get(terminalContainerStatus, 'ready', false)

          this.detailedConnectionStateText = getDetailedConnectionStateText(terminalContainerStatus)
          this.spinner.text = `Connecting to Pod. Current phase is "${phase}".`
          if (phase === 'Running' && isContainerReady) {
            closeAndResolve(ws)
          }
        })
        ws.onclose = error => {
          closeAndReject(ws, error)
        }

        const closeAndReject = (ws, error) => {
          clearTimeout(isRunningTimeoutId)
          closeWsIfNotClosed(ws)

          reject(error)
        }
        const closeAndResolve = (ws) => {
          clearTimeout(isRunningTimeoutId)
          closeWsIfNotClosed(ws)

          resolve()
        }
      })
    }
  },
  async mounted () {
    const term = this.term = new Terminal()
    term.open(this.$refs.container)
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
      spinner: 'dots'
    })

    this.connect()
  },
  beforeDestroy () {
    this.cancelConnectAndClose()
  }
}
</script>

<style lang="styl" scoped>
  .dark {
    background: black;
  }
  .position-relative
    position: relative !important
  .terminal-container {
      height: 100%;
      width: 100%;
      margin: 0;
      padding-left: 4px;
      padding-top: 4px;
  }
  .terminal {
    font-family: "DejaVu Sans Mono", "Everson Mono", FreeMono, Menlo, Terminal, monospace, "Apple Symbols";
    height: 100%;
    width: 100%;
  }
  .systemBar {
    background-color: #212121;
    min-height: 25px;
  }
  .systemBarButton {
    min-width: 20px;
    max-height: 25px;
  }
</style>
