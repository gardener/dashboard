//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')

describe('security', function () {
  const createJose = require('../lib/security/jose')
  describe('jose', function () {
    const secret1 = Buffer.from('this-is-a-secret-only-used-for-tests').toString('base64')
    const secret2 = Buffer.from('another-secret-for-testing-purposes').toString('base64')

    const value = 'hello world'

    it('should throw an error when no session secrets are provided', function () {
      expect(() => createJose()).toThrow('No session secrets provided')
      expect(() => createJose([])).toThrow('No session secrets provided')
    })

    describe('with a single valid secret', function () {
      const jose = createJose([secret1])

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

    describe('with multiple valid secrets', function () {
      const jose = createJose([secret1, secret2])

      it('should encrypt a value and decrypt it with the first secret', async function () {
        const encryptedValue = await jose.encrypt(value)
        const decryptedValue = await jose.decrypt(encryptedValue)
        expect(decryptedValue).toBe(value)
      })

      it('should encrypt a value and decrypt it with the second secret', async function () {
        const encryptedValue = await jose.encrypt(value)
        const decryptedValue = await jose.decrypt(encryptedValue)
        expect(decryptedValue).toBe(value)
      })

      it('should sign a token with different secrets and verify them', async function () {
        const payload = { sub: 'user123' }
        const token1 = await jose.sign(payload, secret1)
        const token2 = await jose.sign(payload, secret2)

        // Verify that the signatures are different
        expect(token1).not.toBe(token2)

        // Verify the tokens with their respective secrets
        const verifiedPayload1 = await jose.verify(token1)
        expect(verifiedPayload1).toEqual(expect.objectContaining(payload))

        const verifiedPayload2 = await jose.verify(token2)
        expect(verifiedPayload2).toEqual(expect.objectContaining(payload))
      })
    })

    describe('with an invalid secret', function () {
      const invalidSecret = Buffer.from('this-secret-is-not-part-of-session-secrets').toString('base64')
      const jose = createJose([secret1, secret2])

      it('should fail to verify a token signed with a secret not part of the session secrets', async function () {
        const payload = { sub: 'user789' }
        const token = await jose.sign(payload, invalidSecret)

        await expect(jose.verify(token)).rejects.toThrow('invalid signature')
      })
    })
  })

  describe('openid-client', () => {
    const redirectUrl = new URL('/account', 'https://localhost:8443')
    const sub = 'john.doe@example.org'
    const expiresIn = 3600

    let config
    let authentication
    let authorization
    let security
    let jose
    let issuer
    let client

    let mockGetIssuerClient
    let mockState
    let mockCodeVerifier
    let mockCodeChallenge
    let mockRefresh
    let mockIsAuthenticated
    let mockIsAdmin

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
        authorization = require('../lib/services/authorization')
        jose = createJose(config.sessionSecrets)
        security = require('../lib/security')
      })
      const issuerUrl = config.oidc.issuer
      issuer = new openidClient.Issuer({
        issuer: issuerUrl,
        authorization_endpoint: issuerUrl + '/oauth2/authorize',
        token_endpoint: issuerUrl + '/oauth2/token',
        jwks_uri: issuerUrl + '/oauth2/jwks',
        code_challenge_methods_supported: ['S256', 'plain'],
      })
      client = new issuer.Client({
        client_id: config.oidc.client_id,
        client_secret: config.oidc.client_secret,
      })
      mockGetIssuerClient = jest.spyOn(security, 'getIssuerClient').mockResolvedValue(client)
      mockRefresh = jest.spyOn(client, 'refresh').mockImplementation(async () => {
        const iat = now()
        const idToken = await jose.sign({ iat, sub }, { expiresIn })
        return {
          id_token: idToken,
          expires_at: iat + expiresIn,
          refresh_token: 'new-refresh-token',
        }
      })
      mockState = jest.spyOn(openidClient.generators, 'state').mockReturnValue('state')
      mockCodeVerifier = jest.spyOn(openidClient.generators, 'codeVerifier').mockReturnValue('code-verifier')
      mockCodeChallenge = jest.spyOn(openidClient.generators, 'codeChallenge').mockReturnValue('code-challenge')
      mockIsAuthenticated = jest.spyOn(authentication, 'isAuthenticated').mockResolvedValue({ username: sub, groups: [] })
      mockIsAdmin = jest.spyOn(authorization, 'isAdmin').mockResolvedValue(false)
    }

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should return an authorization url with PKCE flow', async () => {
      const scope = 'oidc email groups profile offline_access'
      mockSecurity({ oidc: { scope, usePKCE: true } })
      const query = {
        redirectUrl: redirectUrl.toString(),
      }
      const req = { query }
      const res = {
        cookie: jest.fn(),
      }
      const authorizationUrl = await security.authorizationUrl(req, res)
      const url = new URL(authorizationUrl)
      expect(mockGetIssuerClient).toHaveBeenCalledTimes(1)
      expect(mockState).toHaveBeenCalledTimes(1)
      expect(mockCodeVerifier).toHaveBeenCalledTimes(1)
      expect(mockCodeChallenge).toHaveBeenCalledTimes(1)
      expect(mockCodeChallenge.mock.calls[0]).toEqual(['code-verifier'])
      expect(res.cookie).toHaveBeenCalledTimes(2)
      expect(res.cookie.mock.calls).toEqual([
        [
          '__Host-gStt',
          {
            redirectOrigin: redirectUrl.origin,
            redirectPath: redirectUrl.pathname,
            state: 'state',
          },
          {
            httpOnly: true,
            maxAge: 180000,
            sameSite: 'Lax',
            secure: true,
          },
        ],
        [
          '__Host-gCdVrfr',
          'code-verifier',
          {
            httpOnly: true,
            maxAge: 180000,
            sameSite: 'Lax',
            secure: true,
          },
        ],
      ])
      expect(url.origin).toBe(config.oidc.issuer)
      const params = Object.fromEntries(url.searchParams)
      expect(params).toEqual(expect.objectContaining({
        client_id: config.oidc.client_id,
        scope,
        response_type: 'code',
        redirect_uri: redirectUrl.origin + '/auth/callback',
        state: 'state',
        code_challenge: 'code-challenge',
        code_challenge_method: 'S256',
      }))
    })

    it('should refesh an expired token', async () => {
      mockSecurity({ oidc: { scope: 'openid email' } })
      const {
        COOKIE_HEADER_PAYLOAD,
        COOKIE_SIGNATURE,
        COOKIE_TOKEN,
      } = security
      const sub = 'john.doe@example.org'
      const iat = now()
      const idTokenPayload = {
        iat,
        sub,
        exp: iat - 60,
      }
      const accessTokenPayload = {
        iat,
        id: sub,
        exp: iat + 24 * expiresIn,
        refresh_at: idTokenPayload.exp,
        aud: ['gardener'],
      }
      const idToken = await jose.sign(idTokenPayload)
      const accessToken = await jose.sign(accessTokenPayload)
      const refreshToken = 'refresh-token'
      const [header, payload, signature] = accessToken.split('.')
      const encryptedValues = await jose.encrypt([idToken, refreshToken].join(','))
      const req = {
        headers: {
          'x-requested-with': 'XMLHttpRequest',
        },
        cookies: {
          [COOKIE_HEADER_PAYLOAD]: [header, payload].join('.'),
          [COOKIE_SIGNATURE]: signature,
          [COOKIE_TOKEN]: encryptedValues,
        },
      }
      const res = {
        cookie: jest.fn(),
        clearCookie: jest.fn(),
      }
      const user = await security.refreshToken(req, res)

      expect(mockGetIssuerClient).toHaveBeenCalledTimes(1)
      expect(mockRefresh).toHaveBeenCalledTimes(1)
      expect(mockRefresh.mock.calls[0]).toEqual([refreshToken])
      expect(mockRefresh.mock.results[0].value).toBeInstanceOf(Promise)
      const tokenSet = await mockRefresh.mock.results[0].value
      expect(tokenSet).toEqual(expect.objectContaining({
        id_token: expect.stringMatching(/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/),
        expires_at: expect.any(Number),
        refresh_token: 'new-refresh-token',
      }))
      expect(mockIsAuthenticated).toHaveBeenCalledTimes(1)
      expect(mockIsAuthenticated.mock.calls[0]).toEqual([{
        token: tokenSet.id_token,
      }])
      expect(mockIsAdmin).toHaveBeenCalledTimes(1)
      expect(mockIsAdmin.mock.calls[0]).toEqual([{
        auth: { bearer: tokenSet.id_token },
      }])
      expect(user).toEqual({
        iat: expect.toBeWithinRange(iat, iat + 5),
        jti: expect.stringMatching(/^[a-z0-9-]+$/),
        id: sub,
        groups: [],
        aud: ['gardener'],
        exp: accessTokenPayload.exp,
        refresh_at: security.decode(tokenSet.id_token).exp,
        rti: expect.stringMatching(/^[a-z0-9]{7}$/),
        isAdmin: false,
      })

      expect(res.clearCookie).not.toHaveBeenCalled()
      expect(res.cookie).toHaveBeenCalledTimes(3)
      expect(res.cookie.mock.calls).toEqual([
        [
          COOKIE_HEADER_PAYLOAD,
          expect.stringMatching(/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/),
          { secure: true, expires: undefined, sameSite: 'Lax' },
        ],
        [
          COOKIE_SIGNATURE,
          expect.stringMatching(/^[a-zA-Z0-9_-]{43}$/),
          { secure: true, httpOnly: true, expires: undefined, sameSite: 'Lax' },
        ],
        [
          COOKIE_TOKEN,
          expect.stringMatching(/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/),
          { secure: true, httpOnly: true, expires: undefined, sameSite: 'Lax' },
        ],
      ])
    })
  })
})
