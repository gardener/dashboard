//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

function subscribe (store) {
  const params = new URLSearchParams()
  params.set('padding', '1')
  for (const topic of store.state.topics) {
    params.append('topic', topic)
  }
  const eventSource = new EventSource('/api/stream?' + params.toString())

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

  return unsubscribeFn(eventSource, onShoots, onIssues, onComments)
}

function unsubscribeFn (eventSource, onShoots, onIssues, onComments) {
  return () => {
    eventSource.removeEventListener('shoots', onShoots)
    eventSource.removeEventListener('issues', onIssues)
    eventSource.removeEventListener('comments', onComments)
    eventSource.close()
  }
}

export default function () {
  return store => {
    store.subscribe((mutation, state) => {
      let unsubscribe
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
