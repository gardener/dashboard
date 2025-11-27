//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { jest } from '@jest/globals'
import _ from 'lodash-es'

export const mockGetToken = jest.fn().mockResolvedValue({
  access_token: 'valid-access-token',
  token_type: 'Bearer',
})

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
