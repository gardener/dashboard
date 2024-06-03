//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const assert = require('assert').strict
const crypto = require('crypto')
const { split, join, includes, head, chain, pick } = require('lodash')
const { Issuer, custom, generators, TokenSet } = require('openid-client')
const pRetry = require('p-retry')
const pTimeout = require('p-timeout')
const { authentication, authorization } = require('../services')
const createError = require('http-errors')
const logger = require('../logger')
const { sessionSecrets, oidc = {} } = require('../config')

const {
  encodeState,
  decodeState,
  sign,
  verify,
  decode,
  encrypt,
  decrypt
} = require('./jose')(sessionSecrets)

const now = () => Math.floor(Date.now() / 1000)
const digest = (data, n = 7) => {
  return crypto
    .createHash('sha256')
    .update(data)
    .digest('hex')
    .substring(0, n)
}
const { isHttpError } = createError

const {
  COOKIE_HEADER_PAYLOAD,
  COOKIE_TOKEN,
  COOKIE_SIGNATURE,
  COOKIE_CODE_VERIFIER,
  COOKIE_STATE,
  GARDENER_AUDIENCE
} = require('./constants')

const {
  issuer,
  redirect_uris: redirectUris = [],
  scope,
  client_id: clientId,
  client_secret: clientSecret,
  usePKCE = !clientSecret,
  sessionLifetime = 86400,
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
    let issuer
    try {
      issuer = await discoverIssuer(url)
    } catch (err) {
      logger.error('failed to discover OpenID Connect issuer %s', url, err)
      throw err
    }
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
  return pTimeout(clientPromise, 1000, `OpenID Connect issuer ${url} not available`)
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
  const state = generators.state()
  res.cookie(COOKIE_STATE, {
    redirectPath,
    redirectOrigin,
    state
  }, {
    secure: true,
    httpOnly: true,
    maxAge: 180_000, // cookie will be removed after 3 minutes
    sameSite: 'Lax'
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
  if (usePKCE) {
    const codeChallengeMethod = getCodeChallengeMethod(client)
    const codeVerifier = generators.codeVerifier()
    res.cookie(COOKIE_CODE_VERIFIER, codeVerifier, {
      secure: true,
      httpOnly: true,
      maxAge: 180_000, // cookie will be removed after 3 minutes
      sameSite: 'Lax'
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

async function authorizeToken (req, res) {
  const idToken = chain(req.body)
    .get('token')
    .trim()
    .value()
  const payload = {}
  const tokenSet = new TokenSet({ id_token: idToken })
  tokenSet.access_token = await createAccessToken(payload, idToken)
  await setCookies(res, tokenSet)
  return decode(tokenSet.access_token)
}

async function createAccessToken (payload, idToken) {
  const user = { auth: { bearer: idToken } }
  const results = await Promise.allSettled([
    authentication.isAuthenticated({ token: idToken }),
    authorization.isAdmin(user)
  ])
  // throw an error if any promise has been rejected
  for (const { status, reason: err } of results) {
    if (status === 'rejected') {
      throw err
    }
  }
  const [
    { value: { username, groups } },
    { value: isAdmin }
  ] = results
  Object.assign(payload, {
    id: username,
    groups,
    aud: [GARDENER_AUDIENCE],
    isAdmin
  })
  const idTokenPayload = decode(idToken)
  if (idTokenPayload) {
    const { email, name, exp } = idTokenPayload
    if (email) {
      payload.email = email
    }
    if (name) {
      payload.name = name
    }
    if (exp) {
      payload.exp ??= Number(exp)
    }
  }
  const maxExpiresAt = now() + sessionLifetime
  payload.exp = Math.min(payload.exp ?? maxExpiresAt, maxExpiresAt)
  return sign(payload)
}

async function setCookies (res, tokenSet) {
  const accessToken = tokenSet.access_token
  const [header, payload, signature] = split(accessToken, '.')
  res.cookie(COOKIE_HEADER_PAYLOAD, join([header, payload], '.'), {
    secure: true,
    expires: undefined,
    sameSite: 'Lax'
  })
  res.cookie(COOKIE_SIGNATURE, signature, {
    secure: true,
    httpOnly: true,
    expires: undefined,
    sameSite: 'Lax'
  })
  const values = [tokenSet.id_token]
  if (tokenSet.refresh_token) {
    values.push(tokenSet.refresh_token)
  }
  const encryptedValues = await encrypt(values.join(','))
  res.cookie(COOKIE_TOKEN, encryptedValues, {
    secure: true,
    httpOnly: true,
    expires: undefined,
    sameSite: 'Lax'
  })
  return accessToken
}

async function authorizationCallback (req, res) {
  const options = {
    secure: true,
    path: '/'
  }
  const stateObject = {}
  if (COOKIE_STATE in req.cookies) {
    Object.assign(stateObject, req.cookies[COOKIE_STATE])
    res.clearCookie(COOKIE_STATE, options)
  }
  const {
    redirectPath,
    redirectOrigin,
    state
  } = stateObject
  const parameters = pick(req.query, ['code', 'state'])
  const backendRedirectUri = getBackendRedirectUri(redirectOrigin)
  const checks = {
    response_type: 'code',
    state
  }
  if (COOKIE_CODE_VERIFIER in req.cookies) {
    checks.code_verifier = req.cookies[COOKIE_CODE_VERIFIER]
    res.clearCookie(COOKIE_CODE_VERIFIER, options)
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

function getAccessToken (cookies) {
  const [header, payload] = split(cookies[COOKIE_HEADER_PAYLOAD], '.')
  const signature = cookies[COOKIE_SIGNATURE]
  if (header && payload && signature) {
    return join([header, payload, signature], '.')
  }
  throw createError(401, 'No authorization token was found', { code: 'ERR_JWT_NOT_FOUND' })
}

function getRefreshAt (tokenSet) {
  const user = decode(tokenSet.id_token)
  return user?.exp ?? tokenSet.expires_at
}

async function verifyAccessToken (token) {
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

async function getTokenSet (cookies) {
  const accessToken = getAccessToken(cookies)
  const encryptedValues = cookies[COOKIE_TOKEN]
  if (!encryptedValues) {
    throw createError(401, 'No bearer token found in request', { code: 'ERR_JWE_NOT_FOUND' })
  }
  let values = ''
  try {
    values = await decrypt(encryptedValues)
  } catch (err) {
    const {
      message,
      code = 'ERR_JWE_DECRYPTION_FAILED'
    } = err
    throw createError(401, message, { code })
  }
  if (!values) {
    throw createError(401, 'The decrypted bearer token must not be empty', { code: 'ERR_JWE_DECRYPTION_FAILED' })
  }
  const [idToken, refreshToken] = values.split(',')
  const tokenSet = new TokenSet({
    id_token: idToken,
    refresh_token: refreshToken,
    access_token: accessToken
  })
  return tokenSet
}

async function authorizationCodeExchange (redirectUri, parameters, checks) {
  try {
    const client = await exports.getIssuerClient()
    const iat = now()
    const payload = { iat }
    const tokenSet = await client.callback(redirectUri, parameters, checks)
    if (tokenSet.refresh_token) {
      /**
       * If the tokenSet contains a refresh_token the session will be valid forever
       * and the id_token has a very short lifetime. In this case the expiration time
       * of the access_token will be the configured sessionLifetime.
       */
      payload.exp = iat + sessionLifetime
      payload.refresh_at = getRefreshAt(tokenSet)
      payload.rti = digest(tokenSet.refresh_token)
      logger.debug('Created TokenSet (%s)', payload.rti)
    }
    tokenSet.access_token = await createAccessToken(payload, tokenSet.id_token)
    return tokenSet
  } catch (err) {
    throw handleClientError(err)
  }
}

function handleClientError (err) {
  if (['RPError', 'OPError'].includes(err.name)) {
    logger.error('%s: %s', err.name, err.message)
    err = createError(401, err)
  }
  return err
}

async function refreshTokenSet (tokenSet) {
  const payload = pick(decode(tokenSet.access_token), ['exp', 'rti'])
  try {
    const client = await exports.getIssuerClient()
    logger.debug('Refreshing TokenSet (%s)', payload.rti)
    tokenSet = await client.refresh(tokenSet.refresh_token)
    const rti = payload.rti
    payload.rti = digest(tokenSet.refresh_token)
    logger.debug('Refreshed TokenSet (%s <- %s)', payload.rti, rti)
    payload.refresh_at = getRefreshAt(tokenSet)
    tokenSet.access_token = await createAccessToken(payload, tokenSet.id_token)
    return tokenSet
  } catch (err) {
    logger.error('Failed to refresh TokenSet (%s)', payload.rti)
    throw handleClientError(err)
  }
}

async function refreshToken (req, res) {
  csrfProtection(req, res)
  let tokenSet = await getTokenSet(req.cookies)
  let user = await verifyAccessToken(tokenSet.access_token)
  if (tokenSet.refresh_token) {
    try {
      tokenSet = await refreshTokenSet(tokenSet)
      await setCookies(res, tokenSet)
    } catch (err) {
      if (isHttpError(err) && err.statusCode === 401) {
        clearCookies(res)
      }
      throw err
    }
    user = decode(tokenSet.access_token)
  }
  return user
}

function authenticate (options = {}) {
  assert.ok(typeof options.createClient === 'function', 'No "createClient" function passed to authenticate middleware')
  return async (req, res, next) => {
    try {
      csrfProtection(req, res)
      const tokenSet = await getTokenSet(req.cookies)
      const user = await verifyAccessToken(tokenSet.access_token)
      const auth = Object.freeze({
        bearer: tokenSet.id_token
      })
      Object.defineProperty(user, 'auth', {
        value: auth,
        enumerable: true
      })
      Object.defineProperty(user, 'client', {
        value: options.createClient({ auth })
      })
      req.user = user
      next()
    } catch (err) {
      clearCookies(res)
      next(err)
    }
  }
}

function clearCookies (res) {
  const options = {
    secure: true,
    path: '/'
  }
  res.clearCookie(COOKIE_HEADER_PAYLOAD, options)
  res.clearCookie(COOKIE_SIGNATURE, options)
  res.clearCookie(COOKIE_TOKEN, options)
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
  setCookies,
  clearCookies,
  authorizationUrl,
  authorizationCallback,
  refreshToken,
  authorizeToken,
  authenticate
}
