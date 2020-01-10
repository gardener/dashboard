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
  <v-layout v-resize="onResize" column fill-height :class="backgroundClass" class="position-relative">
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
    <draggable-component :uuid="uuid">
      <template v-slot:handle>
        <v-system-bar dark class="systemBarTop" :class="backgroundClass">
          <v-btn :disabled="!isTerminalSessionCreated" icon small class="text-none grey--text text--lighten-1 ml-0 systemBarButton" @click="deleteTerminal">
            <v-icon>mdi-close</v-icon>
          </v-btn>
          <span>{{terminalTitle}}</span>
          <v-spacer></v-spacer>
          <v-menu
            bottom
            offset-y
            dark
            min-width="400px"
          >
            <template v-slot:activator="{ on }">
              <v-btn slot="activator" icon small class="text-none grey--text text--lighten-1 ml-0 systemBarButton" v-on="on">
                <v-icon>mdi-menu</v-icon>
              </v-btn>
            </template>
            <v-card tile>
              <v-card-actions>
                <v-btn small block slot="activator" flat class="action-button" @click="split('horizontal')">
                  <icon-base width="16" height="16" viewBox="0 -2 20 20" class="mr-2">
                    <split-vertically></split-vertically>
                  </icon-base>
                  <span>Split Pane Vertically</span>
                  <v-spacer></v-spacer>
                  <span>(ctrl + y)</span>
                </v-btn>
              </v-card-actions>
              <v-card-actions>
                <v-btn small block slot="activator" flat class="action-button" @click="split('vertical')">
                  <icon-base width="16" height="16" viewBox="0 -2 20 20" class="mr-2">
                    <split-horizontally></split-horizontally>
                  </icon-base>
                  <span>Split Pane Horizontally</span>
                  <v-spacer></v-spacer>
                  <span>(ctrl + shift + y)</span>
                </v-btn>
              </v-card-actions>
              <v-divider class="mt-1 mb-1"></v-divider>
              <v-card-actions>
                <v-btn small block slot="activator" flat class="action-button" @click="configure('settingsBtn')" :loading="loading.settingsBtn">
                  <v-icon small class="mr-2">mdi-settings</v-icon>
                  Settings
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-menu>
        </v-system-bar>
      </template>
      <template v-slot:component>
        <v-flex ref="container" class="terminal-container"></v-flex>
        <v-system-bar dark class="systemBarBottom" :class="backgroundClass">
          <v-menu
            v-model="connectionMenu"
            top
            offset-y
            dark
          >
            <v-tooltip slot="activator" :disabled="connectionMenu" top class="ml-2" style="min-width: 110px">
              <v-btn small flat slot="activator" class="text-none grey--text text--lighten-1  ml-0 systemBarButton">
                <icon-base width="18" height="18" viewBox="-2 -2 30 30" iconColor="#bdbdbd" class="mr-2">
                  <connected v-if="terminalSession.connectionState === TerminalSession.CONNECTED"></connected>
                  <disconnected v-else></disconnected>
                </icon-base>
                <span class="text-none grey--text text--lighten-1" style="font-size: 13px">{{connectionStateText}}</span>
              </v-btn>
              {{terminalSession.detailedConnectionStateText || connectionStateText}}
            </v-tooltip>
            <v-card tile>
              <v-card-actions v-if="terminalSession.connectionState === TerminalSession.DISCONNECTED">
                <v-btn small slot="activator" flat class="actionButton" @click="retry()">
                  <v-icon small left>mdi-reload</v-icon>
                  Reconnect
                </v-btn>
              </v-card-actions>
              <v-card-text v-else class="ml-2 mr-2">
                {{terminalSession.detailedConnectionStateText || connectionStateText}}
              </v-card-text>
            </v-card>
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
        </v-system-bar>
      </template>
    </draggable-component>
    <terminal-settings-dialog
      ref="settings"
      :target="target"
    ></terminal-settings-dialog>
    <confirm-dialog ref="confirmDialog"></confirm-dialog>
  </v-layout>
</template>

<script>
import { mapState, mapActions, mapGetters } from 'vuex'
import ora from 'ora'
import get from 'lodash/get'
import assign from 'lodash/assign'
import find from 'lodash/find'
import head from 'lodash/head'
import intersection from 'lodash/intersection'
import keys from 'lodash/keys'
import includes from 'lodash/includes'
import pick from 'lodash/pick'
import pTimeout from 'p-timeout'

import 'xterm/css/xterm.css'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import { K8sAttachAddon, WsReadyStateEnum } from '@/lib/xterm-addon-k8s-attach'
import { FocusAddon } from '@/lib/xterm-addon-focus'

import DraggableComponent from '@/components/DraggableComponent'
import { encodeBase64Url, targetText } from '@/utils'
import {
  createTerminal,
  fetchTerminalSession,
  deleteTerminal,
  heartbeat,
  terminalConfig
} from '@/utils/api'
import ConfirmDialog from '@/dialogs/ConfirmDialog'
import TerminalSettingsDialog from '@/dialogs/TerminalSettingsDialog'
import IconBase from '@/components/icons/IconBase'
import Connected from '@/components/icons/Connected'
import Disconnected from '@/components/icons/Disconnected'
import SplitVertically from '@/components/icons/SplitVertically'
import SplitHorizontally from '@/components/icons/SplitHorizontally'

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
    this.metadata = undefined
    this.hostCluster = undefined

    this.setInitialState()
    this.close = () => {}
  }

  setInitialState () {
    this.connectionState = TerminalSession.DISCONNECTED
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

  async open () {
    this.connectionState = TerminalSession.CREATING
    const { metadata, hostCluster } = await this.createTerminal()
    this.metadata = pick(metadata, ['name', 'namespace'])
    this.hostCluster = pick(hostCluster, ['kubeApiServer', 'namespace', 'pod'])

    this.connectionState = TerminalSession.FETCHING
    const { hostCluster: { pod, token } } = await this.fetchTerminalSession()
    assign(this.hostCluster, { pod, token })

    return this.attachTerminal()
  }

  async createTerminal () {
    const body = this.vm.selectedConfig
    body.identifier = this.vm.uuid
    body.index = this.vm.index

    const { data } = await createTerminal({ ...this.terminalCoordinates, body })
    return data
  }

  async fetchTerminalSession () {
    const { data } = await fetchTerminalSession({ ...this.terminalCoordinates })
    return data
  }

  async deleteTerminal () {
    const { data } = await deleteTerminal({ ...this.terminalCoordinates })

    this.metadata = undefined

    return data
  }

  heartbeat () {
    return heartbeat({ ...this.terminalCoordinates })
  }

  get isCreated () {
    return !!this.metadata
  }

  get terminalCoordinates () {
    const coordinates = pick(this.vm.data, ['name', 'namespace', 'target'])
    if (this.metadata) {
      coordinates.body = { ...this.metadata }
    }
    return coordinates
  }

  async attachTerminal () {
    if (this.cancelConnect) {
      return
    }

    this.tries++

    try {
      this.connectionState = TerminalSession.CONNECTING
      await this.waitUntilPodIsRunning(60)
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
    const protocols = addBearerToken(['v4.channel.k8s.io'], this.hostCluster.token)
    const ws = new WebSocket(attachUri(this.hostCluster), protocols)
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
      this.connectionState = TerminalSession.CONNECTED
      this.tries = 0

      heartbeatIntervalId = setInterval(async () => {
        try {
          await this.heartbeat()
        } catch (err) {
          console.error('heartbeat failed:', err)
        }
      }, this.vm.heartbeatIntervalSeconds * 1000)
    }
    ws.onclose = error => {
      this.close()
      const wasConnected = this.connectionState === TerminalSession.CONNECTED

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

      this.connectionState = TerminalSession.CONNECTING

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
      reconnectTimeoutId = setTimeout(() => this.attachTerminal(), timeoutSeconds * 1000)
    }
    this.close = () => {
      clearTimeout(reconnectTimeoutId)
      clearInterval(heartbeatIntervalId)

      closeWsIfNotClosed(ws)
      attachAddon.dispose()

      this.close = () => {}
    }
  }

  async waitUntilPodIsRunning (timeoutSeconds) {
    const containerName = this.hostCluster.pod.container
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
    addBearerToken(protocols, this.hostCluster.token)
    const ws = new WebSocket(watchPodUri(this.hostCluster), protocols)

    this.vm.spinner.text = 'Connecting to Pod'
    try {
      await waitForPodRunning(ws, containerName, onPodStateChange, timeoutSeconds * 1000)
    } finally {
      closeWsIfNotClosed(ws)
    }
  }
}
Object.assign(TerminalSession, {
  DISCONNECTED: 0,
  CREATING: 1,
  FETCHING: 2,
  CONNECTING: 3,
  CONNECTED: 4
})

function addBearerToken (protocols, bearer) {
  protocols.unshift(`base64url.bearer.authorization.k8s.io.${encodeBase64Url(bearer)}`)
  return protocols
}

function attachUri ({ namespace, kubeApiServer, pod: { name, container } }) {
  kubeApiServer = encodeURIComponent(kubeApiServer)
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  container = encodeURIComponent(container)

  return `wss://${kubeApiServer}/api/v1/namespaces/${namespace}/pods/${name}/attach?container=${container}&stdin=true&stdout=true&tty=true`
}

function watchPodUri ({ namespace, kubeApiServer, pod: { name } }) {
  kubeApiServer = encodeURIComponent(kubeApiServer)
  namespace = encodeURIComponent(namespace)
  name = encodeURIComponent(name)
  return `wss://${kubeApiServer}/api/v1/namespaces/${namespace}/pods?fieldSelector=metadata.name%3D${name}&watch=true`
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
  name: 'g-terminal',
  components: {
    ConfirmDialog,
    TerminalSettingsDialog,
    IconBase,
    Connected,
    Disconnected,
    SplitVertically,
    SplitHorizontally,
    DraggableComponent
  },
  props: {
    uuid: {
      type: String,
      required: true
    },
    index: {
      type: Number,
      required: true
    },
    data: {
      type: Object,
      required: true
    }
  },
  data () {
    return {
      hasFocus: true,
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
      TerminalSession,
      showMenu: false
    }
  },
  computed: {
    ...mapState([
      'cfg'
    ]),
    ...mapGetters([
      'focusedElementId',
      'splitpaneResize'
    ]),
    terminalTitle () {
      let title = this.targetText
      if (this.name) {
        title += ` - ${this.name}`
      }
      return title
    },
    targetText () {
      return targetText(this.target) || 'UNKNOWN'
    },
    backgroundClass () {
      return this.hasFocus ? 'background' : 'brightBackground'
    },
    isTerminalSessionCreated () {
      return this.terminalSession && this.terminalSession.isCreated
    },
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
        case TerminalSession.DISCONNECTED:
          return 'Disconnected'
        case TerminalSession.CREATING:
        case TerminalSession.FETCHING:
          return 'Preparing'
        case TerminalSession.CONNECTING:
          return 'Connecting'
        case TerminalSession.CONNECTED:
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
      return this.data.name
    },
    namespace () {
      return this.data.namespace
    },
    target () {
      return this.data.target
    }
  },
  methods: {
    ...mapActions([
      'setFocusedElementId'
    ]),
    async deleteTerminal () {
      if (!await this.confirmDelete()) {
        return
      }

      try {
        await this.terminalSession.deleteTerminal()
        // TODO instead: emit event. let outer component decide to move away. Maybe also the deletion of the terminal should be done in the outer component, e.g. if terminal session is reused by another terminal (exec)
        this.cancelConnectAndClose()

        this.$emit('terminated')
      } catch (err) {
        this.showErrorSnackbarBottom(get(err, 'response.data.message', err.message))
      }
    },
    confirmDelete () {
      return this.$refs.confirmDialog.waitForConfirmation({
        confirmButtonText: 'Terminate',
        captionText: 'Confirm Termination',
        messageHtml: 'Do you want to terminate this terminal session? This will clean up all related resources.<br/><br/><i class="grey--text text--darken-2">Terminal sessions are automatically cleaned up if you navigate away or close the browser window.</i>'
      })
    },
    async configure (refName) {
      this.loading[refName] = true
      const { namespace, name, target } = this.data
      try {
        const { data: config } = await terminalConfig({ name, namespace, target })

        assign(this.config, config)
      } catch (err) {
        this.showErrorSnackbarBottom(get(err, 'response.data.message', err.message))
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

      try {
        await terminalSession.open()
      } catch (err) {
        this.showErrorSnackbarBottom(get(err, 'response.data.message', err.message))
        terminalSession.setDisconnectedState()
      }
    },
    split (orientation) {
      this.$emit('split', orientation)
    }
  },
  mounted () {
    const term = this.term = new Terminal()
    const fitAddon = this.fitAddon = new FitAddon()
    const focusAddon = new FocusAddon(this.uuid)
    focusAddon.onFocus = () => {
      term.setOption('theme', { background: '#000' })
      this.hasFocus = true
    }
    focusAddon.onBlur = () => {
      term.setOption('theme', { background: '#333' })
      this.hasFocus = false
    }

    term.open(this.$refs.container)
    term.loadAddon(focusAddon) // must be called after open, otherwise the terminal.textarea is not initialized
    term.loadAddon(fitAddon)
    term.loadAddon(new WebLinksAddon())

    term.focus()
    this.$nextTick(() => {
      // use $nextTick as xterm needs to be finished with rendering because fitAddon relies on
      // dynamic dimensions calculated via css, which do not return correct values before rendering is complete
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
  },
  watch: {
    splitpaneResize () {
      this.onResize()
    }
  }
}
</script>

<style lang="styl" scoped>
  .position-relative
    position: relative !important
  .terminal-container {
      height: 100%;
      width: 100%;
      margin-top: 4px;
      margin-left: 4px;
      margin-bottom: 0;
      margin-right: 0;
      max-height: calc(100% - 50px);
      /* Change stacking order so that PositionalDropzone is in front. See also https://philipwalton.com/articles/what-no-one-told-you-about-z-index/ */
      opacity: .99;
  }
  .terminal {
    font-family: "DejaVu Sans Mono", "Everson Mono", FreeMono, Menlo, Terminal, monospace, "Apple Symbols";
    height: 100%;
    width: 100%;
  }
  .systemBarTop .systemBarBottom {
    min-height: 25px;
  }
  .background {
    background: #000;
  }
  .brightBackground {
    background: #333;
  }
  .systemBarButton {
    min-width: 20px;
    max-height: 25px;
    margin-top: 0;
    margin-left: 0;
    margin-bottom: 0;
  }

  .action-button >>> .v-btn__content {
    justify-content: left
  }
</style>
