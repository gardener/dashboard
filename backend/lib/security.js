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
const crypto = require('crypto')
const base64url = require('base64url')
const pRetry = require('p-retry')
const pTimeout = require('p-timeout')
const { authentication, authorization } = require('./services')
const { Forbidden, Unauthorized } = require('./errors')
const { secret, oidc = {} } = require('./config')

const jwtSign = promisify(jwt.sign)
const jwtVerify = promisify(jwt.verify)
const randomBytes = promisify(crypto.randomBytes)
const pbkdf2 = promisify(crypto.pbkdf2)

const {
  issuer,
  redirect_uri: redirectUri,
  scope,
  client_id: clientId,
  client_secret: clientSecret
} = oidc
const responseType = 'code'
const secure = process.env.NODE_ENV === 'development' ? /^https:/.test(redirectUri) : true

const cookieState = 'gState'
const cookieHeaderPayload = 'gHdrPyl'
const cookieSignatureToken = 'gSgnTkn'

const cookieMaxAge = 30 * 60 * 1000
const audience = [ 'gardener' ]

let clientPromise

function discoverClient () {
  return pRetry(async () => {
    const { Client } = await Issuer.discover(issuer)
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

async function authorizationUrl (req, res) {
  const [
    client,
    bytes
  ] = await Promise.all([
    getIssuerClient(),
    randomBytes(16)
  ])
  const state = bytes.toString('hex')
  res.cookie(cookieState, state, {
    secure,
    httpOnly: true,
    expires: undefined,
    overwrite: true
  })
  return client.authorizationUrl({
    redirect_uri: redirectUri,
    scope,
    state
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
  const [ header, payload, signature ] = split(await sign(user, { expiresIn, audience }), '.')
  const encryptedBearer = await encrypt(bearer)
  res.cookie(cookieHeaderPayload, join([header, payload], '.'), {
    secure,
    maxAge: cookieMaxAge,
    sameSite: true
  })
  res.cookie(cookieSignatureToken, join([signature, encryptedBearer], '.'), {
    secure,
    httpOnly: true,
    expires: undefined,
    sameSite: true
  })
  return user
}

async function authorizationCallback (req, res) {
  const client = await getIssuerClient()
  const state = req.cookies[cookieState]
  res.clearCookie(cookieState)
  const {
    id_token: token,
    expires_in: expiresIn
  } = await client.authorizationCallback(redirectUri, req.query, {
    response_type: responseType,
    state
  })
  req.body = { token, expiresIn }
  await authorizeToken(req, res)
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
  const [ header, payload ] = split(cookies[cookieHeaderPayload], '.')
  const [ signature ] = split(cookies[cookieSignatureToken], '.')
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
      req.user = await verify(token, { audience })
    } catch (err) {
      throw new Unauthorized(err.message)
    }
  }
  const csrfProtection = (req, res) => {
    if (!isHttpMethodSafe(req) && !isXmlHttpRequest(req)) {
      throw new Forbidden('Request has been blocked by CSRF protection')
    }
  }
  const setUserAuth = async (req, res) => {
    const { cookies = {}, user = {} } = req
    const [ , encryptedBearer ] = split(cookies[cookieSignatureToken], '.')
    if (encryptedBearer) {
      const bearer = await decrypt(encryptedBearer)
      user.auth = { bearer }
    }
  }
  const renewCookie = (req, res) => {
    const value = req.cookies[cookieHeaderPayload]
    res.cookie(cookieHeaderPayload, value, {
      secure,
      maxAge: cookieMaxAge,
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
  if (typeof res.clearCookie === 'function') {
    res.clearCookie(cookieHeaderPayload)
    res.clearCookie(cookieSignatureToken)
  }
}

const numberOfIterations = 2145
const ivLength = 16
const saltLength = 64
const keyLength = 32
const tagLength = 16
const digest = 'sha512'
const algorithm = 'aes-256-gcm'

async function encrypt (text) {
  const [
    iv,
    salt
  ] = await Promise.all([
    randomBytes(ivLength),
    randomBytes(saltLength)
  ])
  const key = await pbkdf2(secret, salt, numberOfIterations, keyLength, digest)
  // encrypt text
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  const encryptedText = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final()
  ])
  const tag = cipher.getAuthTag()
  const buffer = Buffer.concat([
    salt,
    iv,
    tag,
    encryptedText
  ])
  return base64url.encode(buffer)
}

async function decrypt (data) {
  const buffer = base64url.toBuffer(data)
  let start
  let end = 0
  // salt
  start = end
  end += saltLength
  const salt = buffer.slice(start, end)
  // iv
  start = end
  end += ivLength
  const iv = buffer.slice(start, end)
  // tag
  start = end
  end += tagLength
  const tag = buffer.slice(start, end)
  // encrypted text
  start = end
  const encryptedText = buffer.slice(start)
  // key
  const key = await pbkdf2(secret, salt, numberOfIterations, keyLength, digest)
  // decrypt text
  const decipher = crypto.createDecipheriv(algorithm, key, iv)
  decipher.setAuthTag(tag)
  const text = decipher.update(encryptedText, 'binary', 'utf8') + decipher.final('utf8')
  return text
}

function sign (payload, secretOrPrivateKey, options) {
  if (isPlainObject(secretOrPrivateKey)) {
    options = secretOrPrivateKey
    secretOrPrivateKey = undefined
  }
  if (!secretOrPrivateKey) {
    secretOrPrivateKey = secret
  }
  const { expiresIn = '1d', ...rest } = options || {}
  return jwtSign(payload, secretOrPrivateKey, { expiresIn, ...rest })
}

function verify (token, options) {
  return jwtVerify(token, secret, options)
}

function decode (token) {
  return jwt.decode(token) || {}
}

module.exports = {
  cookieHeaderPayload,
  cookieSignatureToken,
  sign,
  encrypt,
  decrypt,
  clearCookies,
  authorizationUrl,
  authorizationCallback,
  authorizeToken,
  authenticate,
  authenticateSocket
}
