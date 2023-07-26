//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { useApi } from '@/composables/useApi'

describe('composables', () => {
  describe('useApi', () => {
    beforeEach(() => {
      fetch.resetMocks()
    })

    describe('#getConfiguration', () => {
      it('should fetch the configuration', async () => {
        const { getConfiguration } = useApi()
        const data = {
          apiServerUrl: 'https://api.garden.cloud',
        }
        fetch.mockResponseOnce(JSON.stringify(data), {
          headers: {
            'content-type': 'application/json; charset=UTF-8',
          },
        })
        const res = await getConfiguration()
        expect(res.status).toBe(200)
        expect(res.data).toEqual(data)
      })
    })
  })
})
