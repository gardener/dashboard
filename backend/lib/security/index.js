//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  fetch,
  Agent,
} from 'undici'
import assert from 'assert/strict'
import crypto from 'crypto'
import {
  split,
  join,
  includes,
  head,
  chain,
  pick,
} from 'lodash-es'
import pRetry from 'p-retry'
import pTimeout from 'p-timeout'
import services from '../services/index.js'
import createError from 'http-errors'
import logger from '../logger/index.js'
import config from '../config/index.js'
import createJose from './jose.js'
import {
  GARDENER_AUDIENCE,
  COOKIE_HEADER_PAYLOAD,
  COOKIE_SIGNATURE,
  COOKIE_TOKEN,
  COOKIE_CODE_VERIFIER,
  COOKIE_STATE,
} from './constants.js'

const { authentication, authorization } = services
const { sessionSecrets, oidc = {} } = config
const {
  sign,
  verify,
  decode,
  encrypt,
  decrypt,
} = createJose(sessionSecrets)

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
  issuer,
  redirect_uris: redirectUris = [],
  scope,
  client_id: clientId,
  client_secret: clientSecret,
  usePKCE = !clientSecret,
  sessionLifetime = 86400,
  allowInsecure = false,
  ca,
  rejectUnauthorized = true,
  clockTolerance = 15,
} = oidc
const connectOptions = {
  rejectUnauthorized,
}
if (ca) {
  connectOptions.ca = ca
}
if (allowInsecure) {
  logger.warn(
    'WARNING: Insecure requests are allowed because "oidc.allowInsecure" is enabled. ' +
    'This bypasses HTTPS-only restrictions and disables TLS certificate verification. ' +
    'Use this setting only for local development or testing in non-secure environments.',
  )
}

if (!rejectUnauthorized) {
  logger.warn(
    'WARNING: TLS certificate validation is disabled because "oidc.rejectUnauthorized" is set to false. ' +
    'This bypasses certificate verification and compromises connection security. ' +
    'Use this setting only for local development or testing in non-secure environments.',
  )
}

export let openidClientPromise

async function getOpenIdClientModule () {
  if (!openidClientPromise) {
    openidClientPromise = import('openid-client')
  }
  return openidClientPromise
}

export let discoveryPromise

async function getConfiguration () {
  if (!discoveryPromise) {
    discoveryPromise = pRetry(async () => {
      const {
        discovery,
        customFetch,
        allowInsecureRequests,
      } = await getOpenIdClientModule()

      const issuerUrl = new URL(issuer)
      const clientMetadata = {
        clockTolerance,
      }
      if (clientSecret) {
        clientMetadata.client_secret = clientSecret
      }
      // ClientOptions: https://undici.nodejs.org/#/docs/api/Client?id=parameter-clientoptions
      const clientOptions = { connect: connectOptions }
      const dispatcher = new Agent(clientOptions)
      const options = {
        [customFetch]: (url, options) => {
          return fetch(url, { ...options, dispatcher })
        },
      }
      if (allowInsecure) {
        options.execute = [allowInsecureRequests]
      }
      const clientAuthentication = undefined
      return await discovery(
        issuerUrl,
        clientId,
        clientMetadata,
        clientAuthentication,
        options,
      )
    }, {
      forever: true,
      minTimeout: 1000,
      maxTimeout: 60 * 1000,
      randomize: true,
    })
  }
  return pTimeout(discoveryPromise, 1000, 'Issuer not available')
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

function getCodeChallengeMethod (config) {
  const supportedMethods = config.code_challenge_methods_supported
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
  if (!includes(redirectUris, backendRedirectUri)) {
    throw createError(400, 'The \'redirectUrl\' parameter must match a redirect URI in the settings')
  }
  const {
    buildAuthorizationUrl,
    randomPKCECodeVerifier,
    calculatePKCECodeChallenge,
    randomState,
  } = await getOpenIdClientModule()
  const state = randomState()
  res.cookie(COOKIE_STATE, {
    redirectPath,
    redirectOrigin,
    state,
  }, {
    secure: true,
    httpOnly: true,
    maxAge: 180_000, // cookie will be removed after 3 minutes
    sameSite: 'Lax',
  })

  const params = {
    redirect_uri: backendRedirectUri,
    state,
    scope,
  }
  const config = await getConfiguration()

  if (usePKCE) {
    const codeChallengeMethod = getCodeChallengeMethod(config)
    const codeVerifier = randomPKCECodeVerifier()
    res.cookie(COOKIE_CODE_VERIFIER, codeVerifier, {
      secure: true,
      httpOnly: true,
      maxAge: 180_000, // cookie will be removed after 3 minutes
      sameSite: 'Lax',
    })
    switch (codeChallengeMethod) {
      case 'S256':
        params.code_challenge = await calculatePKCECodeChallenge(codeVerifier)
        params.code_challenge_method = 'S256'
        break
      case 'plain':
        params.code_challenge = codeVerifier
        break
    }
  }
  return buildAuthorizationUrl(config, params)
}

async function authorizeToken (req, res) {
  const idToken = chain(req.body)
    .get(['token'])
    .trim()
    .value()
  const payload = {}
  const tokenSet = { id_token: idToken }
  tokenSet.access_token = await createAccessToken(payload, idToken)
  await setCookies(res, tokenSet)
  return decode(tokenSet.access_token)
}

async function createAccessToken (payload, idToken) {
  const user = { auth: { bearer: idToken } }
  const results = await Promise.allSettled([
    authentication.isAuthenticated({ token: idToken }),
    authorization.isAdmin(user),
  ])
  // throw an error if any promise has been rejected
  for (const { status, reason: err } of results) {
    if (status === 'rejected') {
      throw err
    }
  }
  const [
    { value: { username, groups } },
    { value: isAdmin },
  ] = results
  Object.assign(payload, {
    id: username,
    groups,
    aud: [GARDENER_AUDIENCE],
    isAdmin,
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
    sameSite: 'Lax',
  })
  res.cookie(COOKIE_SIGNATURE, signature, {
    secure: true,
    httpOnly: true,
    expires: undefined,
    sameSite: 'Lax',
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
    sameSite: 'Lax',
  })
  return accessToken
}

async function authorizationCallback (req, res) {
  const options = {
    secure: true,
    path: '/',
  }
  let stateObject = {}
  if (COOKIE_STATE in req.cookies) {
    stateObject = req.cookies[COOKIE_STATE] // eslint-disable-line security/detect-object-injection -- COOKIE_STATE is a constant
    res.clearCookie(COOKIE_STATE, options)
  }
  const {
    redirectPath = '/',
    redirectOrigin,
    state,
  } = stateObject

  const checks = {
    idTokenExpected: true,
    expectedState: state,
  }
  if (COOKIE_CODE_VERIFIER in req.cookies) {
    checks.pkceCodeVerifier = req.cookies[COOKIE_CODE_VERIFIER] // eslint-disable-line security/detect-object-injection -- COOKIE_CODE_VERIFIER is a constant
    res.clearCookie(COOKIE_CODE_VERIFIER, options)
  }

  const baseUri = head(redirectUris)
  const resolvedOrigin = new URL(redirectPath, baseUri).origin
  const trustedOrigin = new URL(baseUri).origin
  if (resolvedOrigin !== trustedOrigin) {
    logger.error(`Invalid redirect path: ${redirectPath}, origin: ${resolvedOrigin}, expected origin: ${trustedOrigin}`)
    throw createError(400, 'Invalid redirect path')
  }

  const backendRedirectUri = getBackendRedirectUri(redirectOrigin)
  if (!includes(redirectUris, backendRedirectUri)) {
    throw createError(400, 'The \'redirectOrigin\' must match a redirect URI in the settings')
  }

  const originalUrl = req.originalUrl || req.url
  const currentUrl = new URL(originalUrl, backendRedirectUri)
  const tokenSet = await authorizationCodeExchange(currentUrl, checks)
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
  const headerAndPayload = cookies[COOKIE_HEADER_PAYLOAD] // eslint-disable-line security/detect-object-injection -- COOKIE_HEADER_PAYLOAD is a constant
  const [header, payload] = split(headerAndPayload, '.')
  const signature = cookies[COOKIE_SIGNATURE] // eslint-disable-line security/detect-object-injection -- COOKIE_SIGNATURE is a constant
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
  const encryptedValues = cookies[COOKIE_TOKEN] // eslint-disable-line security/detect-object-injection -- COOKIE_TOKEN is a constant
  if (!encryptedValues) {
    throw createError(401, 'No bearer token found in request', { code: 'ERR_JWE_NOT_FOUND' })
  }
  let values = ''
  try {
    values = await decrypt(encryptedValues)
  } catch (err) {
    const {
      message,
      code = 'ERR_JWE_DECRYPTION_FAILED',
    } = err
    throw createError(401, message, { code })
  }
  if (!values) {
    throw createError(401, 'The decrypted bearer token must not be empty', { code: 'ERR_JWE_DECRYPTION_FAILED' })
  }
  const [idToken, refreshToken] = values.split(',')
  const tokenSet = {
    id_token: idToken,
    refresh_token: refreshToken,
    access_token: accessToken,
  }
  return tokenSet
}

async function authorizationCodeExchange (currentUrl, checks) {
  const config = await getConfiguration()
  const { authorizationCodeGrant } = await getOpenIdClientModule()
  const iat = now()
  const payload = { iat }
  const tokenSet = await authorizationCodeGrant(
    config,
    currentUrl,
    checks,
  )
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
}

function handleClientError (err) {
  if (err.name === 'ResponseBodyError') {
    const message = err.error_description || err.error || err.message
    logger.error('%s - %s: %s', err.status, err.name, message)
    const props = {
      cause: err.cause,
      code: err.code,
      error: err.error,
      error_description: err.error_description,
      originalMessage: err.message,
      // We enforce a 401 status code and ignore the error’s status, but keep it for debugging purposes.
      originialStatus: err.status,
    }
    err = createError(401, message, props)
  }
  return err
}

async function refreshTokenSet (tokenSet) {
  const payload = pick(decode(tokenSet.access_token), ['exp', 'rti'])
  try {
    const config = await getConfiguration()
    const { refreshTokenGrant } = await getOpenIdClientModule()
    logger.debug('Refreshing TokenSet (%s)', payload.rti)
    tokenSet = await refreshTokenGrant(
      config,
      tokenSet.refresh_token,
    )
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
        bearer: tokenSet.id_token,
      })
      Object.defineProperty(user, 'auth', {
        value: auth,
        enumerable: true,
      })
      Object.defineProperty(user, 'client', {
        value: options.createClient({ auth }),
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
    path: '/',
  }
  res.clearCookie(COOKIE_HEADER_PAYLOAD, options)
  res.clearCookie(COOKIE_SIGNATURE, options)
  res.clearCookie(COOKIE_TOKEN, options)
}

export {
  COOKIE_HEADER_PAYLOAD,
  COOKIE_SIGNATURE,
  COOKIE_TOKEN,
  COOKIE_STATE,
  sign,
  decode,
  verify,
  encrypt,
  decrypt,
  setCookies,
  clearCookies,
  getConfiguration,
  authorizationUrl,
  authorizationCallback,
  refreshToken,
  authorizeToken,
  authenticate,
}
