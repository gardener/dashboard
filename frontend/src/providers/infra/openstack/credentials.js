//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { computed } from 'vue'

import { decodeBase64 } from '@/utils'

import get from 'lodash/get'

export function useOpenStackCredentialDomainName ({ providerType, credential, hasOwnSecret }) {
  return computed(() => {
    if (providerType.value !== 'openstack' || !hasOwnSecret.value) {
      return undefined
    }
    const domainName = get(credential.value, ['data', 'domainName'])
    return domainName ? decodeBase64(domainName) : undefined
  })
}
