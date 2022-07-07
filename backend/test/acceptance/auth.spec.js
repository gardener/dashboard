//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { pick, head } = require('lodash')
const assert = require('assert').strict
const { TokenSet } = require('openid-client')
const setCookieParser = require('set-cookie-parser')
const { mockRequest } = require('@gardener-dashboard/request')

const security = require('../../lib/security')
const {
  COOKIE_HEADER_PAYLOAD,
  COOKIE_SIGNATURE,
  COOKIE_TOKEN,
  decodeState
} = security

const ZERO_DATE = new Date(0)
const OTAC = 'jd93ke'

class Client {
  constructor ({
    user,
    issuer,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uris: redirectUris,
    response_types: responseTypes
  }) {
    this.user = user
    this.issuer = issuer
    this.clientId = clientId
    this.clientSecret = clientSecret
    this.redirectUris = redirectUris
    this.responseTypes = responseTypes
  }

  authorizationUrl ({
    redirect_uri: redirectUri,
    state,
    scope
  }) {
    const url = new URL(this.issuer)
    url.pathname = '/auth'
    const params = url.searchParams
    params.append('client_id', this.clientId)
    params.append('redirect_uri', redirectUri)
    params.append('state', state)
    params.append('scope', scope)
    params.append('response_type', head(this.responseTypes))
    return url.toString()
  }

  async callback (redirectUri, { code }, { response_type: responseType }) {
    assert.strictEqual(code, OTAC)
    assert.strictEqual(responseType, 'code')
    const idToken = await this.user.bearer
    const tokenSet = new TokenSet({ id_token: idToken })
    tokenSet.expires_at = tokenSet.claims().exp
    return tokenSet
  }
}

describe('auth', function () {
  const { oidc } = fixtures.config.get()
  const id = 'foo@example.org'
  const user = fixtures.user.create({ id })

  let agent
  let getIssuerClientStub

  beforeAll(() => {
    agent = createAgent()
  })

  afterAll(() => {
    return agent.close()
  })

  beforeEach(() => {
    mockRequest.mockReset()
    const client = Object.assign(new Client({ user, ...oidc }), {
      CLOCK_TOLERANCE: oidc.clockTolerance || 30
    })
    getIssuerClientStub = jest.spyOn(security, 'getIssuerClient').mockResolvedValue(client)
  })

  it('should redirect to authorization url without frontend redirectUrl', async function () {
    const redirectPath = '/'
    const redirectUri = head(oidc.redirect_uris)
    const redirectOrigin = new URL(redirectUri).origin

    const res = await agent
      .get('/auth')
      .redirects(0)
      .expect(302)

    expect(getIssuerClientStub).toBeCalledTimes(1)
    const url = new URL(res.headers.location)
    expect(url.searchParams.get('client_id')).toBe(oidc.client_id)
    expect(url.searchParams.get('redirect_uri')).toBe(redirectUri)
    expect(url.searchParams.get('scope')).toBe(oidc.scope)
    const state = url.searchParams.get('state')
    expect(decodeState(state)).toEqual({
      redirectPath,
      redirectOrigin
    })
  })

  it('should redirect to authorization url with frontend redirectUrl', async function () {
    const redirectPath = '/namespace/garden-foo/administration'
    const redirectUri = head(oidc.redirect_uris)
    const redirectOrigin = new URL(redirectUri).origin
    const redirectUrl = new URL(redirectPath, redirectUri).toString()

    const res = await agent
      .get('/auth')
      .query({ redirectUrl })
      .redirects(0)
      .expect(302)

    expect(getIssuerClientStub).toBeCalledTimes(1)
    const url = new URL(res.headers.location)
    expect(url.searchParams.get('redirect_uri')).toBe(redirectUri)
    const state = url.searchParams.get('state')
    expect(decodeState(state)).toEqual({
      redirectPath,
      redirectOrigin
    })
  })

  it('should fail to redirect to authorization url', async function () {
    const message = 'Issuer not available'
    getIssuerClientStub.mockRejectedValueOnce(new Error(message))

    const res = await agent
      .get('/auth')
      .redirects(0)
      .expect(302)

    expect(getIssuerClientStub).toBeCalledTimes(1)
    expect(res.headers).toHaveProperty('location', `/login#error=${encodeURIComponent(message)}`)
  })

  it('should redirect to home after successful authorization', async function () {
    const bearer = await user.bearer

    mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewToken())

    const res = await agent
      .get(`/auth/callback?code=${OTAC}`)
      .redirects(0)
      .expect(302)

    expect(mockRequest).toBeCalledTimes(1)
    expect(mockRequest.mock.calls[0]).toEqual([
      {
        ...pick(fixtures.kube, [':scheme', ':authority', 'authorization']),
        ':method': 'post',
        ':path': '/apis/authentication.k8s.io/v1/tokenreviews'
      },
      {
        apiVersion: 'authentication.k8s.io/v1',
        kind: 'TokenReview',
        metadata: {
          name: expect.stringMatching(/token-\d+/)
        },
        spec: {
          token: bearer
        }
      }
    ])

    expect(getIssuerClientStub).toBeCalledTimes(1)
    expect(res.headers).toHaveProperty('location', '/')
  })

  it('should redirect to login after failed authorization', async function () {
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

    expect(getIssuerClientStub).toBeCalledTimes(1)
    expect(res.headers).toHaveProperty('location', `/login#error=${encodeURIComponent(message)}`)
  })

  it('should successfully login with a given token', async function () {
    const bearer = await user.bearer
    const { exp: expiresAt } = security.decode(bearer)
    const now = Math.floor(Date.now() / 1000)

    mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewToken())

    const res = await agent
      .post('/auth')
      .send({ token: bearer })
      .expect('content-type', /json/)
      .expect(200)

    expect(mockRequest).toBeCalledTimes(1)
    expect(mockRequest.mock.calls[0]).toEqual([
      {
        ...pick(fixtures.kube, [':scheme', ':authority', 'authorization']),
        ':method': 'post',
        ':path': '/apis/authentication.k8s.io/v1/tokenreviews'
      },
      {
        apiVersion: 'authentication.k8s.io/v1',
        kind: 'TokenReview',
        metadata: {
          name: expect.stringMatching(/token-\d+/)
        },
        spec: {
          token: bearer
        }
      }
    ])

    const {
      [COOKIE_HEADER_PAYLOAD]: cookieHeaderPayload,
      [COOKIE_SIGNATURE]: cookieSignature,
      [COOKIE_TOKEN]: cookieToken
    } = setCookieParser.parse(res, {
      decodeValues: true,
      map: true
    })
    const [header, payload] = cookieHeaderPayload.value.split('.')
    const signature = cookieSignature.value
    const token = [header, payload, signature].join('.')
    expect(cookieHeaderPayload.sameSite).toBe('Lax')
    expect(cookieHeaderPayload.httpOnly).toBeUndefined()
    expect(cookieSignature.sameSite).toBe('Lax')
    expect(cookieSignature.httpOnly).toBe(true)
    expect(cookieToken.sameSite).toBe('Lax')
    expect(cookieToken.httpOnly).toBe(true)
    expect(await security.verify(token)).toEqual(expect.objectContaining({
      id,
      iat: expect.toBeWithinRange(now, now + 3),
      aud: ['gardener'],
      exp: expiresAt,
      jti: expect.stringMatching(/[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}/i)
    }))
    expect((await security.decrypt(cookieToken.value)).split(',')).toEqual([
      bearer,
      expiresAt.toString()
    ])
    expect(res.body.id).toBe(id)
  })

  it('should logout', async function () {
    const res = await agent
      .get('/auth/logout')
      .set('cookie', await user.cookie)
      .redirects(0)
      .send()
      .expect(302)

    expect(res.headers).toHaveProperty('location', '/login')
    const {
      [COOKIE_HEADER_PAYLOAD]: cookieHeaderPayload,
      [COOKIE_SIGNATURE]: cookieSignature,
      [COOKIE_TOKEN]: cookieToken
    } = setCookieParser.parse(res, {
      decodeValues: true,
      map: true
    })
    expect(cookieHeaderPayload.value).toHaveLength(0)
    expect(cookieHeaderPayload.expires).toEqual(ZERO_DATE)
    expect(cookieSignature.value).toHaveLength(0)
    expect(cookieSignature.expires).toEqual(ZERO_DATE)
    expect(cookieToken.value).toHaveLength(0)
    expect(cookieToken.expires).toEqual(ZERO_DATE)
  })
})
