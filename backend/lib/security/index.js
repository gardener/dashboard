//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { promisify } = require('util')
const assert = require('assert').strict
const { split, join, noop, some, every, includes, head, chain } = require('lodash')
const { Issuer, custom, generators, TokenSet, errors: { OPError, RPError } } = require('openid-client')
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
  COOKIE_CODE_VERIFIER,
  GARDENER_AUDIENCE
} = require('./constants')

const {
  issuer,
  redirect_uris: redirectUris = [],
  scope,
  client_id: clientId,
  client_secret: clientSecret,
  usePKCI = !clientSecret,
  refreshTokenLifetime = 86400,
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
    const options = {
      client_id: clientId,
      redirect_uris: redirectUris,
      response_types: responseTypes
    }
    if (clientSecret) {
      options.client_secret = clientSecret
    } else {
      options.token_endpoint_auth_method = 'none'
    }
    const client = new issuer.Client(options)
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

function getCodeChallengeMethod (client) {
  const supportedMethods = client.issuer.code_challenge_methods_supported
  if (Array.isArray(supportedMethods)) {
    if (supportedMethods.includes('S256')) {
      return 'S256'
    }
    if (supportedMethods.includes('plain')) {
      return 'plain'
    }
    throw createError(500, 'neither code_challenge_method supported by the client is supported by the issuer')
  }
  return 'S256'
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
  const params = {
    redirect_uri: backendRedirectUri,
    state,
    scope
  }
  if (usePKCI) {
    const codeChallengeMethod = getCodeChallengeMethod(client)
    const codeVerifier = generators.codeVerifier()
    res.cookie(COOKIE_CODE_VERIFIER, codeVerifier, {
      secure,
      httpOnly: true,
      maxAge: 300000, // cookie will be removed after 5 minutes
      sameSite: 'Lax',
      path: '/auth/callback'
    })
    switch (codeChallengeMethod) {
      case 'S256':
        params.code_challenge = generators.codeChallenge(codeVerifier)
        params.code_challenge_method = 'S256'
        break
      case 'plain':
        params.code_challenge = codeVerifier
        break
    }
  }
  return client.authorizationUrl(params)
}

function now () {
  return Math.floor(Date.now() / 1000)
}

async function authorizeToken (req, res) {
  const idToken = chain(req.body)
    .get('token')
    .trim()
    .value()
  const tokenSet = createTokenSet({ id_token: idToken })
  const token = await setCookies(res, tokenSet)
  return decode(token)
}

function createTokenSet (values) {
  const tokenSet = new TokenSet(values)
  if (!tokenSet.expires_at) {
    const tokenLifetime = 86400 // default token lifetime is 24 hours
    let expiresAt = now() + tokenLifetime
    try {
      const { iat, exp } = tokenSet.claims()
      if (exp) {
        expiresAt = Number(exp)
      } else if (iat) {
        expiresAt = Number(iat) + tokenLifetime
      }
    } finally {
      tokenSet.expires_at = expiresAt
    }
  }
  return tokenSet
}

async function createToken (tokenSet) {
  const { username: id, groups } = await authentication.isAuthenticated({ token: tokenSet.id_token })
  const payload = {
    id,
    groups
  }
  try {
    const claims = tokenSet.claims()
    payload.email = claims.email
    if (claims.name) {
      payload.name = claims.name
    }
  } catch (err) { /* ignore error */ }
  const options = {
    audience: [GARDENER_AUDIENCE]
  }
  if (tokenSet.refresh_token) {
    options.expiresIn = Math.max(tokenSet.expires_in, refreshTokenLifetime)
  } else {
    payload.exp = tokenSet.expires_at
  }
  return sign(payload, options)
}

async function setCookies (res, tokenSet) {
  const token = await createToken(tokenSet)
  const [header, payload, signature] = split(token, '.')
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
  const values = [tokenSet.id_token, tokenSet.expires_at]
  if (tokenSet.refresh_token) {
    values.push(tokenSet.refresh_token)
  }
  const encryptedValues = await encrypt(values.join(','))
  res.cookie(COOKIE_TOKEN, encryptedValues, {
    secure,
    httpOnly: true,
    expires: undefined,
    sameSite: 'Lax'
  })
  return token
}

async function authorizationCallback (req, res) {
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
  if (COOKIE_CODE_VERIFIER in req.cookies) {
    checks.code_verifier = req.cookies[COOKIE_CODE_VERIFIER]
    res.clearCookie(COOKIE_CODE_VERIFIER)
  }
  const tokenSet = await authorizationCodeExchange(backendRedirectUri, parameters, checks)
  await setCookies(res, tokenSet)
  return { redirectPath }
}

function isHttpMethodSafe ({ method }) {
  return ['GET', 'HEAD', 'OPTIONS'].indexOf(method) !== -1
}

function isXmlHttpRequest ({ headers = {} }) {
  return headers['x-requested-with'] === 'XMLHttpRequest'
}

function getToken (cookies) {
  const [header, payload] = split(cookies[COOKIE_HEADER_PAYLOAD], '.')
  const signature = cookies[COOKIE_SIGNATURE]
  if (header && payload && signature) {
    return join([header, payload, signature], '.')
  }
  throw createError(401, 'No authorization token was found', { code: 'ERR_JWT_NOT_FOUND' })
}

async function verifyToken (token) {
  try {
    const audience = [GARDENER_AUDIENCE]
    return await verify(token, { audience })
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

function csrfProtection (req) {
  /**
   * According to the OWASP Document "Cross-Site Request Forgery Prevention"
   * the ["Use of Custom Request Headers"](https://github.com/OWASP/CheatSheetSeries/blob/master/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.md#use-of-custom-request-headers)
   * is an alternate defense that is particularly well suited for AJAX/XHR endpoints.
   */
  if (!isHttpMethodSafe(req) && !isXmlHttpRequest(req)) {
    throw createError(403, 'Request has been blocked by CSRF protection', { code: 'ERR_CSRF_PREVENTION' })
  }
}

async function decryptTokenSet (cookies) {
  const encryptedValues = cookies[COOKIE_TOKEN]
  if (!encryptedValues) {
    throw createError(401, 'No bearer token found in request', { code: 'ERR_JWE_NOT_FOUND' })
  }
  const values = await decrypt(encryptedValues)
  if (!values) {
    throw createError(401, 'The decrypted bearer token must not be empty', { code: 'ERR_JWE_DECRYPTION_FAILED' })
  }
  const [idToken, expiresAt, refreshToken] = values.split(',')
  return createTokenSet({
    id_token: idToken,
    refresh_token: refreshToken,
    expires_at: expiresAt ? Number(expiresAt) : undefined
  })
}

async function authorizationCodeExchange (redirectUri, parameters, checks) {
  try {
    const client = await exports.getIssuerClient()
    return await client.callback(redirectUri, parameters, checks)
  } catch (err) {
    if (err instanceof RPError || err instanceof OPError) {
      throw createError(401, err)
    }
    throw err
  }
}

async function refreshTokenSet (tokenSet) {
  try {
    const client = await exports.getIssuerClient()
    return await client.refresh(tokenSet.refresh_token)
  } catch (err) {
    if (err instanceof RPError || err instanceof OPError) {
      throw createError(401, err)
    }
    throw err
  }
}

function authenticate (options = {}) {
  assert.ok(options.createClient === false || typeof options.createClient === 'function', 'No "createClient" function passed to authenticate middleware')
  return async (req, res, next) => {
    try {
      csrfProtection(req, res)
      let user
      let token = getToken(req.cookies)
      let tokenSet = await decryptTokenSet(req.cookies)
      if (tokenSet.refresh_token && tokenSet.expires_in < clockTolerance) {
        tokenSet = await refreshTokenSet(tokenSet)
        token = await setCookies(res, tokenSet)
        user = decode(token)
      } else {
        user = await verifyToken(token)
      }
      const auth = Object.freeze({
        bearer: tokenSet.id_token
      })
      Object.defineProperty(user, 'auth', {
        value: auth,
        enumerable: true
      })
      if (typeof options.createClient === 'function') {
        Object.defineProperty(user, 'client', {
          value: options.createClient({ auth })
        })
      }
      req.user = user
      next()
    } catch (err) {
      clearCookies(res)
      next(err)
    }
  }
}

function authenticateSocket () {
  const authenticateAsync = promisify(authenticate({ createClient: false }))
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
