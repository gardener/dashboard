//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { pick } = require('lodash')
const assert = require('assert').strict
const setCookieParser = require('set-cookie-parser')
const { mockRequest } = require('@gardener-dashboard/request')

const security = require('../../lib/security')
const {
  COOKIE_HEADER_PAYLOAD,
  COOKIE_SIGNATURE,
  COOKIE_TOKEN
} = security

const ZERO_DATE = new Date(0)
const OTAC = 'jd93ke'

class Client {
  constructor ({
    user,
    issuer,
    client_id: clientId,
    client_secret: clientSecret
  }) {
    this.user = user
    this.issuer = issuer
    this.clientId = clientId
    this.clientSecret = clientSecret
  }

  authorizationUrl ({
    redirect_uri: redirectUri,
    scope
  }) {
    const url = new URL(this.issuer)
    url.pathname = '/auth'
    const params = url.searchParams
    params.append('client_id', this.clientId)
    params.append('redirect_uri', redirectUri)
    params.append('scope', scope)
    params.append('response_type', 'code')
    return url.toString()
  }

  async callback (redirectUri, { code }, { response_type: responseType }) {
    assert.strictEqual(code, OTAC)
    assert.strictEqual(responseType, 'code')
    const bearer = await this.user.bearer
    const expiresIn = Math.floor(Date.now() / 1000) + 86400
    return {
      id_token: bearer,
      expires_in: expiresIn
    }
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

  it('should redirect to authorization url', async function () {
    const res = await agent
      .get('/auth')
      .redirects(0)
      .expect(302)

    expect(getIssuerClientStub).toBeCalledTimes(1)
    const url = new URL(res.headers.location)
    expect(url.searchParams.get('client_id')).toBe(oidc.client_id)
    expect(url.searchParams.get('redirect_uri')).toBe(oidc.redirect_uri)
    expect(url.searchParams.get('scope')).toBe(oidc.scope)
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
    const encryptedBearer = cookieToken.value
    const token = [header, payload, signature].join('.')
    const tokenPayload = security.decode(token)
    expect(tokenPayload.jti).toMatch(/[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}/i)
    expect(cookieHeaderPayload.sameSite).toBe('Lax')
    expect(cookieHeaderPayload.httpOnly).toBeUndefined()
    expect(cookieSignature.sameSite).toBe('Lax')
    expect(cookieSignature.httpOnly).toBe(true)
    expect(cookieToken.sameSite).toBe('Lax')
    expect(cookieToken.httpOnly).toBe(true)
    expect(await security.verify(token)).toEqual(tokenPayload)
    expect(await security.decrypt(encryptedBearer)).toBe(bearer)
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
