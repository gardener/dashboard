//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { buildSearchTerms } from '@/store/shoot/search'

/**
 * Materializes the saved All Projects Shoot-list default as an explicit `q`.
 *
 * A missing `q` means "apply my saved default", whereas an existing `q`,
 * including `q=`, is an explicit search that must remain unchanged. Returning
 * a replacement target makes the effective default part of the URL so it can
 * be bookmarked or shared without depending on another user's settings.
 * Project-scoped Shoot lists do not use the All Projects default.
 */
export function normalizeShootListRoute (route, shootListFilters) {
  if (route.name !== 'ShootList') {
    return
  }

  if (Object.hasOwn(route.query, 'q') || route.params.namespace !== '_all') {
    return
  }

  const search = buildSearchTerms(shootListFilters)
  return {
    name: route.name,
    params: route.params,
    query: {
      ...route.query,
      q: search,
    },
    hash: route.hash,
    replace: true,
  }
}

export function getShootListContext (route) {
  const value = route.query.q
  const search = Array.isArray(value)
    ? value[0] ?? ''
    : value ?? ''

  return {
    namespace: route.params.namespace,
    search,
  }
}
