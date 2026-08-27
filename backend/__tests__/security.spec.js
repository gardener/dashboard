//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
} from 'vitest'
import { merge } from 'lodash-es'

const { default: createJose } = await import('../lib/security/jose.js')

describe('security', function () {
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
    const codeVerifier = 'a'.repeat(43)

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

    const mockSecurity = async (options) => {
      discovery = vi.fn()
      buildAuthorizationUrl = vi.fn()
      authorizationCodeGrant = vi.fn()
      refreshTokenGrant = vi.fn()
      randomState = vi.fn()
      randomPKCECodeVerifier = vi.fn()
      calculatePKCECodeChallenge = vi.fn()
      allowInsecureRequestsMock = vi.fn()
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

      config = merge({}, fixtures.config.default, options)

      vi.resetModules()

      const AgentMock = vi.fn().mockImplementation(function (options) {
        return { options }
      })
      vi.doMock('undici', () => ({
        default: {
          Agent: AgentMock,
        },
        Agent: AgentMock,
        fetch: vi.fn(),
      }))

      // Mock openid-client so security/index.js gets our mock when it does import('openid-client')
      vi.doMock('openid-client', () => mockOpenidClient)

      const { readConfig } = await import('../lib/config/gardener.js')
      readConfig.mockReturnValue(config)

      const isAuthenticatedMock = vi.fn()
      vi.doMock('../lib/services/authentication.js', () => ({
        default: {
          isAuthenticated: isAuthenticatedMock,
        },
        isAuthenticated: isAuthenticatedMock,
      }))
      const isAdminMock = vi.fn()
      const canListShootsMock = vi.fn()
      vi.doMock('../lib/services/authorization.js', () => ({
        default: {
          isAdmin: isAdminMock,
          canListShoots: canListShootsMock,
        },
        isAdmin: isAdminMock,
        canListShoots: canListShootsMock,
      }))

      const undiciMod = await import('undici')
      undici = undiciMod.default || undiciMod

      const authenticationMod = await import('../lib/services/authentication.js')
      authentication = authenticationMod.default || authenticationMod

      const authorizationMod = await import('../lib/services/authorization.js')
      authorization = authorizationMod.default || authorizationMod

      const securityMod = await import('../lib/security/index.js')
      security = securityMod.default || securityMod

      jose = createJose(config.sessionSecrets)
    }

    beforeEach(() => {
      vi.clearAllMocks()
    })

    describe('authorizationUrl', () => {
      it('should default to PKCE for a confidential client (preferring S256)', async () => {
        const scope = 'oidc email groups profile offline_access'
        await mockSecurity({ oidc: { scope, client_secret: 'client_secret' } })
        discovery.mockResolvedValue({
          code_challenge_methods_supported: ['S256', 'plain'],
        })
        buildAuthorizationUrl.mockReturnValue(
          'https://issuer.example.org/oauth2/authorize?client_id=my-client-id&...',
        )
        randomState.mockReturnValue('state')
        randomPKCECodeVerifier.mockReturnValue(codeVerifier)
        calculatePKCECodeChallenge.mockResolvedValue('code-challenge')

        const query = {
          redirectUrl: redirectUrl.toString(),
        }
        const req = { query }
        const res = { cookie: vi.fn() }

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
        expect(calculatePKCECodeChallenge).toHaveBeenCalledWith(codeVerifier)
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
            codeVerifier,
            { httpOnly: true, maxAge: 180000, sameSite: 'Lax', secure: true },
          ],
        ])
      })

      it('should return an authorization url with PKCE flow (plain only)', async () => {
        // Here we only provide 'plain' in code_challenge_methods_supported
        await mockSecurity({ oidc: { usePKCE: true } })
        discovery.mockResolvedValue({
          code_challenge_methods_supported: ['plain'],
        })
        buildAuthorizationUrl.mockReturnValue(
          'https://issuer.example.org/oauth2/authorize?client_id=my-client-id&...',
        )
        randomState.mockReturnValue('state')
        randomPKCECodeVerifier.mockReturnValue(codeVerifier)

        const query = {
          redirectUrl: redirectUrl.toString(),
        }
        const req = { query }
        const res = { cookie: vi.fn() }

        // Act
        const authorizationUrl = await security.authorizationUrl(req, res)

        // Assert
        expect(calculatePKCECodeChallenge).not.toHaveBeenCalled() // For "plain" method, no hashed code challenge is required
        const [, params] = buildAuthorizationUrl.mock.calls[0]
        expect(params).toMatchObject({
          code_challenge: codeVerifier,
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
            codeVerifier,
            { httpOnly: true, maxAge: 180000, sameSite: 'Lax', secure: true },
          ],
        ])
      })

      it('should throw a 500 error if neither S256 nor plain are supported', async () => {
        await mockSecurity({ oidc: { usePKCE: true } })
        // Provide something that doesn't include S256 or plain
        discovery.mockResolvedValue({
          code_challenge_methods_supported: ['unsupported1', 'unsupported2'],
        })
        buildAuthorizationUrl.mockReturnValue('should not be called')
        randomState.mockReturnValue('state')
        randomPKCECodeVerifier.mockReturnValue(codeVerifier)
        calculatePKCECodeChallenge.mockResolvedValue('code-challenge')

        const query = {
          redirectUrl: redirectUrl.toString(),
        }
        const req = { query }
        const res = { cookie: vi.fn() }

        // Act & Assert
        await expect(security.authorizationUrl(req, res)).rejects.toThrow(
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
        await mockSecurity()
        const req = {
          query: {
            redirectUrl: 'https://disallowed.example.com/somepath',
          },
        }
        const res = { cookie: vi.fn() }

        // Act & Assert
        await expect(security.authorizationUrl(req, res)).rejects.toThrow(
          "The 'redirectUrl' parameter must match a redirect URI in the settings",
        )
        expect(res.cookie).not.toHaveBeenCalled()
      })
    })

    describe('refreshToken', () => {
      it('should refresh an expired token', async () => {
        await mockSecurity({ oidc: { scope: 'openid email' } })
        discovery.mockResolvedValue({
          code_challenge_methods_supported: 'does-not-matter',
        })
        const { refreshToken } = security

        authentication.isAuthenticated.mockResolvedValue({ username: sub, groups: ['group-a', 'group-b'] })
        authorization.isAdmin.mockResolvedValue(false)
        authorization.canListShoots.mockResolvedValue(true)

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
          cookie: vi.fn(),
          clearCookie: vi.fn(),
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
            aud: ['gardener'],
            isAdmin: false,
            canListShootsAllNamespaces: true,
          }),
        )
        expect(Object.hasOwn(user, 'groups')).toBe(false)
      })
    })

    describe('authorizationCallback', () => {
      const validStateCookie = {
        redirectOrigin: 'https://localhost:8443',
        redirectPath: '/account',
        state: 'some-state',
      }
      const transactionCookieOptions = {
        secure: true,
        path: '/',
      }

      function createResponse () {
        return {
          cookie: vi.fn(),
          clearCookie: vi.fn(),
        }
      }

      function expectTransactionCookiesCleared (res) {
        expect(res.clearCookie.mock.calls).toEqual([
          ['__Host-gStt', transactionCookieOptions],
          ['__Host-gCdVrfr', transactionCookieOptions],
        ])
      }

      function expectNoSessionCreated (res) {
        expect(res.cookie).not.toHaveBeenCalled()
        expect(authentication.isAuthenticated).not.toHaveBeenCalled()
        expect(authorization.isAdmin).not.toHaveBeenCalled()
        expect(authorization.canListShoots).not.toHaveBeenCalled()
      }

      async function useOpenIdClientStateValidation () {
        const actualOpenidClient = await vi.importActual('openid-client')
        const tokenEndpointFetch = vi.fn()
        const openidConfiguration = new actualOpenidClient.Configuration({
          issuer: 'https://issuer.example.org',
          token_endpoint: 'https://issuer.example.org/token',
        }, config.oidc.client_id, {
          client_secret: 'client-secret',
        })
        openidConfiguration[actualOpenidClient.customFetch] = tokenEndpointFetch
        discovery.mockResolvedValue(openidConfiguration)
        authorizationCodeGrant.mockImplementation(actualOpenidClient.authorizationCodeGrant)
        return tokenEndpointFetch
      }

      it('rejects a missing state transaction cookie before code exchange', async () => {
        await mockSecurity()
        const req = {
          originalUrl: '/auth/callback?code=some-code&state=some-state',
          cookies: {},
        }
        const res = createResponse()

        await expect(security.authorizationCallback(req, res))
          .rejects
          .toThrow('Invalid OIDC state cookie')

        expect(discovery).not.toHaveBeenCalled()
        expect(authorizationCodeGrant).not.toHaveBeenCalled()
        expectNoSessionCreated(res)
        expectTransactionCookiesCleared(res)
      })

      it.each([
        ['null', null],
        ['a scalar string', 'some-state'],
        ['an empty object', {}],
        ['an empty state', { ...validStateCookie, state: '' }],
        ['a whitespace-only state', { ...validStateCookie, state: ' ' }],
        ['a non-string state', { ...validStateCookie, state: 42 }],
      ])('rejects a malformed state transaction cookie containing %s', async (description, stateCookie) => {
        await mockSecurity()
        const req = {
          originalUrl: '/auth/callback?code=some-code&state=some-state',
          cookies: {
            '__Host-gStt': stateCookie,
            '__Host-gCdVrfr': codeVerifier,
          },
        }
        const res = createResponse()

        await expect(security.authorizationCallback(req, res))
          .rejects
          .toThrow('Invalid OIDC state cookie')

        expect(discovery).not.toHaveBeenCalled()
        expect(authorizationCodeGrant).not.toHaveBeenCalled()
        expectNoSessionCreated(res)
        expectTransactionCookiesCleared(res)
      })

      it.each([
        ['missing', '/auth/callback?code=some-code'],
        ['mismatched', '/auth/callback?code=some-code&state=other-state'],
      ])('rejects a callback with %s state before a token endpoint request', async (description, originalUrl) => {
        await mockSecurity()
        const tokenEndpointFetch = await useOpenIdClientStateValidation()
        const req = {
          originalUrl,
          cookies: {
            '__Host-gStt': validStateCookie,
            '__Host-gCdVrfr': codeVerifier,
          },
        }
        const res = createResponse()

        await expect(security.authorizationCallback(req, res)).rejects.toThrow()

        expect(authorizationCodeGrant).toHaveBeenCalledTimes(1)
        expect(tokenEndpointFetch).not.toHaveBeenCalled()
        expectNoSessionCreated(res)
        expectTransactionCookiesCleared(res)
      })

      it.each([
        ['missing', undefined],
        ['empty', ''],
        ['null', null],
        ['non-string', 42],
        ['too short', 'short-verifier'],
        ['containing invalid characters', `${'a'.repeat(42)}!`],
      ])('rejects a %s PKCE verifier before code exchange', async (description, pkceCodeVerifier) => {
        await mockSecurity()
        const req = {
          originalUrl: '/auth/callback?code=some-code&state=some-state',
          cookies: {
            '__Host-gStt': validStateCookie,
            '__Host-gCdVrfr': pkceCodeVerifier,
          },
        }
        const res = createResponse()

        await expect(security.authorizationCallback(req, res))
          .rejects
          .toThrow('Invalid OIDC PKCE code verifier cookie')

        expect(discovery).not.toHaveBeenCalled()
        expect(authorizationCodeGrant).not.toHaveBeenCalled()
        expectNoSessionCreated(res)
        expectTransactionCookiesCleared(res)
      })

      it('exchanges a code with matching state and consumes the transaction cookies', async () => {
        await mockSecurity()
        discovery.mockResolvedValue({ code_challenge_methods_supported: ['S256'] })
        authorizationCodeGrant.mockResolvedValue({
          id_token: 'new-id-token',
          expires_at: Date.now() + 60,
          refresh_token: 'new-refresh-token',
        })
        authentication.isAuthenticated.mockResolvedValue({ username: sub, groups: [] })
        authorization.isAdmin.mockResolvedValue(false)
        authorization.canListShoots.mockResolvedValue(false)

        const req = {
          originalUrl: '/auth/callback?code=some-code&state=some-state',
          cookies: {
            '__Host-gStt': validStateCookie,
            '__Host-gCdVrfr': codeVerifier,
          },
        }
        const res = createResponse()

        const { redirectPath } = await security.authorizationCallback(req, res)

        expect(redirectPath).toBe('/account')
        expect(authorizationCodeGrant).toHaveBeenCalledTimes(1)
        expect(authorizationCodeGrant).toHaveBeenCalledWith(
          expect.any(Object),
          new URL('/auth/callback?code=some-code&state=some-state', 'https://localhost:8443'),
          {
            idTokenExpected: true,
            expectedState: 'some-state',
            pkceCodeVerifier: codeVerifier,
          },
        )
        expectTransactionCookiesCleared(res)
        expect(res.cookie).toHaveBeenCalledTimes(3)

        authorizationCodeGrant.mockClear()
        authentication.isAuthenticated.mockClear()
        authorization.isAdmin.mockClear()
        authorization.canListShoots.mockClear()
        const replayRes = createResponse()
        await expect(security.authorizationCallback({
          originalUrl: req.originalUrl,
          cookies: {},
        }, replayRes)).rejects.toThrow('Invalid OIDC state cookie')
        expect(authorizationCodeGrant).not.toHaveBeenCalled()
        expectNoSessionCreated(replayRes)
        expectTransactionCookiesCleared(replayRes)
      })

      it('does not create a session and consumes transaction cookies when code exchange fails', async () => {
        await mockSecurity()
        discovery.mockResolvedValue({ code_challenge_methods_supported: ['S256'] })
        authorizationCodeGrant.mockRejectedValue(new Error('code exchange failed'))

        const req = {
          originalUrl: '/auth/callback?code=some-code&state=some-state',
          cookies: {
            '__Host-gStt': validStateCookie,
            '__Host-gCdVrfr': codeVerifier,
          },
        }
        const res = createResponse()

        await expect(security.authorizationCallback(req, res)).rejects.toThrow('code exchange failed')

        expect(authorizationCodeGrant).toHaveBeenCalledTimes(1)
        expectNoSessionCreated(res)
        expectTransactionCookiesCleared(res)

        const retryRes = createResponse()
        await expect(security.authorizationCallback({
          originalUrl: req.originalUrl,
          cookies: {},
        }, retryRes)).rejects.toThrow('Invalid OIDC state cookie')
        expect(authorizationCodeGrant).toHaveBeenCalledTimes(1)
        expectNoSessionCreated(retryRes)
        expectTransactionCookiesCleared(retryRes)
      })

      it('supports an explicit usePKCE false configuration for a confidential client', async () => {
        await mockSecurity({
          oidc: {
            client_secret: 'client-secret',
            usePKCE: false,
          },
        })
        discovery.mockResolvedValue({})
        authorizationCodeGrant.mockResolvedValue({
          id_token: 'new-id-token',
        })
        authentication.isAuthenticated.mockResolvedValue({ username: sub, groups: [] })
        authorization.isAdmin.mockResolvedValue(false)
        authorization.canListShoots.mockResolvedValue(false)

        const req = {
          originalUrl: '/auth/callback?code=some-code&state=some-state',
          cookies: {
            '__Host-gStt': validStateCookie,
          },
        }
        const res = createResponse()

        await expect(security.authorizationCallback(req, res))
          .resolves
          .toEqual({ redirectPath: '/account' })

        expect(authorizationCodeGrant).toHaveBeenCalledWith(
          expect.any(Object),
          new URL(req.originalUrl, 'https://localhost:8443'),
          {
            idTokenExpected: true,
            expectedState: 'some-state',
          },
        )
        expectTransactionCookiesCleared(res)
        expect(res.cookie).toHaveBeenCalledTimes(3)
      })

      it('preserves existing session cookies when a callback is rejected', async () => {
        await mockSecurity()
        const req = {
          originalUrl: '/auth/callback?code=some-code&state=some-state',
          cookies: {
            '__Host-gHdrPyl': 'existing-header-and-payload',
            '__Host-gSgn': 'existing-signature',
            '__Host-gTkn': 'existing-token',
          },
        }
        const res = createResponse()

        await expect(security.authorizationCallback(req, res))
          .rejects
          .toThrow('Invalid OIDC state cookie')

        expect(authorizationCodeGrant).not.toHaveBeenCalled()
        expectNoSessionCreated(res)
        expectTransactionCookiesCleared(res)
      })

      it('rejects an untrusted redirect path before code exchange', async () => {
        await mockSecurity()

        const req = {
          originalUrl: '/auth/callback?code=some-code&state=some-state',
          cookies: {
            '__Host-gStt': {
              ...validStateCookie,
              redirectPath: 'https://127.0.0.1/account',
            },
            '__Host-gCdVrfr': codeVerifier,
          },
        }
        const res = createResponse()

        await expect(security.authorizationCallback(req, res))
          .rejects
          .toThrow('Invalid redirect path')

        expect(discovery).not.toHaveBeenCalled()
        expect(authorizationCodeGrant).not.toHaveBeenCalled()
        expectNoSessionCreated(res)
        expectTransactionCookiesCleared(res)
      })
    })

    describe('getConfiguration', () => {
      beforeEach(() => {
        if (undici?.Agent?.mockClear) {
          undici.Agent.mockClear()
        }
      })

      it('should use default TLS settings', async () => {
        await mockSecurity({
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
        await mockSecurity({
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
