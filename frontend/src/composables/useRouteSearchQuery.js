//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  effectScope,
  getCurrentScope,
  onScopeDispose,
  shallowRef,
  watch,
} from 'vue'
import { useRouter } from 'vue-router'

// Shares shallow search state between all consumers of the same router.
const searchStateByRouter = new WeakMap()

function normalizeSearch (value) {
  return (Array.isArray(value) ? value[0] : value) ?? ''
}

/**
 * Creates the shallow search state shared by all consumers of a router.
 */
function createSearchState (router) {
  const routerHistory = router.options.history
  const actualRoute = router.resolve(routerHistory.location)

  const search = shallowRef(normalizeSearch(actualRoute.query.q))
  const routeCommittedListeners = new Set()

  // The state is router-scoped, so its watcher must not inherit the component
  // scope of the first list that happens to create it.
  effectScope(true).run(() => {
    // Vue Router handles browser history navigation. Rehydrate the shared
    // search state whenever it publishes a successfully committed route by
    // copying q from currentRoute. Canceled navigations never reach this watcher.
    watch(router.currentRoute, route => {
      const value = normalizeSearch(route.query.q)
      search.value = value
      for (const listener of routeCommittedListeners) {
        listener(value, route)
      }
    }, {
      flush: 'sync',
    })
  })

  function onRouteCommitted (listener) {
    routeCommittedListeners.add(listener)
    return () => routeCommittedListeners.delete(listener)
  }

  function replace (value) {
    const normalizedValue = normalizeSearch(value)
    const route = router.resolve(routerHistory.location)
    const query = {
      ...route.query,
      // Keep q present for an empty search. Absence and q= intentionally have
      // different destination semantics.
      q: normalizedValue,
    }

    const resolved = router.resolve({
      name: route.name,
      params: route.params,
      query,
      hash: route.hash,
    })

    routerHistory.replace(resolved.fullPath)
    search.value = normalizedValue
    return normalizedValue
  }

  return {
    search,
    replace,
    onRouteCommitted,
  }
}

function getSearchState (router) {
  let state = searchStateByRouter.get(router)
  if (!state) {
    state = createSearchState(router)
    searchStateByRouter.set(router, state)
  }
  return state
}

/**
 * Creates the live shallow search binding for an explicit router.
 * `onWrite` runs only for a local shallow write. `onRouteCommitted` runs after
 * the shared search is rehydrated from each successfully committed route.
 */
function createShallowRouteSearchQuery (router, options = {}) {
  const {
    onWrite,
    onRouteCommitted,
  } = options

  if (onRouteCommitted && !getCurrentScope()) {
    throw new Error(
      'useShallowRouteSearchQuery with onRouteCommitted must be called within an active Vue scope',
    )
  }

  const state = getSearchState(router)
  if (onRouteCommitted) {
    const removeListener = state.onRouteCommitted(onRouteCommitted)
    onScopeDispose(removeListener)
  }

  const searchQuery = computed({
    get () {
      return state.search.value
    },
    set (value) {
      const search = state.replace(value)
      onWrite?.(search)
    },
  })

  return {
    searchQuery,
  }
}

/**
 * Keeps the `q` search parameter reflected in the URL without starting a Vue
 * Router navigation for each search edit. A normal router replacement would
 * run navigation guards and route lifecycle work even though only list
 * filtering changed.
 *
 * Local writes update RouterHistory directly and deliberately leave
 * router.currentRoute stale until the next real navigation.
 */
export function useShallowRouteSearchQuery ({ onWrite, onRouteCommitted } = {}) {
  return createShallowRouteSearchQuery(useRouter(), {
    onWrite,
    onRouteCommitted,
  })
}

/**
 * Compares route identity while ignoring the deliberately stale shallow q.
 */
export function isSameRouteIgnoringShallowQuery (router, first, second) {
  const resolveWithoutSearch = location => {
    const route = router.resolve(location)
    const query = Object.fromEntries(
      Object.entries(route.query)
        .filter(([key]) => key !== 'q')
        .sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey)),
    )

    return router.resolve({
      name: route.name,
      params: route.params,
      query,
      hash: route.hash,
    }).fullPath
  }

  return resolveWithoutSearch(first) === resolveWithoutSearch(second)
}
