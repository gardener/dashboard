//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const assert = require('assert').strict
const createError = require('http-errors')
const _ = require('lodash')

function canGetCloudProfiles ({ allowed = true, verb = 'get' } = {}) {
  return async function request (path, { method, json }) {
    assert.strictEqual(path, 'selfsubjectaccessreviews')
    assert.strictEqual(method, 'post')
    assert.deepStrictEqual(json.spec.resourceAttributes, {
      group: 'core.gardener.cloud',
      resource: 'cloudprofiles',
      verb,
      name: undefined
    })
    return {
      ...json,
      status: { allowed }
    }
  }
}

describe('api', function () {
  let agent
  const api = {
    kube: {
      request: jest.fn()
    },
    gardener: {
      request: jest.fn()
    }
  }

  beforeAll(() => {
    require('@gardener-dashboard/request')
      .__setMockClients({
        'https://kubernetes:6443': api.kube
      })
    agent = createAgent()
  })

  afterAll(() => {
    return agent.close()
  })

  beforeEach(() => {
    for (const client of Object.values(api)) {
      client.request = jest.fn().mockRejectedValue(createError(501, 'Not Implemented'))
    }
  })

  describe('cloudprofiles', function () {
    const id = 'john.doe@example.org'
    const user = fixtures.user.create({ id })

    it('should return all cloudprofiles', async function () {
      const bearer = await user.bearer

      api.kube.request.mockImplementationOnce(canGetCloudProfiles({ bearer, verb: 'list' }))

      const res = await agent
        .get('/api/cloudprofiles')
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)

      expect(api.kube.request).toBeCalledTimes(1)
      expect(api.kube.request.mock.calls[0]).toEqual([
        'selfsubjectaccessreviews',
        {
          method: 'post',
          json: {
            apiVersion: 'authorization.k8s.io/v1',
            kind: 'SelfSubjectAccessReview',
            spec: expect.objectContaining({
              resourceAttributes: {
                group: 'core.gardener.cloud',
                name: undefined,
                resource: 'cloudprofiles',
                verb: 'list'
              }
            })
          }
        }
      ])

      expect(res.body).toHaveLength(4)
      const cloudProfiles = _.keyBy(res.body, 'metadata.name')
      expect(cloudProfiles['infra1-profileName'].data.seedNames).toHaveLength(3)
      expect(cloudProfiles['infra1-profileName2'].data.seedNames).toHaveLength(2)
      expect(cloudProfiles['infra3-profileName'].data.seedNames).toHaveLength(1)
      expect(cloudProfiles['infra3-profileName2'].data.seedNames).toHaveLength(2)
    })
  })
})
