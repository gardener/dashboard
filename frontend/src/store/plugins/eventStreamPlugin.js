//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

function connect (store, logger, topic) {
  const params = new URLSearchParams({ topic })
  const eventSource = new EventSource('/api/stream?' + params.toString())

  const resync = async () => {
    eventSource.close()
    store.dispatch('shoots/synchronize')
  }

  let timeoutId = setTimeout(() => {
    logger.error('SSE connection timeout')
    resync()
  }, 5000)

  /* handle 'open' event */
  const onOpen = () => {
    logger.debug('SSE connection open')
  }
  eventSource.addEventListener('open', onOpen, { once: true })

  /* handle 'ready' event */
  const onReady = e => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = undefined
    }
    logger.log('SSE connection ready:', JSON.parse(e.data))
  }
  eventSource.addEventListener('ready', onReady, { once: true })

  /* handle 'close' event */
  const onClose = () => {
    logger.log('SSE connection closing')
    resync()
  }
  eventSource.addEventListener('close', onClose, { once: true })

  /* handle 'error' events */
  const onError = e => {
    switch (eventSource.readyState) {
      case EventSource.CONNECTING:
        logger.debug('SSE connection opening')
        break
      case EventSource.CLOSED:
        logger.debug('SSE connection closed')
        break
    }
  }
  eventSource.addEventListener('error', onError)

  /* handle 'heartbeat' events */
  const onHeartbeat = e => {
    const data = JSON.parse(e.data)
    const latency = Date.now() - new Date(data.time).getTime()
    logger.debug('SSE connection heartbeat:', { ...data, latency })
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

  return () => {
    eventSource.removeEventListener('comments', onComments)
    eventSource.removeEventListener('issues', onIssues)
    eventSource.removeEventListener('shoots', onShoots)
    eventSource.removeEventListener('heartbeat', onHeartbeat)
    eventSource.removeEventListener('error', onError)
    eventSource.removeEventListener('close', onClose)
    eventSource.removeEventListener('ready', onReady)
    eventSource.removeEventListener('open', onOpen)
    eventSource.close()
  }
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
