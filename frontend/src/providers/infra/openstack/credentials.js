//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { decodeBase64 } from '@/utils'

import get from 'lodash/get'

export function getOpenStackCredentialDomainName (credential) {
  const domainName = get(credential, ['data', 'domainName'])
  return domainName ? decodeBase64(domainName) : undefined
}
