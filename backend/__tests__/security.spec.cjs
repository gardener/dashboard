//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')

describe('security', function () {
  const createJose = require('../dist/lib/security/jose')

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

    let undici
    let config
    let authentication
    let authorization
    let security
    let jose

    let discovery
    let buildAuthorizationUrl
    let authorizationCodeGrant
    let refreshTokenGrant
    let randomState
    let randomPKCECodeVerifier
    let calculatePKCECodeChallenge
    let allowInsecureRequestsMock
    let customFetch

    let mockOpenidClient

    const mockSecurity = options => {
      discovery = jest.fn()
      buildAuthorizationUrl = jest.fn()
      authorizationCodeGrant = jest.fn()
      refreshTokenGrant = jest.fn()
      randomState = jest.fn()
      randomPKCECodeVerifier = jest.fn()
      calculatePKCECodeChallenge = jest.fn()
      allowInsecureRequestsMock = jest.fn()
      customFetch = Symbol('customFetch')
      mockOpenidClient = {
        discovery,
        buildAuthorizationUrl,
        authorizationCodeGrant,
        refreshTokenGrant,
        randomState,
        randomPKCECodeVerifier,
        calculatePKCECodeChallenge,
        allowInsecureRequestsMock,
        customFetch,
      }
      mockOpenidClient.allowInsecureRequests = allowInsecureRequestsMock

      config = _.merge({}, fixtures.config.default, options)
      jest.isolateModules(() => {
        jest.mock('undici', () => ({
          Agent: jest.fn().mockImplementation((options) => ({ options })),
        }))
        require('../dist/lib/config/gardener').readConfig.mockReturnValue(config)
        jest.mock('../dist/lib/services/authentication', () => ({
          isAuthenticated: jest.fn(),
        }))
        jest.mock('../dist/lib/services/authorization', () => ({
          isAdmin: jest.fn(),
        }))
        undici = require('undici')
        authentication = require('../dist/lib/services/authentication')
        authorization = require('../dist/lib/services/authorization')
        security = require('../dist/lib/security')
        jose = createJose(config.sessionSecrets)
      })
      security.openidClientPromise = Promise.resolve(mockOpenidClient)
    }

    beforeEach(() => {
      jest.clearAllMocks()
    })

    describe('authorizationUrl', () => {
      it('should return an authorization url with PKCE flow (preferring S256)', async () => {
        const scope = 'oidc email groups profile offline_access'
        mockSecurity({ oidc: { scope, usePKCE: true, client_secret: 'client_secret' } })
        discovery.mockResolvedValue({
          code_challenge_methods_supported: ['S256', 'plain'],
        })
        buildAuthorizationUrl.mockReturnValue(
          'https://issuer.example.org/oauth2/authorize?client_id=my-client-id&...',
        )
        randomState.mockReturnValue('state')
        randomPKCECodeVerifier.mockReturnValue('code-verifier')
        calculatePKCECodeChallenge.mockResolvedValue('code-challenge')

        const query = {
          redirectUrl: redirectUrl.toString(),
        }
        const req = { query }
        const res = { cookie: jest.fn() }

        // Act
        const authorizationUrl = await security.authorizationUrl(req, res)

        // Assert
        expect(discovery).toHaveBeenCalledTimes(1)
        expect(discovery).toHaveBeenCalledWith(
          expect.objectContaining({
            href: 'https://kubernetes:32001/',
          }),
          'dashboard',
          {
            clockTolerance: 42,
            client_secret: 'client_secret',
          },
          undefined, // clientAuthentication
          {
            [customFetch]: expect.any(Function),
          },
        )
        expect(randomState).toHaveBeenCalledTimes(1)
        expect(randomPKCECodeVerifier).toHaveBeenCalledTimes(1)
        expect(calculatePKCECodeChallenge).toHaveBeenCalledWith('code-verifier')
        expect(buildAuthorizationUrl).toHaveBeenCalledTimes(1)
        const [openidConfig, params] = buildAuthorizationUrl.mock.calls[0]
        expect(openidConfig).toMatchObject({
          code_challenge_methods_supported: ['S256', 'plain'],
        })
        expect(params).toMatchObject({
          redirect_uri: 'https://localhost:8443/auth/callback',
          state: 'state',
          scope: config.oidc.scope,
          code_challenge: 'code-challenge',
          code_challenge_method: 'S256',
        })

        expect(authorizationUrl).toBe(
          'https://issuer.example.org/oauth2/authorize?client_id=my-client-id&...',
        )
        expect(res.cookie).toHaveBeenCalledTimes(2)
        expect(res.cookie.mock.calls).toEqual([
          [
            '__Host-gStt',
            {
              redirectOrigin: 'https://localhost:8443',
              redirectPath: '/account',
              state: 'state',
            },
            { httpOnly: true, maxAge: 180000, sameSite: 'Lax', secure: true },
          ],
          [
            '__Host-gCdVrfr',
            'code-verifier',
            { httpOnly: true, maxAge: 180000, sameSite: 'Lax', secure: true },
          ],
        ])
      })

      it('should return an authorization url with PKCE flow (plain only)', async () => {
        // Here we only provide 'plain' in code_challenge_methods_supported
        mockSecurity({ oidc: { usePKCE: true } })
        discovery.mockResolvedValue({
          code_challenge_methods_supported: ['plain'],
        })
        buildAuthorizationUrl.mockReturnValue(
          'https://issuer.example.org/oauth2/authorize?client_id=my-client-id&...',
        )
        randomState.mockReturnValue('state')
        randomPKCECodeVerifier.mockReturnValue('code-verifier')

        const query = {
          redirectUrl: redirectUrl.toString(),
        }
        const req = { query }
        const res = { cookie: jest.fn() }

        // Act
        const authorizationUrl = await security.authorizationUrl(req, res)

        // Assert
        expect(calculatePKCECodeChallenge).not.toHaveBeenCalled() // For "plain" method, no hashed code challenge is required
        const [, params] = buildAuthorizationUrl.mock.calls[0]
        expect(params).toMatchObject({
          code_challenge: 'code-verifier',
        })
        expect(authorizationUrl).toBe(
          'https://issuer.example.org/oauth2/authorize?client_id=my-client-id&...',
        )
        expect(res.cookie).toHaveBeenCalledTimes(2)
        expect(res.cookie.mock.calls).toEqual([
          [
            '__Host-gStt',
            {
              redirectOrigin: 'https://localhost:8443',
              redirectPath: '/account',
              state: 'state',
            },
            { httpOnly: true, maxAge: 180000, sameSite: 'Lax', secure: true },
          ],
          [
            '__Host-gCdVrfr',
            'code-verifier',
            { httpOnly: true, maxAge: 180000, sameSite: 'Lax', secure: true },
          ],
        ])
      })

      it('should throw a 500 error if neither S256 nor plain are supported', async () => {
        mockSecurity({ oidc: { usePKCE: true } })
        // Provide something that doesn't include S256 or plain
        discovery.mockResolvedValue({
          code_challenge_methods_supported: ['unsupported1', 'unsupported2'],
        })
        buildAuthorizationUrl.mockReturnValue('should not be called')
        randomState.mockReturnValue('state')
        randomPKCECodeVerifier.mockReturnValue('code-verifier')
        calculatePKCECodeChallenge.mockResolvedValue('code-challenge')

        const query = {
          redirectUrl: redirectUrl.toString(),
        }
        const req = { query }
        const res = { cookie: jest.fn() }

        // Act & Assert
        await expect(async () => {
          await security.authorizationUrl(req, res)
        }).rejects.toThrow(
          'neither code_challenge_method supported by the client is supported by the issuer',
        )

        expect(buildAuthorizationUrl).not.toHaveBeenCalled()
        expect(res.cookie).toHaveBeenCalledTimes(1)
        expect(res.cookie.mock.calls[0]).toEqual([
          '__Host-gStt',
          {
            redirectOrigin: 'https://localhost:8443',
            redirectPath: '/account',
            state: 'state',
          },
          { httpOnly: true, maxAge: 180000, sameSite: 'Lax', secure: true },
        ])
      })

      it('throws a 400 error if the redirectUrl is not in the configured redirectUris', async () => {
        mockSecurity()
        const req = {
          query: {
            redirectUrl: 'https://disallowed.example.com/somepath',
          },
        }
        const res = { cookie: jest.fn() }

        // Act & Assert
        await expect(async () => {
          await security.authorizationUrl(req, res)
        }).rejects.toThrow(
          "The 'redirectUrl' parameter must match a redirect URI in the settings",
        )
        expect(res.cookie).not.toHaveBeenCalled()
      })
    })

    describe('refreshToken', () => {
      it('should refresh an expired token', async () => {
        mockSecurity({ oidc: { scope: 'openid email' } })
        discovery.mockResolvedValue({
          code_challenge_methods_supported: 'does-not-matter',
        })
        const { refreshToken } = security

        authentication.isAuthenticated.mockResolvedValue({ username: sub, groups: [] })
        authorization.isAdmin.mockResolvedValue(false)

        // Create an expired ID token and an access token
        const iat = Math.floor(Date.now() / 1000) - 3600
        const expiresIn = 3600
        const oldIdTokenPayload = {
          sub,
          iat,
          exp: iat - 60,
        }
        const oldIdToken = await jose.sign(oldIdTokenPayload)
        const oldRefreshToken = 'refresh-token'

        const oldAccessTokenPayload = {
          iat,
          id: sub,
          exp: iat + 24 * expiresIn,
          refresh_at: oldIdTokenPayload.exp,
          aud: ['gardener'],
        }
        const oldAccessToken = await jose.sign(oldAccessTokenPayload)

        // The cookies: we split the header/payload and signature
        const [header, payload, signature] = oldAccessToken.split('.')
        const encryptedValues = await jose.encrypt([oldIdToken, oldRefreshToken].join(','))

        const req = {
          method: 'POST',
          headers: {
            'x-requested-with': 'XMLHttpRequest', // for CSRF check
          },
          cookies: {
            '__Host-gHdrPyl': `${header}.${payload}`,
            '__Host-gSgn': signature,
            '__Host-gTkn': encryptedValues,
          },
        }
        const res = {
          cookie: jest.fn(),
          clearCookie: jest.fn(),
        }

        // Mock refreshTokenGrant so it returns a new token set
        refreshTokenGrant.mockImplementation(async () => {
          const iat = Math.floor(Date.now() / 1000)
          return {
            id_token: await jose.sign({ iat, sub }, { expiresIn }),
            expires_at: iat + expiresIn,
            refresh_token: 'new-refresh-token',
          }
        })

        // Act
        const user = await refreshToken(req, res)

        // Assert
        expect(discovery).toHaveBeenCalledTimes(1)
        expect(refreshTokenGrant).toHaveBeenCalledTimes(1)
        expect(refreshTokenGrant).toHaveBeenCalledWith(
          {
            code_challenge_methods_supported: 'does-not-matter',
          },
          oldRefreshToken,
        )

        // isAuthenticated/isAdmin should be invoked with new ID token
        expect(authentication.isAuthenticated).toHaveBeenCalledTimes(1)
        expect(authorization.isAdmin).toHaveBeenCalledTimes(1)

        // Should set new cookies with new tokens
        expect(res.clearCookie).not.toHaveBeenCalled()
        expect(res.cookie).toHaveBeenCalledTimes(3)
        expect(res.cookie.mock.calls).toEqual([
          [
            '__Host-gHdrPyl',
            expect.stringMatching(/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/),
            { secure: true, expires: undefined, sameSite: 'Lax' },
          ],
          [
            '__Host-gSgn',
            expect.stringMatching(/^[a-zA-Z0-9_-]{43}$/),
            { secure: true, httpOnly: true, expires: undefined, sameSite: 'Lax' },
          ],
          [
            '__Host-gTkn',
            expect.stringMatching(
              /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/,
            ),
            { secure: true, httpOnly: true, expires: undefined, sameSite: 'Lax' },
          ],
        ])

        // User object returned by refreshToken
        expect(user).toEqual(
          expect.objectContaining({
            id: sub,
            groups: [],
            aud: ['gardener'],
            isAdmin: false,
          }),
        )
      })
    })

    describe('authorizationCallback', () => {
      it('should exchange the code and set cookies', async () => {
        mockSecurity()
        discovery.mockResolvedValue({ code_challenge_methods_supported: ['S256'] })
        authorizationCodeGrant.mockResolvedValue({
          id_token: 'new-id-token',
          expires_at: Date.now() + 60,
          refresh_token: 'new-refresh-token',
        })
        authentication.isAuthenticated.mockResolvedValue({ username: sub, groups: [] })
        authorization.isAdmin.mockResolvedValue(false)

        const req = {
          originalUrl: '/auth/callback?code=some-code',
          cookies: {
            '__Host-gStt': {
              redirectOrigin: 'https://localhost:8443',
              redirectPath: '/account',
              state: 'some-state',
            },
            '__Host-gCdVrfr': 'pkce-code-verifier',
          },
        }
        const res = {
          cookie: jest.fn(),
          clearCookie: jest.fn(),
        }

        // Act
        const { redirectPath } = await security.authorizationCallback(req, res)

        // Assert
        expect(redirectPath).toBe('/account')
        expect(authorizationCodeGrant).toHaveBeenCalledTimes(1)
        expect(authorizationCodeGrant).toHaveBeenCalledWith(
          expect.any(Object),
          new URL('/auth/callback?code=some-code', 'https://localhost:8443'),
          {
            idTokenExpected: true,
            expectedState: 'some-state',
            pkceCodeVerifier: 'pkce-code-verifier',
          },
        )
        // __Host-gStt and __Host-gCdVrfr should be cleared
        expect(res.clearCookie).toHaveBeenCalledWith('__Host-gStt', { secure: true, path: '/' })
        expect(res.clearCookie).toHaveBeenCalledWith('__Host-gCdVrfr', { secure: true, path: '/' })
        // New cookies should be set by setCookies
        expect(res.cookie).toHaveBeenCalled()
      })

      it('should throw 401 and clear cookies if authorizationCodeGrant fails', async () => {
        mockSecurity()
        discovery.mockResolvedValue({ code_challenge_methods_supported: ['S256'] })
        authorizationCodeGrant.mockRejectedValue(new Error('code exchange failed'))

        const req = {
          originalUrl: '/auth/callback?code=some-code',
          cookies: {
            '__Host-gStt': {
              redirectOrigin: 'https://localhost:8443',
              redirectPath: '/account',
              state: 'another-state',
            },
            '__Host-gCdVrfr': 'pkce-code-verifier',
          },
        }
        const res = {
          cookie: jest.fn(),
          clearCookie: jest.fn(),
        }

        await expect(async () => {
          await security.authorizationCallback(req, res)
        }).rejects.toThrow('code exchange failed')

        expect(res.clearCookie).toHaveBeenCalledWith('__Host-gStt', { secure: true, path: '/' })
        expect(res.clearCookie).toHaveBeenCalledWith('__Host-gCdVrfr', { secure: true, path: '/' })
        // No cookies should be set if the exchange fails
        expect(res.cookie).not.toHaveBeenCalled()
      })

      it('should throw 400 if the redirectPath is from a different (untrusted) origin', async () => {
        mockSecurity()
        discovery.mockResolvedValue({ code_challenge_methods_supported: ['S256'] })
        authentication.isAuthenticated.mockResolvedValue({ username: sub, groups: [] })
        authorization.isAdmin.mockResolvedValue(false)

        const req = {
          originalUrl: '/auth/callback?code=some-code',
          cookies: {
            '__Host-gStt': {
              redirectOrigin: 'https://localhost:8443',
              redirectPath: 'https://127.0.0.1/account', // <-- Different origin
              state: 'some-state',
            },
            '__Host-gCdVrfr': 'pkce-code-verifier',
          },
        }
        const res = {
          cookie: jest.fn(),
          clearCookie: jest.fn(),
        }

        await expect(async () => {
          await security.authorizationCallback(req, res)
        }).rejects.toThrow('Invalid redirect path')

        // __Host-gStt and __Host-gCdVrfr should be cleared
        expect(res.clearCookie).toHaveBeenCalledWith('__Host-gStt', { secure: true, path: '/' })
        expect(res.clearCookie).toHaveBeenCalledWith('__Host-gCdVrfr', { secure: true, path: '/' })
        // No new cookies should be set
        expect(res.cookie).not.toHaveBeenCalled()
      })
    })

    describe('authorizationCallback', () => {
      it('should throw 400 error if redirectPath has a mismatched origin', async () => {
        mockSecurity({})
        const { COOKIE_STATE } = security

        // Simulate a user state cookie that includes a redirectPath pointing to an unexpected domain
        const req = {
          cookies: {
            [COOKIE_STATE]: {
              redirectOrigin: 'https://localhost:8443',
              redirectPath: 'https://127.0.0.1/account', // <-- Different origin
              state: 'test-state',
            },
          },
        }

        const res = {
          cookie: jest.fn(),
          clearCookie: jest.fn(),
        }

        await expect(security.authorizationCallback(req, res))
          .rejects
          .toThrow('Invalid redirect path')

        expect(res.clearCookie).toHaveBeenCalledWith(COOKIE_STATE, expect.any(Object))
        expect(res.cookie).not.toHaveBeenCalled()
      })
    })

    describe('getConfiguration', () => {
      beforeEach(() => {
        undici.Agent.mockClear()
      })

      it('should use default TLS settings', async () => {
        mockSecurity({
          oidc: {
            issuer: 'https://issuer.example.org',
            ca: null,
          },
        })
        discovery.mockResolvedValue({ dummy: 'issuer-config' })

        const configResult = await security.getConfiguration()

        expect(discovery).toHaveBeenCalledTimes(1)
        expect(discovery).toHaveBeenCalledWith(
          expect.objectContaining({
            href: 'https://issuer.example.org/',
          }),
          'dashboard',
          {
            clockTolerance: 42,
          },
          undefined, // clientAuthentication
          {
            [customFetch]: expect.any(Function),
          },
        )

        // Verify that Agent was called with connect options including rejectUnauthorized: true.
        expect(undici.Agent).toHaveBeenCalledTimes(1)
        expect(undici.Agent).toHaveBeenCalledWith({
          connect: {
            rejectUnauthorized: true,
          },
        })

        expect(configResult).toEqual({ dummy: 'issuer-config' })
      })

      it('should use custom TLS settings and set execute when allowInsecure is true', async () => {
        const testCA = 'my-ca-cert'
        mockSecurity({
          oidc: {
            rejectUnauthorized: false,
            ca: testCA,
            allowInsecure: true, // -> "execute" should be set
          },
        })
        mockOpenidClient.allowInsecureRequests = allowInsecureRequestsMock

        discovery.mockResolvedValue({ dummy: 'issuer-config-2' })

        const configResult = await security.getConfiguration()

        expect(discovery).toHaveBeenCalledTimes(1)
        expect(discovery).toHaveBeenCalledWith(
          expect.objectContaining({
            href: 'https://kubernetes:32001/',
          }),
          'dashboard',
          {
            clockTolerance: 42,
          },
          undefined, // clientAuthentication
          {
            [customFetch]: expect.any(Function),
            execute: [allowInsecureRequestsMock],
          },
        )

        expect(undici.Agent).toHaveBeenCalledTimes(1)
        expect(undici.Agent).toHaveBeenCalledWith(
          expect.objectContaining({
            connect: {
              rejectUnauthorized: false,
              ca: testCA,
            },
          }),
        )

        expect(configResult).toEqual({ dummy: 'issuer-config-2' })
      })
    })
  })
})
