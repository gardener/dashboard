//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const fs = require('fs')

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
      cluster.ca = base64Decode(caData)
    } else if (caFile) {
      files.set('ca', caFile)
      cluster.ca = fs.readFileSync(caFile, 'utf8')
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
      user.cert = base64Decode(certData)
      user.key = base64Decode(keyData)
    } else if (certFile && keyFile) {
      files.set('cert', certFile)
      user.cert = fs.readFileSync(certFile)
      files.set('key', keyFile)
      user.key = fs.readFileSync(keyFile)
    } else if (token) {
      user.bearer = token
    } else if (tokenFile) {
      files.set('token', tokenFile)
      user.bearer = fs.readFileSync(tokenFile, 'utf8')
    } else if (username && password) {
      user.user = username
      user.pass = password
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
            user.bearer = accessToken
          }
          break
        }
      }
    }

    return user
  }
}

class ClientConfig {
  #files
  #user
  #cluster

  constructor (config) {
    const files = new Map()
    const user = getUser(config, files)
    const cluster = getCluster(config, files)

    this.#files = files
    this.#user = user
    this.#cluster = cluster

    // cluster properties
    Reflect.defineProperty(this, 'url', {
      enumerable: true,
      get () {
        return cluster.server
      }
    })
    Reflect.defineProperty(this, 'ca', {
      enumerable: true,
      get () {
        return cluster.ca
      }
    })
    Reflect.defineProperty(this, 'rejectUnauthorized', {
      enumerable: true,
      get () {
        return !cluster.insecureSkipTlsVerify
      }
    })

    // user properties
    Reflect.defineProperty(this, 'key', {
      enumerable: true,
      get () {
        return user.key
      }
    })
    Reflect.defineProperty(this, 'cert', {
      enumerable: true,
      get () {
        return user.cert
      }
    })
    const auth = {}
    for (const key of ['bearer', 'user', 'pass']) {
      Reflect.defineProperty(auth, key, {
        enumerable: true,
        get () {
          return user[key]
        }
      })
    }
    Reflect.defineProperty(this, 'auth', {
      enumerable: true,
      get () {
        if (user.bearer || (user.user && user.pass)) {
          return auth
        }
      }
    })
  }
}

function base64Decode (value) {
  return Buffer.from(value, 'base64').toString('utf8')
}

module.exports = ClientConfig
