//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

function subscribe (store) {
  const params = new URLSearchParams()
  for (const topic of store.state.topics) {
    params.append('topic', topic)
  }
  const eventSource = new EventSource('/api/stream?' + params.toString())

  const onError = e => {
    if (e.target.readyState === EventSource.CLOSED) {
      store.commit('SET_ALERT', {
        type: 'error',
        message: 'Connection for automatic server updates is closed'
      })
    }
  }
  eventSource.addEventListener('error', onError)

  /* handle 'shoots' events */
  const onShoots = e => {
    try {
      const event = JSON.parse(e.data)
      if (store.getters.currentNamespaces.includes(event?.object?.metadata.namespace)) {
        store.commit('shoots/HANDLE_EVENTS', {
          rootState: store.state,
          rootGetters: store.getters,
          events: [event]
        })
      }
    } catch (err) {
      console.error('Failed to parse data of server-sent event')
    }
  }
  eventSource.addEventListener('shoots', onShoots)

  /* handle 'issues' events */
  const onIssues = e => {
    try {
      const event = JSON.parse(e.data)
      store.commit('tickets/HANDLE_ISSUES_EVENTS', [event])
    } catch (err) {
      console.error('Failed to parse data of server-sent event')
    }
  }
  eventSource.addEventListener('issues', onIssues)

  /* handle 'comments' events */
  const onComments = e => {
    try {
      const event = JSON.parse(e.data)
      store.commit('tickets/HANDLE_COMMENTS_EVENTS', [event])
    } catch (err) {
      console.error('Failed to parse data of server-sent event')
    }
  }
  eventSource.addEventListener('comments', onComments)

  return () => {
    eventSource.removeEventListener('comments', onComments)
    eventSource.removeEventListener('issues', onIssues)
    eventSource.removeEventListener('shoots', onShoots)
    eventSource.removeEventListener('error', onShoots)
    eventSource.close()
  }
}

export default function () {
  let unsubscribe

  return store => {
    store.subscribe((mutation, state) => {
      switch (mutation.type) {
        case 'SET_TOPICS': {
          if (typeof unsubscribe === 'function') {
            unsubscribe()
            unsubscribe = undefined
          }
          if (state.topics?.length) {
            unsubscribe = subscribe(store)
          }
          break
        }
      }
    })
  }
}
