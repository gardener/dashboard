//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

'use strict'

const { oidc = {} } = require('../../lib/config')
const security = require('../../lib/security')
const setCookieParser = require('set-cookie-parser')
const ZERO_DATE = new Date(0)
const OTAC = 'jd93ke'
const { COOKIE_HEADER_PAYLOAD, COOKIE_SIGNATURE_TOKEN } = security

class Client {
  constructor ({
    user,
    client_id: clientId,
    client_secret: clientSecret
  }) {
    this.user = user
    this.clientId = clientId
    this.clientSecret = clientSecret
  }
  authorizationUrl ({
    redirect_uri: redirectUri,
    scope
  }) {
    const url = new URL(oidc.issuer)
    url.pathname = '/auth'
    const params = url.searchParams
    params.append('client_id', this.clientId)
    params.append('redirect_uri', redirectUri)
    params.append('scope', scope)
    params.append('response_type', 'code')
    return url.toString()
  }
  async authorizationCallback (redirectUri, { code }, { response_type: responseType }) {
    expect(code).to.equal(OTAC)
    expect(responseType).to.equal('code')
    const bearer = await this.user.bearer
    const expiresIn = Math.floor(Date.now() / 1000) + 86400
    return {
      id_token: bearer,
      expires_in: expiresIn
    }
  }
}

async function getIssuerClient (user) {
  const client = new Client({ user, ...oidc })
  client.CLOCK_TOLERANCE = 15
  return client
}

module.exports = function ({ agent, sandbox }) {
  /* eslint no-unused-expressions: 0 */

  const { createUser } = nocks.auth
  const k8s = nocks.k8s
  const username = 'foo@example.org'
  const user = createUser({ id: username })

  it('should redirect to authorization url', async function () {
    const getIssuerClientStub = sandbox.stub(security, 'getIssuerClient').callsFake(() => getIssuerClient(user))

    const res = await agent
      .get('/auth')
      .redirects(0)
      .send()

    expect(getIssuerClientStub).to.be.calledOnce
    expect(res).to.have.status(302)
    const url = new URL(res.headers.location)
    expect(url.searchParams.get('client_id')).to.equal(oidc.client_id)
    expect(url.searchParams.get('redirect_uri')).to.equal(oidc.redirect_uri)
    expect(url.searchParams.get('scope')).to.equal(oidc.scope)
  })

  it('should redirect to home after successful authorization', async function () {
    const getIssuerClientStub = sandbox.stub(security, 'getIssuerClient').callsFake(() => getIssuerClient(user))
    const bearer = await user.bearer
    k8s.stub.getUserInfo({ bearer })

    const res = await agent
      .get(`/auth/callback?code=${OTAC}`)
      .redirects(0)
      .send()

    expect(getIssuerClientStub).to.be.calledOnce
    expect(res).to.have.status(302)
    expect(res).to.redirectTo('/')
  })

  it('should redirect to login after failed authorization', async function () {
    const getIssuerClientStub = sandbox.stub(security, 'getIssuerClient').callsFake(() => getIssuerClient(user))
    const invalidOtac = 'ic82jd'
    let message
    try {
      expect(invalidOtac).to.equal(OTAC)
    } catch (err) {
      message = err.message
    }

    const res = await agent
      .get(`/auth/callback?code=${invalidOtac}`)
      .redirects(0)
      .send()

    expect(getIssuerClientStub).to.be.calledOnce
    expect(res).to.have.status(302)
    expect(res).to.redirectTo(`/login#error=${encodeURIComponent(message)}`)
  })

  it('should successfully login with a given token', async function () {
    const bearer = await user.bearer
    k8s.stub.getUserInfo({ bearer })

    const res = await agent
      .post(`/auth`)
      .send({ token: bearer })

    expect(res).to.have.status(200)
    const {
      [COOKIE_HEADER_PAYLOAD]: cookieHeaderPayload,
      [COOKIE_SIGNATURE_TOKEN]: cookieSignatureToken
    } = setCookieParser.parse(res, {
      decodeValues: true,
      map: true
    })
    const [ header, payload ] = cookieHeaderPayload.value.split('.')
    const [ signature, encryptedBearer ] = cookieSignatureToken.value.split('.')
    const token = [ header, payload, signature ].join('.')
    const tokenPayload = security.decode(token)
    expect(cookieHeaderPayload.sameSite).to.equal('Strict')
    expect(cookieHeaderPayload.maxAge).to.equal(1800)
    expect(cookieSignatureToken.sameSite).to.equal('Strict')
    expect(cookieSignatureToken.httpOnly).to.equal(true)
    expect(await security.verify(token)).to.be.eql(tokenPayload)
    expect(await security.decrypt(encryptedBearer)).to.equal(bearer)
    expect(res).to.be.json
    expect(res.body.id).to.equal(username)
  })

  it('should logout', async function () {
    const res = await agent
      .get('/auth/logout')
      .set('cookie', await user.cookie)
      .redirects(0)
      .send()

    expect(res).to.have.status(302)
    expect(res).to.redirectTo('/login')
    const {
      [COOKIE_HEADER_PAYLOAD]: cookieHeaderPayload,
      [COOKIE_SIGNATURE_TOKEN]: cookieSignatureToken
    } = setCookieParser.parse(res, {
      decodeValues: true,
      map: true
    })
    expect(cookieHeaderPayload.value).to.be.empty
    expect(cookieHeaderPayload.expires).to.eql(ZERO_DATE)
    expect(cookieSignatureToken.value).to.be.empty
    expect(cookieSignatureToken.expires).to.eql(ZERO_DATE)
  })
}
