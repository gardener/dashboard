//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { rotateServiceAccountSecret, getConfiguration } from '@/utils/api'

describe('utils', () => {
  describe('api', () => {
    const namespace = 'garden-foo'
    const name = 'bar'

    beforeEach(() => {
      fetch.resetMocks()
    })

    describe('#getConfiguration', () => {
      it('should fetch the configuration', async () => {
        const data = {
          apiServerUrl: 'https://api.garden.cloud'
        }
        fetch.mockResponseOnce(JSON.stringify(data), {
          headers: {
            'content-type': 'application/json; charset=UTF-8'
          }
        })
        const res = await getConfiguration()
        expect(res.status).toBe(200)
        expect(res.data).toEqual(data)
      })
    })

    describe('#rotateServiceAccountSecret', () => {
      it('should rotate a serviceaccount secret', async () => {
        fetch.mockResponseOnce(null, {
          status: 204,
          headers: {
            'content-length': '0'
          }
        })
        const res = await rotateServiceAccountSecret({ namespace, name })
        expect(res.status).toBe(204)
        expect(res.data).toBeUndefined()
      })

      it('should fail rotate a serviceaccount secret', async () => {
        const body = 'Secret not found'
        fetch.mockResponseOnce(body, {
          status: 404
        })
        expect.assertions(3)
        try {
          await rotateServiceAccountSecret({ namespace, name })
        } catch ({ message, response }) {
          expect(message).toBe('Request failed with status code 404')
          expect(response.status).toBe(404)
          expect(response.data).toEqual(body)
        }
      })
    })
  })
})
