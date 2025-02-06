//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  inject,
  provide,
} from 'vue'

import { useSecretBindingContext } from './useSecretBindingContext'
import { useSecretContext } from './useSecretContext'

export function createCredentialContextComposable (options = {}) {
  const secretBindingContext = useSecretBindingContext(options)
  const secretContext = useSecretContext(options)

  return {
    ...secretBindingContext,
    ...secretContext,
  }
}

export function useCredentialContext () {
  return inject('credential-context', null)
}

export function useProvideCredentialContext (options) {
  const composable = createCredentialContextComposable(options)
  provide('credential-context', composable)
  return composable
}
