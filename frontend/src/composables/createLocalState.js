//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { effectScope } from 'vue'

export function createLocalState (stateFactory) {
  let state
  const scope = effectScope(true)

  return (...args) => {
    state = scope.run(() => stateFactory(...args))
    return state
  }
}
