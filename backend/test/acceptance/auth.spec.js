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
  decodeState,
  setCookies,
  sign,
  decrypt,
  decode
} = security

async function getCookieValue (tokenSet) {
  const values = []
  const res = {
    cookie (key, value) {
      values.push(`${key}=${value}`)
    }
  }
  await setCookies(res, tokenSet)
  return values.join(';')
}

async function parseCookies (res) {
  const {
    [COOKIE_HEADER_PAYLOAD]: cookieHeaderPayload,
    [COOKIE_SIGNATURE]: cookieSignature,
    [COOKIE_TOKEN]: cookieToken
  } = setCookieParser.parse(res, {
    decodeValues: true,
    map: true
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

  refresh (token) {
    const tokenSet = new TokenSet({
      id_token: token,
      refresh_token: 'refresh-token'
    })
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
  let mockRefresh

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
    mockRefresh = jest.spyOn(client, 'refresh')
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
    mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

    const res = await agent
      .get(`/auth/callback?code=${OTAC}`)
      .redirects(0)
      .expect(302)

    expect(mockRequest).toBeCalledTimes(2)
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
    expect(mockRequest.mock.calls[1]).toMatchSnapshot()

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
    const now = Math.floor(Date.now() / 1000)
    const expiresAt = now + 86400

    mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewToken())
    mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

    const res = await agent
      .post('/auth')
      .send({ token: bearer })
      .expect('content-type', /json/)
      .expect(200)

    expect(mockRequest).toBeCalledTimes(2)
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
    expect(mockRequest.mock.calls[1]).toMatchSnapshot()

    const [accessToken, idToken, refreshToken] = await parseCookies(res)
    const payload = await security.verify(accessToken)
    expect(payload).toEqual(expect.objectContaining({
      id,
      iat: expect.toBeWithinRange(now, now + 3),
      aud: ['gardener'],
      isAdmin: false,
      exp: expect.toBeWithinRange(expiresAt, expiresAt + 3),
      jti: expect.stringMatching(/[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}/i)
    }))
    expect(idToken).toEqual(bearer)
    expect(refreshToken).toBeUndefined()
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

  it('should successfully refresh a token', async function () {
    const iat = Math.floor(Date.now() / 1000)

    const idTokenPayload = {
      iat,
      sub: id,
      exp: iat - 60
    }
    const accessTokenPayload = {
      iat,
      id,
      exp: iat + 24 * 60 * 60,
      refresh_at: idTokenPayload.exp,
      aud: ['gardener']
    }
    // in this test the refreshToken is return as new idToken in the `client.refresh` mock implementation
    const refreshTokenPayload = {
      iat: iat + 60,
      sub: id,
      exp: iat + 61 * 60
    }
    const tokenSet = new TokenSet({
      id_token: await sign(idTokenPayload),
      access_token: await sign(accessTokenPayload),
      refresh_token: await sign(refreshTokenPayload)
    })

    mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewToken())
    mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

    const res = await agent
      .post('/auth/token')
      .set('cookie', await getCookieValue(tokenSet))
      .expect('content-type', /json/)
      .expect(200)

    expect(mockRequest).toBeCalledTimes(2)
    expect(mockRequest.mock.calls).toEqual([[
      {
        ...pick(fixtures.kube, [':scheme', ':authority', 'authorization']),
        ':method': 'post',
        ':path': '/apis/authentication.k8s.io/v1/tokenreviews'
      },
      {
        apiVersion: 'authentication.k8s.io/v1',
        kind: 'TokenReview',
        metadata: {
          name: expect.stringMatching(/^token-\d+/)
        },
        spec: {
          token: tokenSet.refresh_token
        }
      }
    ], [
      {
        ...pick(fixtures.kube, [':scheme', ':authority']),
        authorization: `Bearer ${tokenSet.refresh_token}`,
        ':method': 'post',
        ':path': '/apis/authorization.k8s.io/v1/selfsubjectaccessreviews'
      },
      {
        apiVersion: 'authorization.k8s.io/v1',
        kind: 'SelfSubjectAccessReview',
        spec: {
          nonResourceAttributes: undefined,
          resourceAttributes: {
            group: '',
            resource: 'secrets',
            verb: 'get'
          }
        }
      }
    ]])
    expect(mockRefresh).toBeCalledTimes(1)
    expect(mockRefresh.mock.calls[0]).toEqual([tokenSet.refresh_token])

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
      rti: expect.stringMatching(/^[a-z0-9]{7}$/)
    })
  })
})
