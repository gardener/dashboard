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
      <v-menu
        v-model="connectionMenu"
        top
        offset-y
        dark
      >
        <v-tooltip slot="activator" :disabled="connectionMenu" top class="ml-2" style="min-width: 110px">
          <v-btn small flat slot="activator" class="text-none grey--text text--lighten-1 systemBarButton">
            <icon-base width="18" height="18" viewBox="-2 -2 30 30" iconColor="#bdbdbd" class="mr-2">
              <connected v-if="terminalSession.connectionState === ConnectionState.CONNECTED"></connected>
              <disconnected v-else></disconnected>
            </icon-base>
            <span class="text-none grey--text text--lighten-1" style="font-size: 13px">{{connectionStateText}}</span>
          </v-btn>
          {{terminalSession.detailedConnectionStateText || connectionStateText}}
        </v-tooltip>
        <v-list>
          <v-list-tile-action v-if="terminalSession.connectionState === ConnectionState.DISCONNECTED" >
            <v-btn small slot="activator" flat class="ml-2 mr-2 cyan--text text--darken-2" @click="retry()">
              <v-icon left>mdi-reload</v-icon>
              Reconnect
            </v-btn>
          </v-list-tile-action>
          <v-list-tile-content v-else class="ml-2 mr-2">
            {{terminalSession.detailedConnectionStateText || connectionStateText}}
          </v-list-tile-content>
        </v-list>
      </v-menu>

      <v-tooltip v-if="imageShortText" top>
        <v-btn small flat slot="activator" @click="configure('imageBtn')" :loading="loading.imageBtn" class="text-none grey--text text--lighten-1 systemBarButton">
          <v-icon class="mr-2">mdi-layers-triple-outline</v-icon>
          <span>{{imageShortText}}</span>
        </v-btn>
        Image: {{terminalSession.image}}
      </v-tooltip>

      <v-tooltip v-if="privilegedMode !== undefined && target === 'shoot'" top>
        <v-btn small flat slot="activator" @click="configure('secContextBtn')" :loading="loading.secContextBtn" class="text-none grey--text text--lighten-1 systemBarButton">
          <v-icon class="mr-2">mdi-shield-account</v-icon>
          <span>{{privilegedModeText}}</span>
        </v-btn>
        <strong>Privileged:</strong> {{terminalSession.privileged}}<br/>
        <strong>Host PID:</strong> {{terminalSession.hostPID}}<br/>
        <strong>Host Network:</strong> {{terminalSession.hostNetwork}}
      </v-tooltip>

      <v-tooltip v-if="terminalSession.node && target === 'shoot'" top>
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
      :target="target"
    ></terminal-settings-dialog>
    <confirm-dialog ref="confirmDialog"></confirm-dialog>
  </v-layout>
</template>

<script>
import 'xterm/css/xterm.css'
import ora from 'ora'
import get from 'lodash/get'
import find from 'lodash/find'
import assign from 'lodash/assign'
import head from 'lodash/head'
import intersection from 'lodash/intersection'
import keys from 'lodash/keys'
import includes from 'lodash/includes'
import pTimeout from 'p-timeout'

import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import { K8sAttachAddon, WsReadyStateEnum } from '@/lib/xterm-addon-k8s-attach'

import { mapState } from 'vuex'
import {
  encodeURIComponents,
  encodeBase64Url
} from '@/utils'
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

const ConnectionState = {
  DISCONNECTED: 0,
  PREPARING: 1,
  CONNECTING: 2,
  CONNECTED: 3
}

const WsCloseEventEnum = {
  NORMAL_CLOUSURE: 1000
}

const RETRY_TIMEOUT_SECONDS = 3
const MAX_TRIES = 60 / RETRY_TIMEOUT_SECONDS

class TerminalSession {
  constructor (vm) {
    this.vm = vm
    this.cancelConnect = false
    this.tries = 0

    this.setInitialState()
    this.close = () => {}
  }

  setInitialState () {
    this.connectionState = ConnectionState.DISCONNECTED
    this.node = undefined
    this.privileged = undefined
    this.hostPID = undefined
    this.hostNetwork = undefined
    this.image = undefined
    this.detailedConnectionStateText = undefined
  }

  setDisconnectedState () {
    this.setInitialState()
  }

  async attachTerminal (terminalData) {
    if (this.cancelConnect) {
      return
    }

    this.tries++

    try {
      this.connectionState = ConnectionState.CONNECTING
      await this.waitUntilPodIsRunning(terminalData, 60)
      if (this.cancelConnect) {
        return
      }
    } catch (err) {
      console.error('failed to wait until pod is running', err)
      this.vm.showSnackbarTop('Could not connect to terminal')
      this.setDisconnectedState()
      return
    }

    // See https://github.com/kubernetes/kubernetes/blob/master/staging/src/k8s.io/apimachinery/pkg/util/remotecommand/constants.go
    const protocols = addBearerToken(['v4.channel.k8s.io'], terminalData.token)
    const ws = new WebSocket(attachUri(terminalData), protocols)
    const attachAddon = new K8sAttachAddon(ws, { bidirectional: true })
    this.vm.term.loadAddon(attachAddon)
    let reconnectTimeoutId
    let heartbeatIntervalId

    ws.onopen = () => {
      if (this.cancelConnect) {
        this.close()
        return
      }

      this.vm.spinner.stop()
      this.vm.hideSnackbar()
      this.connectionState = ConnectionState.CONNECTED
      this.tries = 0

      heartbeatIntervalId = setInterval(async () => {
        try {
          await this.vm.heartbeat()
        } catch (err) {
          console.error('heartbeat failed:', err)
        }
      }, this.vm.heartbeatIntervalSeconds * 1000)
    }
    ws.onclose = error => {
      this.close()
      const wasConnected = this.connectionState === ConnectionState.CONNECTED

      if (this.cancelConnect) {
        this.setDisconnectedState()
        return
      }
      if (error.code === WsCloseEventEnum.NORMAL_CLOUSURE) {
        this.setDisconnectedState()
        this.vm.showSnackbarTop('Terminal connection lost')
        return
      }
      if (this.tries >= MAX_TRIES) {
        this.setDisconnectedState()
        this.vm.showSnackbarTop('Could not connect to terminal')
        return
      }

      this.connectionState = ConnectionState.CONNECTING

      let timeoutSeconds
      if (wasConnected) {
        timeoutSeconds = 0
        // do not start spinner as this would clear the console
        console.log(`Websocket connection lost (code ${error.code}). Trying to reconnect..`)
      } else { // Try again later
        timeoutSeconds = RETRY_TIMEOUT_SECONDS
        this.vm.spinner.start()
        console.log(`Pod not yet ready. Reconnecting in ${timeoutSeconds} seconds..`)
      }
      reconnectTimeoutId = setTimeout(() => this.attachTerminal, timeoutSeconds * 1000)
    }
    this.close = () => {
      clearTimeout(reconnectTimeoutId)
      clearInterval(heartbeatIntervalId)

      closeWsIfNotClosed(ws)
      attachAddon.dispose()

      this.close = () => {}
    }
  }

  async waitUntilPodIsRunning (terminalData, timeoutSeconds) {
    const containerName = terminalData.container
    const onPodStateChange = ({ type, object: pod }) => {
      const containers = get(pod, 'spec.containers')
      const terminalContainer = find(containers, ['name', containerName])
      this.image = get(terminalContainer, 'image')
      this.privileged = get(terminalContainer, 'securityContext.privileged', false)
      this.hostPID = get(pod, 'spec.hostPID', false)
      this.hostNetwork = get(pod, 'spec.hostNetwork', false)
      this.node = get(pod, 'spec.nodeName')

      const phase = get(pod, 'status.phase')
      if (includes(['Failed', 'Succeeded'], phase) || type === 'DELETED') {
        return
      }

      const containerStatuses = get(pod, 'status.containerStatuses')
      const terminalContainerStatus = find(containerStatuses, ['name', containerName])
      this.detailedConnectionStateText = getDetailedConnectionStateText(terminalContainerStatus)
      this.vm.spinner.text = `Connecting to Pod. Current phase is "${phase}".`
    }

    const protocols = ['garden'] // there must be at least one other subprotocol in addition to the bearer token
    addBearerToken(protocols, terminalData.token)
    const ws = new WebSocket(watchPodUri(terminalData), protocols)

    this.vm.spinner.text = 'Connecting to Pod.'
    try {
      await waitForPodRunning(ws, containerName, onPodStateChange, timeoutSeconds * 1000)
    } finally {
      closeWsIfNotClosed(ws)
    }
  }
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
  if (ws.readyState === WsReadyStateEnum.OPEN || ws.readyState === WsReadyStateEnum.CONNECTING) {
    ws.close()
  }
}

async function waitForPodRunning (ws, containerName, handleEvent, timeoutSeconds) {
  const connectPromise = new Promise((resolve, reject) => {
    const openHandler = () => {
      ws.removeEventListener('open', openHandler)
      ws.removeEventListener('error', errorHandler)

      resolve()
    }
    const errorHandler = error => {
      ws.removeEventListener('open', openHandler)
      ws.removeEventListener('error', errorHandler)

      reject(error)
    }

    ws.addEventListener('open', openHandler)
    ws.addEventListener('error', errorHandler)
  })

  const connectTimeoutSeconds = 5
  await pTimeout(connectPromise, connectTimeoutSeconds * 1000, `Could not connect within ${connectTimeoutSeconds} seconds`)

  const podRunningPromise = new Promise((resolve, reject) => {
    const resolveOnce = value => {
      ws.removeEventListener('message', messageHandler)
      ws.removeEventListener('close', closeHandler)

      resolve(value)
    }
    const rejectOnce = reason => {
      ws.removeEventListener('message', messageHandler)
      ws.removeEventListener('close', closeHandler)

      reject(reason)
    }

    const closeHandler = error => {
      rejectOnce(error)
    }
    const messageHandler = ({ data: message }) => {
      let event
      try {
        event = JSON.parse(message)
      } catch (error) {
        console.error('could not parse message')
        return
      }
      const pod = event.object
      if (typeof handleEvent === 'function') {
        try {
          handleEvent(event)
        } catch (error) {
          console.error('error during handleEvent', error.message)
        }
      }

      const phase = get(pod, 'status.phase')
      if (includes(['Failed', 'Succeeded'], phase)) {
        rejectOnce(new Error(`Pod is in phase ${phase}`))
        return
      } else if (event.type === 'DELETED') {
        rejectOnce(new Error('Pod deleted'))
        return
      }

      const containerStatuses = get(pod, 'status.containerStatuses')
      const terminalContainerStatus = find(containerStatuses, ['name', containerName])
      const isContainerReady = get(terminalContainerStatus, 'ready', false)

      if (phase === 'Running' && isContainerReady) {
        resolveOnce()
      }
    }
    ws.addEventListener('message', messageHandler)
    ws.addEventListener('close', closeHandler)
  })
  return pTimeout(podRunningPromise, timeoutSeconds * 1000, `Timed out after ${timeoutSeconds}s`)
}

function getDetailedConnectionStateText (terminalContainerStatus) {
  const state = get(terminalContainerStatus, 'state')
  const stateKeys = intersection(['waiting', 'running', 'terminated'], keys(state))
  const stateType = head(stateKeys)

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
      connectionMenu: false,
      config: {
        image: undefined,
        nodes: []
      },
      selectedConfig: {},
      terminalSession: {},
      ConnectionState
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
      const defaultNode = find(this.config.nodes, ['data.kubernetesHostname', this.terminalSession.node])
      return get(defaultNode, 'data.kubernetesHostname') || get(head(this.config.nodes), 'data.kubernetesHostname')
    },
    defaultPrivilegedMode () {
      return this.privilegedMode || false
    },
    privilegedMode () {
      return this.terminalSession.privileged || this.terminalSession.hostPID || this.terminalSession.hostNetwork
    },
    connectionStateText () {
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
    privilegedModeText () {
      return this.privilegedMode ? 'Privileged' : 'Unprivileged'
    },
    imageShortText () {
      const image = this.terminalSession.image || ''
      return image.substring(image.lastIndexOf('/') + 1)
    },
    name () {
      // name is undefined in case of garden terminal
      return this.$route.params.name
    },
    namespace () {
      return this.$route.params.namespace
    },
    target () {
      return this.$route.params.target
    }
  },
  methods: {
    async deleteTerminal () {
      if (!await this.confirmDelete()) {
        return
      }
      const { namespace, name, target } = this.$route.params
      const body = this.selectedConfig
      await deleteTerminal({ name, namespace, target, body })
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
      const { namespace, name, target } = this.$route.params
      try {
        const { data: config } = await terminalConfig({ name, namespace, target })

        assign(this.config, config)
      } catch (error) {
        this.errorMessage = error.message
      } finally {
        this.loading[refName] = false
      }

      const initialState = {
        image: this.defaultImage,
        defaultNode: this.defaultNode,
        currentNode: this.terminalSession.node,
        privilegedMode: this.defaultPrivilegedMode,
        nodes: this.config.nodes
      }
      const selectedConfig = await this.$refs.settings.promptForConfigurationChange(initialState)
      if (selectedConfig) {
        this.cancelConnectAndClose()

        this.selectedConfig = selectedConfig
        this.retry()
      }
    },
    onResize () {
      if (this.fitAddon) {
        this.fitAddon.fit()
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
    heartbeat () {
      const { namespace = undefined, name = undefined, target } = this.$route.params
      return heartbeat({ name, namespace, target })
    },
    retry () {
      this.snackbarTop = false
      this.errorSnackbarBottom = false
      return this.connect()
    },
    cancelConnectAndClose () {
      this.terminalSession.cancelConnect = true
      this.terminalSession.close()
    },
    async connect () {
      const terminalSession = this.terminalSession = new TerminalSession(this)

      this.spinner.start()
      this.spinner.text = 'Preparing terminal session'
      terminalSession.connectionState = ConnectionState.PREPARING

      try {
        const terminalData = await this.createTerminal()
        await terminalSession.attachTerminal(terminalData)
      } catch (err) {
        this.showErrorSnackbarBottom(get(err, 'response.data.message', err.message))
        terminalSession.setDisconnectedState()
      }
    }
  },
  mounted () {
    const term = this.term = new Terminal()
    const fitAddon = this.fitAddon = new FitAddon()

    term.loadAddon(fitAddon)
    term.loadAddon(new WebLinksAddon())

    term.open(this.$refs.container)
    term.focus()
    this.$nextTick(() => {
      fitAddon.fit()
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
    if (this.term) {
      this.term.dispose()
    }
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
      max-height: calc(100% - 25px);
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
    margin-top: 0;
    margin-bottom: 0;
  }
</style>
