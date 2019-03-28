//
// Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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

const { split, join, noop, trim, isPlainObject } = require('lodash')
const { promisify } = require('util')
const jwt = require('jsonwebtoken')
const { Issuer } = require('openid-client')
const cookieParser = require('cookie-parser')
const { JWK, JWE } = require('node-jose')
const uuidv1 = require('uuid/v1')
const base64url = require('base64url')
const pRetry = require('p-retry')
const pTimeout = require('p-timeout')
const { authentication, authorization } = require('./services')
const { Forbidden, Unauthorized } = require('./errors')
const { secret, cookieMaxAge = 1800, oidc = {} } = require('./config')

const jwtSign = promisify(jwt.sign)
const jwtVerify = promisify(jwt.verify)

const {
  issuer,
  redirect_uri: redirectUri,
  scope,
  client_id: clientId,
  client_secret: clientSecret,
  rejectUnauthorized = true,
  ca
} = oidc
const defaultHttpOptions = { rejectUnauthorized }
if (ca) {
  defaultHttpOptions.ca = ca
}
Issuer.defaultHttpOptions = defaultHttpOptions

const secure = process.env.NODE_ENV === 'development' ? /^https:/.test(redirectUri) : true

const COOKIE_HEADER_PAYLOAD = 'gHdrPyl'
const COOKIE_SIGNATURE = 'gSgn'
const COOKIE_TOKEN = 'gTkn'
const GARDENER_AUDIENCE = 'gardener'

const symetricKeyPromise = JWK.asKey({
  kty: 'oct',
  kid: 'gardener-dashboard-secret',
  use: 'enc',
  k: normalizeKeyValue(secret)
})

let clientPromise

function discoverIssuer (url) {
  return Issuer.discover(url)
}

function discoverClient () {
  return pRetry(async () => {
    const { Client } = await discoverIssuer(issuer)
    const client = new Client({
      client_id: clientId,
      client_secret: clientSecret
    })
    client.CLOCK_TOLERANCE = 15
    return client
  }, {
    forever: true,
    minTimeout: 1000,
    maxTimeout: 60 * 1000,
    randomize: true
  })
}

function getIssuerClient () {
  if (!clientPromise) {
    clientPromise = discoverClient()
  }
  return pTimeout(clientPromise, 1000, `OpenID Connect Issuer ${issuer} not available`)
}

function encodeState (data = {}) {
  return base64url.encode(JSON.stringify(data))
}

function decodeState (state) {
  try {
    return JSON.parse(base64url.decode(state))
  } catch (err) {
    return {}
  }
}

function normalizeKeyValue (input) {
  if (base64url(base64url.decode(input)) === input) {
    return input
  }
  if (Buffer.from(input, 'base64').toString('base64') === input) {
    return base64url.fromBase64(input)
  }
  return base64url(input)
}

async function authorizationUrl (req, res) {
  const state = encodeState(req.query)
  const client = await exports.getIssuerClient()
  return client.authorizationUrl({
    redirect_uri: redirectUri,
    state,
    scope
  })
}

async function authorizeToken (req, res) {
  const { token, expiresIn } = req.body
  const bearer = trim(token)
  const auth = { bearer }
  const [
    { username: id, groups },
    isAdmin,
    canCreateProject
  ] = await Promise.all([
    authentication.isAuthenticated({ token: bearer }),
    authorization.isAdmin({ auth }),
    authorization.canCreateProject({ auth })
  ])
  const { name, email } = decode(bearer)
  const user = {
    id,
    groups,
    isAdmin,
    canCreateProject,
    name,
    email
  }
  const audience = [ GARDENER_AUDIENCE ]
  const [ header, payload, signature ] = split(await sign(user, { expiresIn, audience }), '.')
  res.cookie(COOKIE_HEADER_PAYLOAD, join([header, payload], '.'), {
    secure,
    maxAge: cookieMaxAge * 1000,
    sameSite: true
  })
  const encryptedBearer = await encrypt(bearer)
  res.cookie(COOKIE_SIGNATURE, signature, {
    secure,
    httpOnly: true,
    expires: undefined,
    sameSite: true
  })
  res.cookie(COOKIE_TOKEN, encryptedBearer, {
    secure,
    httpOnly: true,
    expires: undefined,
    sameSite: true
  })
  return user
}

async function authorizationCallback (req, res) {
  const client = await exports.getIssuerClient()
  const { code, state } = req.query
  const {
    id_token: token,
    expires_in: expiresIn
  } = await client.authorizationCallback(redirectUri, { code }, {
    response_type: 'code'
  })
  req.body = { token, expiresIn }
  await authorizeToken(req, res)
  return decodeState(state)
}

function isHttpMethodSafe ({ method }) {
  return ['GET', 'HEAD', 'OPTIONS'].indexOf(method) !== -1
}

function isXmlHttpRequest ({ headers = {} }) {
  return headers['x-requested-with'] === 'XMLHttpRequest'
}

function getToken ({ cookies = {}, headers = {} }) {
  const { authorization = '' } = headers
  if (authorization.startsWith('Bearer ')) {
    return authorization.substring(7)
  }
  const [ header, payload ] = split(cookies[COOKIE_HEADER_PAYLOAD], '.')
  const signature = cookies[COOKIE_SIGNATURE]
  if (header && payload && signature) {
    return join([ header, payload, signature ], '.')
  }
  return null
}

function authenticate () {
  const verifyToken = async (req, res) => {
    const token = getToken(req)
    if (!token) {
      throw new Unauthorized('No authorization token was found')
    }
    try {
      const audience = [ GARDENER_AUDIENCE ]
      req.user = await verify(token, { audience })
    } catch (err) {
      throw new Unauthorized(err.message)
    }
  }
  const csrfProtection = (req, res) => {
    /**
     * According to the OWASP Document "Cross-Site Request Forgery Prevention"
     * the ["Use of Custom Request Headers"](https://github.com/OWASP/CheatSheetSeries/blob/master/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.md#use-of-custom-request-headers)
     * is an alternate defense that is particularly well suited for AJAX/XHR endpoints.
     */
    if (!isHttpMethodSafe(req) && !isXmlHttpRequest(req)) {
      throw new Forbidden('Request has been blocked by CSRF protection')
    }
  }
  const setUserAuth = async (req, res) => {
    const { cookies = {}, user = {} } = req
    const encryptedBearer = cookies[COOKIE_TOKEN]
    if (encryptedBearer) {
      const bearer = await decrypt(encryptedBearer)
      user.auth = { bearer }
    }
  }
  const renewCookie = (req, res) => {
    const value = req.cookies[COOKIE_HEADER_PAYLOAD]
    res.cookie(COOKIE_HEADER_PAYLOAD, value, {
      secure,
      maxAge: cookieMaxAge * 1000,
      sameSite: true
    })
  }
  return async (req, res, next) => {
    try {
      csrfProtection(req, res)
      await verifyToken(req, res)
      await setUserAuth(req, res)
      renewCookie(req, res)
      next()
    } catch (err) {
      clearCookies(res)
      next(err)
    }
  }
}

function authenticateSocket (options) {
  const authenticateAsync = promisify(authenticate(options))
  const cookieParserAsync = promisify(cookieParser())
  return async (socket) => {
    const res = {
      clearCookie: noop,
      cookie: noop
    }
    const req = socket.request
    await cookieParserAsync(req, res)
    await authenticateAsync(req, res)
    const user = socket.client.user = req.user
    return user
  }
}

function clearCookies (res) {
  res.clearCookie(COOKIE_HEADER_PAYLOAD)
  res.clearCookie(COOKIE_SIGNATURE)
  res.clearCookie(COOKIE_TOKEN)
}

async function encrypt (text) {
  const options = {
    format: 'compact'
  }
  const key = await symetricKeyPromise
  return JWE.createEncrypt(options, key).update(text).final()
}

async function decrypt (data) {
  const key = await symetricKeyPromise
  const { payload } = await JWE.createDecrypt(key).decrypt(data)
  return payload.toString('ascii')
}

function sign (payload, secretOrPrivateKey, options) {
  if (isPlainObject(secretOrPrivateKey)) {
    options = secretOrPrivateKey
    secretOrPrivateKey = undefined
  }
  if (!secretOrPrivateKey) {
    secretOrPrivateKey = secret
  }
  const { expiresIn = '1d', jwtid = uuidv1(), ...rest } = options || {}
  return jwtSign(payload, secretOrPrivateKey, { expiresIn, jwtid, ...rest })
}

function verify (token, options) {
  return jwtVerify(token, secret, options)
}

function decode (token) {
  return jwt.decode(token) || {}
}

module.exports = exports = {
  discoverIssuer,
  getIssuerClient,
  COOKIE_HEADER_PAYLOAD,
  COOKIE_SIGNATURE,
  COOKIE_TOKEN,
  sign,
  decode,
  verify,
  encrypt,
  decrypt,
  clearCookies,
  authorizationUrl,
  authorizationCallback,
  authorizeToken,
  authenticate,
  authenticateSocket
}
