//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { promisify } = require('util')
const assert = require('assert').strict
const { split, join, noop, trim, some, every, includes, head } = require('lodash')
const { Issuer, custom } = require('openid-client')
const cookieParser = require('cookie-parser')
const pRetry = require('p-retry')
const pTimeout = require('p-timeout')
const { authentication } = require('../services')
const createError = require('http-errors')
const logger = require('../logger')
const { sessionSecret, oidc = {} } = require('../config')

const {
  encodeState,
  decodeState,
  sign,
  verify,
  decode,
  encrypt,
  decrypt
} = require('./jose')(sessionSecret)

const {
  COOKIE_HEADER_PAYLOAD,
  COOKIE_TOKEN,
  COOKIE_SIGNATURE,
  GARDENER_AUDIENCE
} = require('./constants')

const {
  issuer,
  redirect_uris: redirectUris = [],
  scope,
  client_id: clientId,
  client_secret: clientSecret,
  rejectUnauthorized = true,
  ca,
  clockTolerance = 15
} = oidc
const responseTypes = ['code']
const httpOptions = {
  followRedirect: false,
  rejectUnauthorized
}
if (ca) {
  httpOptions.ca = ca
}

const hasHttpsProtocol = uri => /^https:/.test(uri)
const secure = some(redirectUris, hasHttpsProtocol)
if (secure) {
  assert.ok(every(redirectUris, hasHttpsProtocol), 'All \'redirect_uris\' must have the same protocol')
} else if (process.env.NODE_ENV === 'production') {
  logger.warn('The Gardener Dashboard is running in production but you don\'t use Transport Layer Security (TLS) to secure the connection and the data')
}

let clientPromise

/**
 * (Customizing HTTP Requests)[https://github.com/panva/node-openid-client/blob/master/docs/README.md#customizing-http-requests]
 * Issuer constructor : override http request options for issuer discovery
 * Issuer instance    : override http request options for accessing the jwks endpoint
 * Client instance    : override http request options for token endpoint requests
 */
function overrideHttpOptions () {
  this[custom.http_options] = options => Object.assign({}, options, httpOptions)
}
overrideHttpOptions.call(Issuer)

function discoverIssuer (url) {
  return Issuer.discover(url)
}

function discoverClient (url) {
  return pRetry(async () => {
    const issuer = await discoverIssuer(url)
    overrideHttpOptions.call(issuer)
    const client = new issuer.Client({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uris: redirectUris,
      response_types: responseTypes
    })
    overrideHttpOptions.call(client)
    client[custom.clock_tolerance] = clockTolerance
    return client
  }, {
    forever: true,
    minTimeout: 1000,
    maxTimeout: 60 * 1000,
    randomize: true
  })
}

function getIssuerClient (url = issuer) {
  if (!clientPromise) {
    clientPromise = discoverClient(url)
  }
  return pTimeout(clientPromise, 1000, `OpenID Connect Issuer ${url} not available`)
}

function getBackendRedirectUri (origin) {
  return origin
    ? new URL('/auth/callback', origin).toString()
    : head(redirectUris)
}

function getFrontendRedirectUrl (redirectUrl) {
  return redirectUrl
    ? new URL(redirectUrl)
    : new URL('/', head(redirectUris))
}

async function authorizationUrl (req, res) {
  const { query } = req
  const frontendRedirectUrl = getFrontendRedirectUrl(query.redirectUrl)
  const redirectPath = frontendRedirectUrl.pathname + frontendRedirectUrl.search
  const redirectOrigin = frontendRedirectUrl.origin
  const backendRedirectUri = getBackendRedirectUri(redirectOrigin)
  const state = encodeState({
    redirectPath,
    redirectOrigin
  })
  const client = await exports.getIssuerClient()
  if (!includes(redirectUris, backendRedirectUri)) {
    throw createError(400, 'The \'redirectUrl\' parameter must match a redirect URI in the settings')
  }
  return client.authorizationUrl({
    redirect_uri: backendRedirectUri,
    state,
    scope
  })
}

async function authorizeToken (req, res) {
  const { token, expiresIn } = req.body
  const bearer = trim(token)

  const { username: id, groups } = await authentication.isAuthenticated({ token: bearer })

  const { name, email } = decode(bearer)
  const user = {
    id,
    groups,
    name,
    email
  }
  const audience = [GARDENER_AUDIENCE]
  const [header, payload, signature] = split(await sign(user, { expiresIn, audience }), '.')
  res.cookie(COOKIE_HEADER_PAYLOAD, join([header, payload], '.'), {
    secure,
    expires: undefined,
    sameSite: 'Lax'
  })
  res.cookie(COOKIE_SIGNATURE, signature, {
    secure,
    httpOnly: true,
    expires: undefined,
    sameSite: 'Lax'
  })
  const encryptedBearer = encrypt(bearer)
  res.cookie(COOKIE_TOKEN, encryptedBearer, {
    secure,
    httpOnly: true,
    expires: undefined,
    sameSite: 'Lax'
  })
  return user
}

async function authorizationCallback (req, res) {
  const client = await exports.getIssuerClient()
  const { code, state } = req.query
  const parameters = { code }
  const {
    redirectPath,
    redirectOrigin
  } = decodeState(state)
  const backendRedirectUri = getBackendRedirectUri(redirectOrigin)
  const checks = {
    response_type: 'code'
  }
  const {
    id_token: token,
    expires_in: expiresIn
  } = await client.callback(backendRedirectUri, parameters, checks)
  req.body = { token, expiresIn }
  await authorizeToken(req, res)
  return { redirectPath }
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
  const [header, payload] = split(cookies[COOKIE_HEADER_PAYLOAD], '.')
  const signature = cookies[COOKIE_SIGNATURE]
  if (header && payload && signature) {
    return join([header, payload, signature], '.')
  }
  return null
}

function authenticate (options = {}) {
  assert.ok(typeof options.createClient === 'function', 'No "createClient" function passed to authenticate middleware')
  const verifyToken = async (req, res) => {
    const token = getToken(req)
    if (!token) {
      throw createError(401, 'No authorization token was found', { code: 'ERR_JWT_NOT_FOUND' })
    }
    try {
      const audience = [GARDENER_AUDIENCE]
      req.user = await verify(token, { audience })
    } catch (err) {
      const props = {}
      switch (err.name) {
        case 'TokenExpiredError':
          props.code = 'ERR_JWT_TOKEN_EXPIRED'
          break
        case 'NotBeforeError':
          props.code = 'ERR_JWT_NOT_BEFORE'
          break
      }
      throw createError(401, err.message, props)
    }
  }
  const csrfProtection = (req, res) => {
    /**
     * According to the OWASP Document "Cross-Site Request Forgery Prevention"
     * the ["Use of Custom Request Headers"](https://github.com/OWASP/CheatSheetSeries/blob/master/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.md#use-of-custom-request-headers)
     * is an alternate defense that is particularly well suited for AJAX/XHR endpoints.
     */
    if (!isHttpMethodSafe(req) && !isXmlHttpRequest(req)) {
      throw createError(403, 'Request has been blocked by CSRF protection', { code: 'ERR_CSRF_PREVENTION' })
    }
  }
  const setUserAuth = async (req, res) => {
    const { cookies = {}, user = {} } = req
    if (user.auth && user.client) {
      return
    }
    const encryptedBearer = cookies[COOKIE_TOKEN]
    if (!encryptedBearer) {
      throw createError(401, 'No bearer token found in request', { code: 'ERR_JWE_NOT_FOUND' })
    }
    const bearer = decrypt(encryptedBearer)
    if (!bearer) {
      throw createError(401, 'The decrypted bearer token must not be empty', { code: 'ERR_JWE_DECRYPTION_FAILED' })
    }
    const auth = user.auth = { bearer }

    Object.defineProperty(user, 'client', {
      value: options.createClient({ auth }),
      configurable: true
    })
  }
  return async (req, res, next) => {
    try {
      csrfProtection(req, res)
      await verifyToken(req, res)
      await setUserAuth(req, res)
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

exports = module.exports = {
  discoverIssuer,
  getIssuerClient,
  COOKIE_HEADER_PAYLOAD,
  COOKIE_SIGNATURE,
  COOKIE_TOKEN,
  encodeState,
  decodeState,
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
