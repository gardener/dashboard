//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { vi } from 'vitest'
import _ from 'lodash-es'

const defaultTokenResponse = {
  access_token: 'valid-access-token',
  token_type: 'Bearer',
}

export const mockGetToken = vi.fn().mockResolvedValue(defaultTokenResponse)

export class GoogleToken {
  constructor (options) {
    return {
      key: options.key,
      iss: options.email,
      scope: options.scope,
      eagerRefreshThresholdMillis: options.eagerRefreshThresholdMillis,
      expiresAt: undefined,
      rawToken: undefined,
      get accessToken () {
        return _.get(this.rawToken, ['access_token'])
      },
      async getToken () {
        const iat = Math.floor(new Date().getTime() / 1000)
        this.rawToken = await mockGetToken()
        const expiresIn = _.get(this.rawToken, ['expires_in'], 3600)
        this.expiresAt = (iat + expiresIn) * 1000
        return this.rawToken
      },
    }
  }

  async getToken () {
    return mockGetToken()
  }
}

export default GoogleToken
