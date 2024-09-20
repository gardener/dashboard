//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { useLogger } from '@/composables/useLogger'
import { useApi } from '@/composables/useApi'

import { encodeBase64Url } from '@/utils'
import pTimeout from '@/utils/p-timeout'

import {
  K8sAttachAddon,
  WsReadyStateEnum,
} from './xterm-addon-k8s-attach'

import {
  assign,
  find,
  get,
  head,
  merge,
  intersection,
  keys,
  includes,
  pick,
} from '@/lodash'

const api = useApi()
const logger = useLogger()

const WsCloseEventEnum = {
  NORMAL_CLOUSURE: 1000,
}

const RETRY_TIMEOUT_SECONDS = 3
const MAX_TRIES = 60 / RETRY_TIMEOUT_SECONDS

export class TerminalSession {
  constructor (vm) {
    this.vm = vm
    this.cancelConnect = false
    this.tries = 0
    this.metadata = undefined
    this.hostCluster = undefined
    this.imageHelpText = undefined

    this.setInitialState()
    this.close = () => {}
  }

  setInitialState () {
    this.connectionState = TerminalSession.DISCONNECTED
    this.node = undefined
    this.hostPID = undefined
    this.hostNetwork = undefined
    this.container = {
      privileged: undefined,
      image: undefined,
    }
    this.detailedConnectionStateText = undefined
  }

  setDisconnectedState () {
    this.setInitialState()
  }

  async open () {
    this.connectionState = TerminalSession.CREATING
    const { metadata, hostCluster, imageHelpText } = await this.createTerminal()
    this.metadata = pick(metadata, ['name', 'namespace'])
    this.hostCluster = pick(hostCluster, ['kubeApiServer', 'namespace', 'pod'])
    this.imageHelpText = imageHelpText

    this.connectionState = TerminalSession.FETCHING
    const { hostCluster: { pod, token } } = await this.fetchTerminalSession()
    assign(this.hostCluster, { pod, token })

    return this.attachTerminal()
  }

  async createTerminal () {
    let container = get(this.vm.data, 'container')
    container = pick(container, [
      'image',
      'command',
      'args',
      'resources',
      'privileged',
    ])

    let selectedConfigContainer = get(this.vm.selectedConfig, 'container')
    selectedConfigContainer = pick(selectedConfigContainer, [
      'image',
      'privileged',
    ])

    const hostConfig = pick(this.vm.data, ['node', 'hostPID', 'hostNetwork', 'preferredHost'])
    const selectedConfigHost = pick(this.vm.selectedConfig, ['node', 'hostPID', 'hostNetwork', 'preferredHost'])
    const body = assign(hostConfig, selectedConfigHost) // node: undefined (auto select node) should overwrite the value from hostConfig, hence using lodash assign
    body.identifier = this.vm.uuid
    body.container = merge(container, selectedConfigContainer)

    const { data } = await api.createTerminal({ ...this.terminalCoordinates, body })
    return data
  }

  async fetchTerminalSession () {
    const { data } = await api.fetchTerminalSession({ ...this.terminalCoordinates })
    return data
  }

  async deleteTerminal () {
    const { data } = await api.deleteTerminal({ ...this.terminalCoordinates })

    this.metadata = undefined

    return data
  }

  heartbeat () {
    return api.heartbeat({ ...this.terminalCoordinates })
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
      if (this.cancelConnect) {
        return
      }
      logger.error('failed to wait until pod is running', err)
      this.vm.showSnackbarTop('Could not connect to terminal', 'The detailed connection error can be found in the JavaScript console of your browser')
      this.setDisconnectedState()
      return
    }

    // See https://github.com/kubernetes/kubernetes/blob/master/staging/src/k8s.io/apimachinery/pkg/util/remotecommand/constants.go
    const protocols = addBearerToken(['v4.channel.k8s.io'], this.hostCluster.token)
    const ws = new WebSocket(attachUri(this.hostCluster), protocols)
    const attachAddon = new K8sAttachAddon(ws, {
      logger,
      bidirectional: true,
    })
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
          logger.error('heartbeat failed:', err)
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
        // do not start spinner as this would clear the console
        timeoutSeconds = 0
        logger.info(`Websocket connection lost (code ${error.code}). Trying to reconnect..`)
      } else { // Try again later
        timeoutSeconds = RETRY_TIMEOUT_SECONDS
        this.vm.spinner.start()
        logger.info(`Pod not yet ready. Reconnecting in ${timeoutSeconds} seconds..`)
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
      this.container.image = get(terminalContainer, 'image')
      this.container.privileged = get(terminalContainer, 'securityContext.privileged', false)
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

    this.vm.spinner.text = 'Connecting to Pod'
    return waitForPodRunning(this.hostCluster, containerName, onPodStateChange, timeoutSeconds * 1000)
  }
}
Object.assign(TerminalSession, {
  DISCONNECTED: 0,
  CREATING: 1,
  FETCHING: 2,
  CONNECTING: 3,
  CONNECTED: 4,
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

async function waitForPodRunning (hostCluster, containerName, onPodEvent, timeoutSeconds) {
  const connectTimeoutSeconds = 5

  const createConnection = () => {
    const protocols = ['garden'] // there must be at least one other subprotocol in addition to the bearer token
    addBearerToken(protocols, hostCluster.token)
    const url = watchPodUri(hostCluster)
    const ws = new WebSocket(url, protocols)

    const connectPromise = new Promise((resolve, reject) => {
      const openHandler = () => {
        ws.removeEventListener('open', openHandler)
        ws.removeEventListener('error', errorHandler)

        resolve(ws)
      }
      const errorHandler = ev => {
        ws.removeEventListener('open', openHandler)
        ws.removeEventListener('error', errorHandler)

        reject(new Error(`Failed to create connection to ${url}`))
      }

      ws.addEventListener('open', openHandler)
      ws.addEventListener('error', errorHandler)
    })

    return pTimeout(connectPromise, connectTimeoutSeconds * 1000, `Could not connect within ${connectTimeoutSeconds} seconds`)
  }

  let ws = null
  try {
    ws = await createConnection()
  } catch (err) {
    logger.info(err.message)
    ws = null
  }

  if (!ws) {
    // workaround for https://bugs.chromium.org/p/chromium/issues/detail?id=993907&q=ERR_SSL_CLIENT_AUTH_CERT_NEEDED&can=2
    logger.info('Trying connect workaround ...')
    try {
      // We want the tls handshake to be establised so that the request context has a client certificate selection for the endpoint.
      // It does not matter that the request will fail with 401.
      const options = {
        method: 'HEAD',
        mode: 'no-cors',
      }
      await fetch(`https://${hostCluster.kubeApiServer}`, options)
    } catch (err) { /* ignore errors */ }
    ws = await createConnection()
  }

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
        logger.error('could not parse message')
        return
      }
      const pod = event.object
      if (typeof onPodEvent === 'function') {
        try {
          onPodEvent(event)
        } catch (error) {
          logger.error('error during handling of pod event', error.message)
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

  try {
    await pTimeout(podRunningPromise, timeoutSeconds * 1000, `Timed out after ${timeoutSeconds}s`)
  } finally {
    closeWsIfNotClosed(ws)
  }
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

// Escape Sequence
const ESC = '\u001B'
// Control Sequence Introducer https://xtermjs.org/docs/api/vtfeatures/#csi
const CSI = ESC + '['

export class Spinner {
  #term
  #intervalId
  #text

  constructor (term) {
    this.#term = term
    this.#intervalId = null
  }

  get text () {
    return this.#text
  }

  set text (value) {
    this.#text = value
  }

  start () {
    if (this.#intervalId) {
      return
    }

    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
    let i = 0
    this._clearTerminal()
    this._hideCursor()
    this.#intervalId = setInterval(() => {
      i = ++i % frames.length
      const frame = frames[i] // eslint-disable-line security/detect-object-injection
      this._eraseLine()
      this.#term.write(frame + ' ' + this.#text)
    }, 125)
  }

  stop () {
    clearInterval(this.#intervalId)
    this.#intervalId = undefined
    this._eraseLine()
    this._showCursor()
  }

  _eraseLine () {
    this.#term.write([
      CSI + '2K', // Erase complete line
      CSI + 'H', // Set cursor to home position
    ].join(''))
  }

  _showCursor () {
    this.#term.write(CSI + '?25h')
  }

  _hideCursor () {
    this.#term.write(CSI + '?25l')
  }

  _clearTerminal () {
    this.#term.write(ESC + 'c')
  }
}
