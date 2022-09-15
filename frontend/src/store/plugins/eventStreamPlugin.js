//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

function connect (store, logger, topic) {
  const keepAlive = 15
  const connectTimeout = 15000
  const params = new URLSearchParams({ keepAlive, topic })
  const eventSource = new EventSource('/api/stream?' + params.toString())

  const cleanup = () => {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = undefined
    }
    lastHeartbeat = Date.now()
    eventSource.removeEventListener('connected', onConnected)
    eventSource.removeEventListener('heartbeat', onHeartbeat)
    eventSource.removeEventListener('error', onError)
    eventSource.removeEventListener('reconnect', onReconnect)
    eventSource.removeEventListener('comments', onComments)
    eventSource.removeEventListener('issues', onIssues)
    eventSource.removeEventListener('shoots', onShoots)
    eventSource.close()
  }

  let connectionCount = 0
  let lastHeartbeat = Date.now()

  const reconnect = async () => {
    cleanup()
    logger.log('EVS reconnect initiated')
    store.dispatch('shoots/synchronize')
  }

  let intervalId = setInterval(() => {
    if (Date.now() - lastHeartbeat > 2 * keepAlive * 1000) {
      logger.info('EVS connection is dead')
      reconnect()
    }
  }, Math.floor(keepAlive * 1000 / 3))

  let timeoutId = setTimeout(() => {
    logger.error('EVS connect timeout')
    reconnect()
  }, connectTimeout)

  /* handle 'connected' event */
  const onConnected = e => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = undefined
    }

    connectionCount += 1
    lastHeartbeat = Date.now()
    const { statusCode, message, ...data } = JSON.parse(e.data)
    if (statusCode === 200) {
      logger.info('EVS connected:', data)
    } else {
      logger.error('EVS error: %d - %s', statusCode, message)
      store.commit('SET_ALERT', { type: 'error', message })
    }
  }
  eventSource.addEventListener('connected', onConnected)

  /* handle 'reconnect' event */
  const onReconnect = () => {
    logger.log('EVS reconnecting')
    reconnect()
  }
  eventSource.addEventListener('reconnect', onReconnect)

  /* handle 'error' events */
  const onError = e => {
    switch (eventSource.readyState) {
      case EventSource.CONNECTING: {
        logger.debug('EVS %s', connectionCount > 1 ? 'reconnecting' : 'connecting')
        break
      }
      case EventSource.CLOSED: {
        logger.debug('EVS closed')
        // TODO reconcile connection state and recoonect when connection is dead or closed but not based on events
        // reconnect()
        break
      }
    }
  }
  eventSource.addEventListener('error', onError)

  /* handle 'heartbeat' events */
  const onHeartbeat = e => {
    const data = JSON.parse(e.data)
    logger.debug('EVS heartbeat:', data, e.lastEventId)
    lastHeartbeat = Date.now()
  }
  eventSource.addEventListener('heartbeat', onHeartbeat)

  /* handle 'shoots' events */
  const onShoots = e => {
    try {
      const event = JSON.parse(e.data)
      if (store.getters.currentNamespaces.includes(event?.object?.metadata.namespace)) {
        store.commit('shoots/HANDLE_EVENT', {
          rootState: store.state,
          rootGetters: store.getters,
          event
        })
      }
    } catch (err) {
      logger.error('Failed to parse data of server-sent event')
    }
  }
  eventSource.addEventListener('shoots', onShoots)

  /* handle 'issues' events */
  const onIssues = e => {
    try {
      const event = JSON.parse(e.data)
      store.commit('tickets/HANDLE_ISSUES_EVENT', event)
    } catch (err) {
      logger.error('Failed to parse data of server-sent event')
    }
  }
  eventSource.addEventListener('issues', onIssues)

  /* handle 'comments' events */
  const onComments = e => {
    try {
      const event = JSON.parse(e.data)
      store.commit('tickets/HANDLE_COMMENTS_EVENT', event)
    } catch (err) {
      logger.error('Failed to parse data of server-sent event')
    }
  }
  eventSource.addEventListener('comments', onComments)

  return () => cleanup()
}

export default function createPlugin (logger) {
  let disconnect
  const destroy = () => {
    if (typeof disconnect === 'function') {
      disconnect()
      disconnect = undefined
    }
  }
  return store => {
    store.subscribe((mutation) => {
      switch (mutation.type) {
        case 'shoots/UNSET_SUBSCRIPTION': {
          destroy()
          break
        }
        case 'shoots/RECEIVE': {
          destroy()
          const topic = store.getters['shoots/topic']
          if (topic) {
            disconnect = connect(store, logger, topic)
          }
          break
        }
      }
    })
  }
}
