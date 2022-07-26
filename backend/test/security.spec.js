//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')

describe('security', function () {
  describe('jose', function () {
    const secret = Buffer.from('this-is-a-secret-only-used-for-tests').toString('base64')
    const jose = require('../lib/security/jose')(secret)

    const value = 'hello world'

    it('should encrypt a value', async function () {
      const encryptedValue = await jose.encrypt(value)
      const decryptedValue = await jose.decrypt(encryptedValue)
      expect(decryptedValue).toBe(value)
    })

    it('should decrypt a value', async function () {
      const encryptedValue = 'eyJlbmMiOiJBMTI4Q0JDLUhTMjU2IiwiYWxnIjoiUEJFUzItSFMyNTYrQTEyOEtXIiwicDJjIjozMTQ5LCJwMnMiOiIwenZfczdqbl9kcVBJOER2czQ3WWNRIn0.7Uh_sBteoCt2jlVBR87w00tuFuUqQfEhsXJ7jigqKZoEc5n2tw_h5A.adbP15XHdzAWCpzGCGYnXA.zVhhD1iRqJ-JnoIbyj-HeA.neL8L8Vtcgue-a8PYS4zCQ'
      const decryptedValue = await jose.decrypt(encryptedValue)
      expect(decryptedValue).toBe(value)
    })
  })

  describe('openid-client', () => {
    const redirectUrl = new URL('/account', 'http://localhost:8080')
    const sub = 'john.doe@example.org'
    const expiresIn = 3600

    let config
    let authentication
    let security
    let jose
    let issuer
    let client

    let mockGetIssuerClient
    let mockCodeVerifier
    let mockCodeChallenge
    let mockRefresh
    let mockIsAuthenticated

    const now = () => Math.floor(Date.now() / 1000)

    const mockSecurity = options => {
      config = _
        .chain(fixtures.config.default)
        .cloneDeep()
        .merge(options)
        .value()
      let openidClient
      jest.isolateModules(() => {
        require('../lib/config/gardener').readConfig.mockReturnValue(config)
        openidClient = require('openid-client')
        authentication = require('../lib/services/authentication')
        jose = require('../lib/security/jose')(config.sessionSecret)
        security = require('../lib/security')
      })
      const issuerUrl = config.oidc.issuer
      issuer = new openidClient.Issuer({
        issuer: issuerUrl,
        authorization_endpoint: issuerUrl + '/oauth2/authorize',
        token_endpoint: issuerUrl + '/oauth2/token',
        jwks_uri: issuerUrl + '/oauth2/jwks',
        code_challenge_methods_supported: ['S256', 'plain']
      })
      client = new issuer.Client({
        client_id: config.oidc.client_id,
        client_secret: config.oidc.client_secret
      })
      mockGetIssuerClient = jest.spyOn(security, 'getIssuerClient').mockResolvedValue(client)
      mockRefresh = jest.spyOn(client, 'refresh').mockImplementation(async () => {
        const idToken = await jose.sign({ sub }, { expiresIn })
        return {
          id_token: idToken,
          expires_at: now() + expiresIn,
          refresh_token: 'refresh-token'
        }
      })
      mockCodeVerifier = jest.spyOn(openidClient.generators, 'codeVerifier').mockReturnValue('code-verifier')
      mockCodeChallenge = jest.spyOn(openidClient.generators, 'codeChallenge').mockReturnValue('code-challenge')
      mockIsAuthenticated = jest.spyOn(authentication, 'isAuthenticated').mockResolvedValue({ username: sub, groups: [] })
    }

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should return an authorization url with PKCE flow', async () => {
      const scope = 'oidc email groups profile offline_access'
      mockSecurity({ oidc: { scope, usePKCE: true } })
      const query = {
        redirectUrl: redirectUrl.toString()
      }
      const req = { query }
      const res = {
        cookie: jest.fn()
      }
      const authorizationUrl = await security.authorizationUrl(req, res)
      const url = new URL(authorizationUrl)
      expect(mockGetIssuerClient).toBeCalledTimes(1)
      expect(mockCodeVerifier).toBeCalledTimes(1)
      expect(mockCodeChallenge).toBeCalledTimes(1)
      expect(mockCodeChallenge.mock.calls[0]).toEqual(['code-verifier'])
      expect(res.cookie).toBeCalledTimes(1)
      expect(res.cookie.mock.calls[0]).toEqual([
        'gCdVrfr',
        'code-verifier',
        {
          httpOnly: true,
          maxAge: 300000,
          path: '/auth/callback',
          sameSite: 'Lax',
          secure: false
        }
      ])
      expect(url.origin).toBe(config.oidc.issuer)
      const params = Object.fromEntries(url.searchParams)
      expect(security.decodeState(params.state)).toEqual({
        redirectOrigin: redirectUrl.origin,
        redirectPath: redirectUrl.pathname
      })
      expect(params).toEqual(expect.objectContaining({
        client_id: config.oidc.client_id,
        scope,
        response_type: 'code',
        redirect_uri: redirectUrl.origin + '/auth/callback',
        state: expect.any(String),
        code_challenge: 'code-challenge',
        code_challenge_method: 'S256'
      }))
    })

    it('should refesh an expired token', async () => {
      mockSecurity({ oidc: { scope: 'openid email' } })
      const {
        COOKIE_HEADER_PAYLOAD,
        COOKIE_SIGNATURE,
        COOKIE_TOKEN
      } = security
      const createClient = jest.fn()
      const authenticate = security.authenticate({ createClient })
      const exp = now() - 3600
      const idToken = await jose.sign({ sub: 'john.doe@example.org', exp })
      const encryptedValues = await jose.encrypt([idToken, exp, 'refresh-token'].join(','))
      const req = {
        headers: {
          'x-requested-with': 'XMLHttpRequest'
        },
        cookies: {
          [COOKIE_HEADER_PAYLOAD]: 'a.b',
          [COOKIE_SIGNATURE]: 'c',
          [COOKIE_TOKEN]: encryptedValues
        }
      }
      const res = {
        cookie: jest.fn(),
        clearCookie: jest.fn()
      }
      const next = jest.fn()
      await authenticate(req, res, next)
      expect(mockGetIssuerClient).toBeCalledTimes(1)
      expect(mockRefresh).toBeCalledTimes(1)
      expect(mockRefresh.mock.calls[0]).toEqual(['refresh-token'])
      const tokenSet = await mockRefresh.mock.results[0].value
      expect(mockIsAuthenticated).toBeCalledTimes(1)
      expect(mockIsAuthenticated.mock.calls[0]).toEqual([{
        token: tokenSet.id_token
      }])
      expect(req.user).toEqual({
        jti: expect.stringMatching(/^[a-z0-9-]{36}$/),
        id: sub,
        groups: [],
        iat: expect.any(Number),
        exp: expect.any(Number),
        aud: ['gardener'],
        auth: {
          bearer: expect.stringMatching(/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]{43}$/)
        }
      })
      expect(res.cookie).toBeCalledTimes(3)
      expect(res.cookie.mock.calls).toEqual([
        [
          COOKIE_HEADER_PAYLOAD,
          expect.stringMatching(/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/),
          { secure: false, expires: undefined, sameSite: 'Lax' }
        ],
        [
          COOKIE_SIGNATURE,
          expect.stringMatching(/^[a-zA-Z0-9_-]{43}$/),
          { secure: false, httpOnly: true, expires: undefined, sameSite: 'Lax' }
        ],
        [
          COOKIE_TOKEN,
          expect.stringMatching(/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/),
          { secure: false, httpOnly: true, expires: undefined, sameSite: 'Lax' }
        ]
      ])
      expect(next).toBeCalledTimes(1)
      expect(next.mock.calls[0]).toEqual([])
    })
  })
})
