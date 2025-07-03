//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { pick, head } = require('lodash')
const assert = require('assert').strict
const setCookieParser = require('set-cookie-parser')
const { mockRequest } = require('@gardener-dashboard/request')

const security = require('../../lib/security')
const {
  COOKIE_HEADER_PAYLOAD,
  COOKIE_SIGNATURE,
  COOKIE_TOKEN,
  setCookies,
  sign,
  decrypt,
  decode,
} = security

async function getCookieValue (tokenSet) {
  const values = []
  const res = {
    cookie (key, value) {
      values.push(`${key}=${value}`)
    },
  }
  await setCookies(res, tokenSet)
  return values.join(';')
}

async function parseCookies (res) {
  const {
    [COOKIE_HEADER_PAYLOAD]: cookieHeaderPayload,
    [COOKIE_SIGNATURE]: cookieSignature,
    [COOKIE_TOKEN]: cookieToken,
  } = setCookieParser.parse(res, {
    decodeValues: true,
    map: true,
  })
  assert.strictEqual(cookieHeaderPayload.sameSite, 'Lax')
  assert.strictEqual(cookieHeaderPayload.httpOnly, undefined)
  assert.strictEqual(cookieSignature.sameSite, 'Lax')
  assert.strictEqual(cookieSignature.httpOnly, true)
  assert.strictEqual(cookieToken.sameSite, 'Lax')
  assert.strictEqual(cookieToken.httpOnly, true)
  const accessToken = [...cookieHeaderPayload.value.split('.'), cookieSignature.value].join('.')
  const [idToken, refreshToken] = (await decrypt(cookieToken.value)).split(',')
  return [accessToken, idToken, refreshToken]
}

const ZERO_DATE = new Date(0)
const OTAC = 'jd93ke'

describe('auth', function () {
  const { oidc } = fixtures.config.get()
  const id = 'foo@example.org'
  const user = fixtures.user.create({ id })

  let discovery
  let buildAuthorizationUrl
  let authorizationCodeGrant
  let refreshTokenGrant
  let randomState
  let randomPKCECodeVerifier
  let calculatePKCECodeChallenge
  let mockOpenidClient

  let agent

  beforeAll(() => {
    agent = createAgent()
  })

  afterAll(() => {
    return agent.close()
  })

  beforeEach(() => {
    jest.clearAllMocks()

    discovery = jest.fn()
    buildAuthorizationUrl = jest.fn()
    authorizationCodeGrant = jest.fn()
    refreshTokenGrant = jest.fn()
    randomState = jest.fn()
    randomPKCECodeVerifier = jest.fn()
    calculatePKCECodeChallenge = jest.fn()

    mockOpenidClient = {
      discovery,
      buildAuthorizationUrl,
      authorizationCodeGrant,
      refreshTokenGrant,
      randomState,
      randomPKCECodeVerifier,
      calculatePKCECodeChallenge,
    }

    security.openidClientPromise = Promise.resolve(mockOpenidClient)
    security.discoveryPromise = undefined

    randomPKCECodeVerifier.mockReturnValueOnce('code-verifier')
    calculatePKCECodeChallenge.mockReturnValueOnce('code-challenge')
    buildAuthorizationUrl.mockImplementationOnce((config, params) => {
      const url = new URL(oidc.issuer)
      url.pathname = '/auth'
      const searchParams = url.searchParams
      searchParams.append('client_id', oidc.client_id)
      searchParams.append('redirect_uri', params.redirect_uri)
      searchParams.append('state', params.state)
      searchParams.append('scope', params.scope)
      searchParams.append('response_type', head(oidc.response_types))
      return url.toString()
    })

    randomState.mockReturnValueOnce('state')
  })

  it('should redirect to authorization url without frontend redirectUrl', async function () {
    const redirectUri = head(oidc.redirect_uris)
    discovery.mockResolvedValue({
      code_challenge_methods_supported: ['S256'],
      issuer: 'https://issuer.example.org',
      authorization_endpoint: 'https://issuer.example.org/authorize',
      token_endpoint: 'https://issuer.example.org/token',
    })

    const res = await agent
      .get('/auth')
      .redirects(0)
      .expect(302)

    expect(discovery).toHaveBeenCalledTimes(1)
    expect(buildAuthorizationUrl).toHaveBeenCalledTimes(1)
    expect(randomPKCECodeVerifier).toHaveBeenCalledTimes(1)
    expect(calculatePKCECodeChallenge).toHaveBeenCalledTimes(1)
    expect(buildAuthorizationUrl).toHaveBeenCalledWith(
      {
        code_challenge_methods_supported: ['S256'],
        issuer: 'https://issuer.example.org',
        authorization_endpoint: 'https://issuer.example.org/authorize',
        token_endpoint: 'https://issuer.example.org/token',
      },
      expect.objectContaining({
        code_challenge: 'code-challenge',
        code_challenge_method: 'S256',
      }),
    )
    const url = new URL(res.headers.location)
    expect(url.searchParams.get('client_id')).toBe(oidc.client_id)
    expect(url.searchParams.get('redirect_uri')).toBe(redirectUri)
    expect(url.searchParams.get('scope')).toBe(oidc.scope)
    const state = url.searchParams.get('state')
    expect(state).toEqual('state')
  })

  it('should redirect to authorization url with frontend redirectUrl', async function () {
    // define a custom redirect path
    const redirectPath = '/namespace/garden-foo/administration'
    const redirectUri = head(oidc.redirect_uris)
    const redirectUrl = new URL(redirectPath, redirectUri).toString()

    discovery.mockResolvedValue({
      code_challenge_methods_supported: ['S256'],
      issuer: 'https://issuer.example.org',
      authorization_endpoint: 'https://issuer.example.org/authorize',
      token_endpoint: 'https://issuer.example.org/token',
    })

    const res = await agent
      .get('/auth')
      .query({ redirectUrl })
      .redirects(0)
      .expect(302)

    expect(discovery).toHaveBeenCalledTimes(1)
    expect(buildAuthorizationUrl).toHaveBeenCalledTimes(1)
    expect(randomPKCECodeVerifier).toHaveBeenCalledTimes(1)
    expect(calculatePKCECodeChallenge).toHaveBeenCalledTimes(1)
    expect(buildAuthorizationUrl).toHaveBeenCalledWith(
      {
        code_challenge_methods_supported: ['S256'],
        issuer: 'https://issuer.example.org',
        authorization_endpoint: 'https://issuer.example.org/authorize',
        token_endpoint: 'https://issuer.example.org/token',
      },
      expect.objectContaining({
        code_challenge: 'code-challenge',
        code_challenge_method: 'S256',
      }),
    )
    const url = new URL(res.headers.location)
    expect(url.searchParams.get('redirect_uri')).toBe(redirectUri)
    expect(url.searchParams.get('state')).toEqual('state')
  })

  // TODO migrate to latest pRetry version and use abort signal in afterEach hook to ensure that the retry is aborted. Then this test can be enabled again.
  it.skip('should fail to redirect to authorization url', async function () {
    const message = 'Issuer not available'
    discovery.mockRejectedValueOnce(new Error(message))

    const res = await agent
      .get('/auth')
      .redirects(0)
      .expect(302)

    expect(discovery).toHaveBeenCalledTimes(1)
    expect(res.headers).toHaveProperty('location', `/login#error=${encodeURIComponent(message)}`)
  })

  it('should redirect to home after successful authorization', async function () {
    const bearer = await user.bearer

    mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewToken())
    mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

    authorizationCodeGrant.mockImplementationOnce((config, currentUrl, checks) => {
      assert.strictEqual(currentUrl.searchParams.get('code'), OTAC)
      return { id_token: bearer }
    })

    const res = await agent
      .get(`/auth/callback?code=${OTAC}`)
      .redirects(0)
      .expect(302)

    expect(mockRequest).toHaveBeenCalledTimes(2)
    expect(mockRequest.mock.calls[0]).toEqual([
      {
        ...pick(fixtures.kube, [':scheme', ':authority', 'authorization']),
        ':method': 'post',
        ':path': '/apis/authentication.k8s.io/v1/tokenreviews',
      },
      {
        apiVersion: 'authentication.k8s.io/v1',
        kind: 'TokenReview',
        metadata: {
          name: expect.stringMatching(/token-\d+/),
        },
        spec: {
          token: bearer,
        },
      },
    ])
    expect(mockRequest.mock.calls[1]).toMatchSnapshot()

    expect(discovery).toHaveBeenCalledTimes(1)
    expect(res.headers).toHaveProperty('location', '/')
    expect(mockRequest).toHaveBeenCalledTimes(2)
    expect(authorizationCodeGrant).toHaveBeenCalledTimes(1)
  })

  it('should redirect to login after failed authorization', async function () {
    const bearer = await user.bearer
    authorizationCodeGrant.mockImplementationOnce((config, currentUrl, checks) => {
      assert.strictEqual(currentUrl.searchParams.get('code'), OTAC)
      return { id_token: bearer }
    })

    const invalidOtac = 'ic82jd'
    let message
    try {
      assert.strictEqual(invalidOtac, OTAC)
    } catch (err) {
      message = err.message
    }

    const res = await agent
      .get(`/auth/callback?code=${invalidOtac}`)
      .redirects(0)
      .expect(302)

    expect(discovery).toHaveBeenCalledTimes(1)
    expect(res.headers).toHaveProperty('location', `/login#error=${encodeURIComponent(message)}`)
    expect(authorizationCodeGrant).toHaveBeenCalledTimes(1)
  })

  it('should successfully login with a given token', async function () {
    const bearer = await user.bearer
    const nowSec = Math.floor(Date.now() / 1000)
    const expiresAt = nowSec + 86400

    mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewToken())
    mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

    const res = await agent
      .post('/auth')
      .send({ token: bearer })
      .expect('content-type', /json/)
      .expect(200)

    expect(mockRequest).toHaveBeenCalledTimes(2)
    expect(mockRequest.mock.calls[0]).toEqual([
      {
        ...pick(fixtures.kube, [':scheme', ':authority', 'authorization']),
        ':method': 'post',
        ':path': '/apis/authentication.k8s.io/v1/tokenreviews',
      },
      {
        apiVersion: 'authentication.k8s.io/v1',
        kind: 'TokenReview',
        metadata: {
          name: expect.stringMatching(/token-\d+/),
        },
        spec: {
          token: bearer,
        },
      },
    ])
    expect(mockRequest.mock.calls[1]).toMatchSnapshot()

    const [accessToken, idToken, refreshToken] = await parseCookies(res)
    expect(idToken).toEqual(bearer)
    expect(refreshToken).toBeUndefined()
    const payload = await security.verify(accessToken)
    expect(payload).toEqual(expect.objectContaining({
      id,
      iat: expect.toBeWithinRange(nowSec, nowSec + 3),
      aud: ['gardener'],
      isAdmin: false,
      exp: expect.toBeWithinRange(expiresAt, expiresAt + 3),
      jti: expect.stringMatching(/[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}/i),
    }))

    expect(res.body.id).toBe(id)
  })

  it('should logout', async function () {
    const userCookie = await user.cookie

    const res = await agent
      .get('/auth/logout')
      .set('cookie', userCookie)
      .redirects(0)
      .send()
      .expect(302)

    expect(res.headers).toHaveProperty('location', '/login')
    const {
      [COOKIE_HEADER_PAYLOAD]: cookieHeaderPayload,
      [COOKIE_SIGNATURE]: cookieSignature,
      [COOKIE_TOKEN]: cookieToken,
    } = setCookieParser.parse(res, {
      decodeValues: true,
      map: true,
    })
    expect(cookieHeaderPayload.value).toHaveLength(0)
    expect(cookieHeaderPayload.expires).toEqual(ZERO_DATE)
    expect(cookieSignature.value).toHaveLength(0)
    expect(cookieSignature.expires).toEqual(ZERO_DATE)
    expect(cookieToken.value).toHaveLength(0)
    expect(cookieToken.expires).toEqual(ZERO_DATE)
  })

  it('should successfully refresh a token', async function () {
    const iat = Math.floor(Date.now() / 1000)
    const idTokenPayload = {
      iat,
      sub: id,
      exp: iat - 60,
    }
    const accessTokenPayload = {
      iat,
      id,
      exp: iat + 24 * 60 * 60,
      refresh_at: idTokenPayload.exp,
      aud: ['gardener'],
    }
    // in this test the refreshToken is return as new idToken in the `refreshTokenGrant` mock implementation
    const refreshTokenPayload = {
      iat: iat + 60,
      sub: id,
      exp: iat + 61 * 60,
    }
    const tokenSet = {
      id_token: await sign(idTokenPayload),
      access_token: await sign(accessTokenPayload),
      refresh_token: await sign(refreshTokenPayload),
    }

    refreshTokenGrant.mockResolvedValueOnce({
      id_token: tokenSet.refresh_token,
      refresh_token: 'refresh-token',
    })

    mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewToken())
    mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
    discovery.mockResolvedValue({
      code_challenge_methods_supported: ['S256'],
      issuer: 'https://issuer.example.org',
      authorization_endpoint: 'https://issuer.example.org/authorize',
      token_endpoint: 'https://issuer.example.org/token',
    })

    const res = await agent
      .post('/auth/token')
      .set('cookie', await getCookieValue(tokenSet))
      .expect('content-type', /json/)
      .expect(200)

    expect(mockRequest).toHaveBeenCalledTimes(2)
    expect(mockRequest.mock.calls).toEqual([[
      {
        ...pick(fixtures.kube, [':scheme', ':authority', 'authorization']),
        ':method': 'post',
        ':path': '/apis/authentication.k8s.io/v1/tokenreviews',
      },
      {
        apiVersion: 'authentication.k8s.io/v1',
        kind: 'TokenReview',
        metadata: {
          name: expect.stringMatching(/^token-\d+/),
        },
        spec: {
          token: tokenSet.refresh_token,
        },
      },
    ], [
      {
        ...pick(fixtures.kube, [':scheme', ':authority']),
        authorization: `Bearer ${tokenSet.refresh_token}`,
        ':method': 'post',
        ':path': '/apis/authorization.k8s.io/v1/selfsubjectaccessreviews',
      },
      {
        apiVersion: 'authorization.k8s.io/v1',
        kind: 'SelfSubjectAccessReview',
        spec: {
          nonResourceAttributes: undefined,
          resourceAttributes: {
            group: '',
            resource: 'secrets',
            verb: 'get',
          },
        },
      },
    ]])

    expect(refreshTokenGrant).toHaveBeenCalledTimes(1)
    expect(refreshTokenGrant).toHaveBeenCalledWith(
      expect.objectContaining({
        issuer: 'https://issuer.example.org',
        authorization_endpoint: 'https://issuer.example.org/authorize',
      }),
      tokenSet.refresh_token,
    )

    const [accessToken, idToken, refreshToken] = await parseCookies(res)
    expect(idToken).toEqual(tokenSet.refresh_token)
    expect(refreshToken).toBe('refresh-token')

    const payload = decode(accessToken)
    expect(payload).toEqual(res.body)
    expect(payload).toEqual({
      jti: expect.stringMatching(/^[a-z0-9-]+$/),
      id,
      iat: expect.toBeWithinRange(accessTokenPayload.iat, accessTokenPayload.iat + 5),
      exp: accessTokenPayload.exp,
      aud: accessTokenPayload.aud,
      isAdmin: false,
      refresh_at: refreshTokenPayload.exp,
      rti: expect.stringMatching(/^[a-z0-9]{7}$/),
    })
  })
})
