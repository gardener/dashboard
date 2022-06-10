//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const fs = require('fs')
const { globalLogger: logger } = require('@gardener-dashboard/logger')
const Watcher = require('./watcher')

function getCluster ({ currentCluster }, files) {
  const cluster = {}

  if (currentCluster) {
    const {
      server,
      'certificate-authority-data': caData,
      'certificate-authority': caFile,
      'insecure-skip-tls-verify': insecureSkipTlsVerify
    } = currentCluster
    cluster.server = server
    if (caData) {
      cluster.certificateAuthority = base64Decode(caData)
    } else if (caFile) {
      files.set(caFile, 'certificateAuthority')
      cluster.certificateAuthority = fs.readFileSync(caFile, 'utf8')
    }
    if (typeof insecureSkipTlsVerify === 'boolean') {
      cluster.insecureSkipTlsVerify = insecureSkipTlsVerify
    }
  }

  return cluster
}

function getUser ({ currentUser }, files) {
  const user = {}

  if (currentUser) {
    const {
      'client-certificate-data': certData,
      'client-certificate': certFile,
      'client-key-data': keyData,
      'client-key': keyFile,
      token,
      tokenFile,
      username,
      password,
      'auth-provider': authProvider
    } = currentUser
    if (certData && keyData) {
      user.clientCert = base64Decode(certData)
      user.clientKey = base64Decode(keyData)
    } else if (certFile && keyFile) {
      files.set(certFile, 'clientCert')
      user.clientCert = fs.readFileSync(certFile, 'utf8')
      files.set(keyFile, 'clientKey')
      user.clientKey = fs.readFileSync(keyFile, 'utf8')
    } else if (token) {
      user.token = token
    } else if (tokenFile) {
      files.set(tokenFile, 'token')
      user.token = fs.readFileSync(tokenFile, 'utf8')
    } else if (username && password) {
      user.username = username
      user.password = password
    } else if (authProvider) {
      const {
        name,
        config: authProviderConfig = {}
      } = authProvider
      switch (name) {
        case 'gcp': {
          const {
            'access-token': accessToken,
            expiry = '1970-01-01T00:00:00.000Z'
          } = authProviderConfig
          if (new Date() < new Date(expiry)) {
            user.token = accessToken
          }
          break
        }
      }
    }

    return user
  }
}

function createAuth (user) {
  const auth = Object.create(Object.prototype, {
    bearer: {
      enumerable: true,
      get () {
        return user.token
      }
    },
    user: {
      enumerable: true,
      get () {
        return user.username
      }
    },
    pass: {
      enumerable: true,
      get () {
        return user.password
      }
    }
  })

  return Object.freeze(auth)
}

async function watchFiles (watcher, handler) {
  try {
    for await (const args of watcher) {
      handler(...args)
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      logger.info('[kube-config] watch files aborted')
    } else {
      logger.error('[kube-config] watch files ended with error: %s', err.message)
    }
  }
}

function base64Decode (value) {
  return Buffer.from(value, 'base64').toString('utf8')
}

class ClientConfig {
  constructor (config, { reactive = false } = {}) {
    const files = new Map()
    const user = getUser(config, files)
    const cluster = getCluster(config, files)
    const auth = createAuth(user)
    Object.defineProperties(this, {
      url: {
        enumerable: true,
        get () {
          return cluster.server
        }
      },
      ca: {
        enumerable: true,
        get () {
          return cluster.certificateAuthority
        }
      },
      rejectUnauthorized: {
        enumerable: true,
        get () {
          return !cluster.insecureSkipTlsVerify
        }
      },
      key: {
        enumerable: true,
        get () {
          return user.clientKey
        }
      },
      cert: {
        enumerable: true,
        get () {
          return user.clientCert
        }
      },
      auth: {
        enumerable: true,
        get () {
          if (auth.bearer || (auth.user && auth.pass)) {
            return auth
          }
        }
      },
      extend: {
        value: options => {
          return Object.assign(Object.create(this), options)
        }
      }
    })

    if (reactive === true) {
      let watcher
      Object.defineProperty(this, 'watcher', {
        get () {
          if (!watcher) {
            watcher = new Watcher(Array.from(files.keys()))
            watchFiles(watcher, (path, value) => {
              const key = files.get(path)
              const obj = key === 'certificateAuthority' ? cluster : user
              if (obj[key] !== value) {
                obj[key] = value
                watcher.emit('change', path)
              }
            })
          }
          return watcher
        }
      })
    }
  }

  static create (config) {
    return new ClientConfig(config)
  }

  static createReactive (config) {
    return new ClientConfig(config, { reactive: true })
  }
}

module.exports = ClientConfig
