//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const fs = require('fs')
const Watcher = require('./Watcher')

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

  return Object.seal(cluster)
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
  }

  return Object.seal(user)
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

function base64Decode (value) {
  return Buffer.from(value, 'base64').toString('utf8')
}

class ClientConfig {
  constructor (config, { reactive = false, ...options } = {}) {
    const files = new Map()
    const user = getUser(config, files)
    const cluster = getCluster(config, files)
    const auth = createAuth(user)
    const properties = {
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
          if (user.token || (user.username && user.password)) {
            return auth
          }
        }
      }
    }
    if (reactive && files.size) {
      const watcher = new Watcher(Array.from(files.keys()), options)
      watcher.run((path, value) => {
        const key = files.get(path)
        const obj = key === 'certificateAuthority' ? cluster : user
        obj[key] = value
        watcher.emit(`update:${key}`)
      })
      properties.watcher = { value: watcher }
    }
    Object.defineProperties(this, properties)
    Object.freeze(this)
  }

  extend ({ key, cert, auth, ...options } = {}) {
    let properties
    if (auth) {
      properties = {
        auth: {
          enumerable: true,
          value: Object.freeze(Object.assign({}, auth))
        },
        key: {
          value: undefined
        },
        cert: {
          value: undefined
        }
      }
    } else if (key && cert) {
      properties = {
        auth: {
          value: undefined
        },
        key: {
          enumerable: true,
          value: key
        },
        cert: {
          enumerable: true,
          value: cert
        }
      }
    }
    return Object.assign(Object.create(this, properties), options)
  }
}

module.exports = ClientConfig
