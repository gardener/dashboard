//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const os = require('os')
const crypto = require('crypto')
const _ = require('lodash')
const { BadRequest, InternalServerError } = require('http-errors')
const { dashboardClient } = require('@gardener-dashboard/kube-client')
const logger = require('../lib/logger')
const config = require('../lib/config')

describe('github webhook', function () {
  const namespace = 'garden'
  const leaseName = 'gardener-dashboard-github-webhook'
  const microDateStr = '2006-01-02T15:04:05.000000Z'
  const dateStr = new Date(microDateStr).toISOString()

  const { handleGithubEvent } = require('../lib/github/webhookHandler')

  beforeAll(() => {
  })

  describe('handler', () => {
    let mergePatchStub

    beforeEach(() => {
      mergePatchStub = jest.spyOn(dashboardClient['coordination.k8s.io'].leases, 'mergePatch')
      mergePatchStub.mockResolvedValue({})
    })

    it('should log a warning and throw an error in case of unknown event', async () => {
      const handlePromise = handleGithubEvent('unknown', null)
      expect(handlePromise).rejects.toBeInstanceOf(BadRequest)
      try {
        const p = await handleGithubEvent('unknown', null)
        expect(p).rejects.toBe(expect.any())
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequest);
        expect(logger.warn).toBeCalled()
      }
    })

    it('should error in case of missing properties in payload', async () => {
      let data = { issue: {} }
      expect(handleGithubEvent('issues', data)).rejects.toBeInstanceOf(BadRequest)
      data = { comment: {} }
      expect(handleGithubEvent('issue_comment', data)).rejects.toBeInstanceOf(BadRequest)
    })

    it('should update the lease object for an issue event', async () => {
      handleGithubEvent('issues', { issue: { updated_at: dateStr } })

      const expectedBody = {
        spec: {
          holderIdentity: os.hostname(),
          renewTime: microDateStr
        }
      }
      expect(mergePatchStub).toBeCalledWith(namespace, leaseName, expectedBody)
    })

    it('should update the lease object for an issue_comment event', async () => {
      handleGithubEvent('issue_comment', { comment: { updated_at: dateStr } })

      const expectedBody = {
        spec: {
          holderIdentity: os.hostname(),
          renewTime: microDateStr
        }
      }
      expect(mergePatchStub).toBeCalledWith(namespace, leaseName, expectedBody)
    })
  })

  describe('verifier', () => {
    let hmacDigestStub
    let hmacUpdateStub
    const fakeSignature = crypto.randomBytes(32).toString('hex')
    const req = {
      headers: {
        'x-hub-signature-256': `sha256=${fakeSignature}`,
      },
    }
    const fakeBody = JSON.stringify({ some: 'body' })

    const hmacStub = jest.spyOn(crypto, 'createHmac')
    const { verify } = require('../lib/github/webhookParser')

    beforeAll(() => {
      hmacUpdateStub = jest.fn()
      hmacDigestStub = jest.fn()
      hmacStub.mockReturnValue({
        update: hmacUpdateStub
      })
      hmacUpdateStub.mockReturnValue({
        digest: hmacDigestStub
      })
    })

    it('should succeed if signatures match', () => {
      hmacDigestStub.mockReturnValueOnce(fakeSignature)

      expect(() => verify(req, {}, fakeBody)).not.toThrow()
      expect(hmacStub).toBeCalledWith('sha256', config.gitHub.webhookSecret)
      expect(hmacUpdateStub).toBeCalledWith(fakeBody)
      expect(hmacDigestStub).toBeCalledWith('hex')
    })

    it('should fail in case of an invalid signature', () => {
      hmacDigestStub.mockReturnValueOnce('invalid-signature')

      expect(() => verify(req, {}, fakeBody)).toThrow()
      expect(hmacStub).toBeCalledWith('sha256', config.gitHub.webhookSecret)
      expect(hmacUpdateStub).toBeCalledWith(fakeBody)
      expect(hmacDigestStub).toBeCalledWith('hex')
    })

    it('should fail if webhookSecret is not configured', () => {
      const gitHubConfig = config.gitHub
      Object.defineProperty(config, 'gitHub', { value: {} })

      let thrownError = null;
      try {
        verify(req, {}, fakeBody)
      } catch (err) {
        thrownError = err
      }

      expect(thrownError).not.toBeFalsy()
      expect(thrownError.message).toEqual("Property 'gitHub.webhookSecret' not configured on dashboard backend")
      expect(thrownError.status).toEqual(500)

      Object.defineProperty(config, 'gitHub', { value: gitHubConfig })
    })

    it('should fail if signature is missing', () => {
      let thrownError = null;
      try {
        verify({ headers: {} }, {}, fakeBody)
      } catch (err) {
        thrownError = err
      }

      expect(thrownError).not.toBeFalsy()
      expect(thrownError.message).toEqual("Header 'x-hub-signature-256' not provided")
      expect(thrownError.status).toEqual(403)
    })
  })
})
